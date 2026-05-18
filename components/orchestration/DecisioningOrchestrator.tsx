'use client';
// components/orchestration/DecisioningOrchestrator.tsx
// Cross-batch integration root — Batch 10.3.
//
// Wires the orchestration layer (Batches 9.1–9.4) into the assembly layer
// (Batches 8 + 10.1 + 10.2). Owns mode state (persona / live / idle), holds
// both orchestration hooks always (React rules of hooks), selects the active
// machine at render, and renders the assembled decisioning region:
// PersonaSelector → state-driven decisioning surface → CustomInputForm.
// ArchitectureStrip stays in app/page.tsx as a sibling section (Batch 10.2).
//
// === SPEC ANCHORS (multi-anchor synthesis per Batch 6+ docstring discipline) ===
//
//   Decision 32 + 33 + 34 — server contracts. Already structurally enforced by
//     the 9.x orchestration layer; this component consumes the enforcement.
//   Decision 27 — persona scope boundary. Persona mode locks PASS clean for
//     all four personas; no Pass 3 / re-audit / cap-reached. usePersonaPlayback
//     enforces this structurally; this component verifies via integration that
//     the panel callbacks are undefined in persona mode (no race surface).
//   Decision 36e + 36h — analyst control panel race semantics. The "live mode
//     only" race wiring (36h Implementation Requirements) is the substantive
//     new contract at 10.3. Encoded structurally below: analystCallbacks is
//     populated only when mode === 'live'; persona mode passes no callbacks
//     (panel's 10.1 callback extension made them optional). Per Finding B from
//     the 10.3 spec walk, the 9.1 machine carries TWO independent race signals
//     (raceSignalActionTaken sub-case a + raceSignalModalOpen sub-case b); the
//     panel's 8.5 contract takes a unary raceTrigger? prop, so the OR happens
//     at the call site — preserving signal independence at the machine layer
//     and satisfying the unary panel surface.
//   Decision 41a — symmetric ticker animation across both modes. shouldAnimate
//     derives from machine state: true for pass_2 / re_audit (audit-bearing
//     in-flight states), false otherwise including terminal + 'failed'.
//   Decision 21 cap-at-1 — correction_failed_surfaced is the cap-reached
//     surface. Per Finding G from the spec walk: stacked vertically with four
//     section labels (Original recommendation / Original audit / Correction
//     attempted / Re-audit findings).
//   PRIMARY_PROMPT.md §5.3 — failure path. Headline persists in failed state.
//     The 9.2 passHeadlineMap returns null for 'failed' (utility-vs-corpus
//     drift per Finding H, flagged for Batch 11 ratification); workaround
//     here: failedHeadlineProps derives from state.error.pass.
//
// === MODE-SWITCHING — Pattern A (single-hook-per-render with mode state) ===
//
// Both hooks always mounted per React rules of hooks. Mode state selects which
// machine drives the render at any moment. Persona machine's internal
// useEffect handles its own reset on personaId change (passes null when
// mode !== 'persona' to fold the persona path's reset into the same
// dependency). Live machine reset is explicit: when mode transitions out of
// 'live', the mode-switch useEffect fires liveMachine.reset() to clear the
// formerly-active machine's terminal state (Finding I — hygiene the directive
// glossed). startLiveRun internally calls reset() so re-submission within the
// same mode is also safe (Batch 9.4 contract).
//
// === COMPOSITION DISCIPLINE ===
//
// This component IS allowed to import orchestration hooks — it is the
// designated wiring layer between orchestration (9.x) and presentation (8.x
// + 10.1 + 10.2). The structural-enforcement guards at PersonaSelector,
// AnalystControlPanel, PageHeader, PageFooter, and app/page.tsx forbid
// orchestration imports at those layers; DecisioningOrchestrator is where the
// wiring is lawful. Integration tests below assert the wiring contracts via
// behavior (no state-machine knowledge in the assertions; tests observe DOM
// state, not internal state-machine state).

import { useEffect, useMemo, useState } from 'react';
import { usePersonaPlayback } from '@/lib/orchestration/personaPlayback';
import { useLiveDecisioning } from '@/lib/orchestration/liveDecisioning';
import {
  passHeadlineProps,
  type PassHeadlineProps,
} from '@/lib/orchestration/passHeadlineMap';
import {
  listPersonas,
  loadPersona,
  type PersonaId,
} from '@/lib/schemas/personaAdapters';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';
import type { DecisioningError } from '@/lib/schemas/apiError';
import { PersonaSelector } from '@/components/decisioning/PersonaSelector';
import { CustomInputForm } from '@/components/decisioning/CustomInputForm';
import { PassHeadline } from '@/components/decisioning/PassHeadline';
import { RecommendationCard } from '@/components/decisioning/RecommendationCard';
import { AuditPanelTicker } from '@/components/decisioning/AuditPanelTicker';
import { Pass3CorrectionBanner } from '@/components/decisioning/Pass3CorrectionBanner';
import { ExaminerNotes } from '@/components/decisioning/ExaminerNotes';
import { AnalystControlPanel } from '@/components/decisioning/AnalystControlPanel';

type Mode = 'idle' | 'persona' | 'live';

// Idle-state prompt per directive disposition + Finding D ratification (10.3
// spec walk). Layout-agnostic phrasing: avoids spatial anchors ("on the
// right") that would break under 10.4's mobile reflow.
const IDLE_PROMPT = 'Select a persona or fill the custom case form to begin.';

// Persona-mode fallback for when listPersonas().find returns nothing
// (defensive; the unhappy path is improbable since PersonaSelector emits a
// valid PersonaId via the 10.1 contract, but if persona mode ever surfaces
// without a valid id, render "this case" rather than empty string).
const PERSONA_NAME_FALLBACK = 'this case';

// Live-mode personaName label per Batch 10.4 Iteration 2 Item 2 rework
// (Iteration 1 Things-to-Flag #41 disposition). Mode-label rather than
// customer-reference duplication; restores the persona-mode role
// distinction between what-kind-of-case (label) and who (customer
// reference). Affects two surfaces: ExaminerNotes header (line 1 = label,
// line 2 = customer reference; no longer duplicative) and AnalystControlPanel
// Override modal title ("Override Custom case's recommendation"). Microcopy
// 'Custom case' is the Iteration 1 close-out recommendation; Batch 11 may
// substitute a refined label ('Custom audit', 'Submitted case', 'Live
// submission') without further code changes — only this constant value.
const LIVE_MODE_LABEL = 'Custom case';

// In-flight indicator for 'pass_3' state per Finding F refinement. Minimal
// text indicator in --text-tertiary; no animation. Batch 11 ratification.
// Ledger D2: minimal institutional-register progress signal; tertiary text color per corpus.
const PASS_3_IN_FLIGHT_LABEL = 'Correcting…';

// Pass-headline derivation for 'failed' state per Finding H. Reads
// state.error.pass and maps to the four PassHeadline variants. Bridges the
// passHeadlineMap utility-vs-corpus drift (§5.3 says headline persists;
// passHeadlineMap returns null) until Batch 11 extends the utility.
function failedHeadlineProps(error: DecisioningError): PassHeadlineProps {
  switch (error.pass) {
    case 1:
      return { pass: 1, variant: 'recommendation' };
    case 2:
      return { pass: 2, variant: 'audit' };
    case 3:
      return { pass: 3, variant: 'correction' };
    case 're-audit':
      return { pass: 2, variant: 'reaudit' };
  }
}

// Cap-reached section wrapper per Finding G. Four instances stacked vertically
// at 'correction_failed_surfaced' state, each labeling its payload.
function CapReachedSection({
  label,
  children,
}: {
  label: string;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-sans text-sm font-semibold text-text-secondary">
        {label}
      </h3>
      {children}
    </div>
  );
}

export function DecisioningOrchestrator() {
  const [mode, setMode] = useState<Mode>('idle');
  const [personaId, setPersonaId] = useState<PersonaId | null>(null);
  const [liveProfile, setLiveProfile] = useState<CustomerProfile | null>(null);

  // Persona machine sees personaId only when mode === 'persona'. The null
  // passthrough when mode !== 'persona' triggers usePersonaPlayback's internal
  // reset useEffect (personaPlayback.ts:171–175), folding the persona-side
  // reset into the same dependency.
  const personaMachine = usePersonaPlayback(
    mode === 'persona' ? personaId : null,
  );
  const liveMachine = useLiveDecisioning();

  // Active machine selection. Both hooks always called per React rules of
  // hooks; only one's state drives the render at a time.
  const machine = mode === 'live' ? liveMachine : personaMachine;
  const {
    state: stateValue,
    pass1Output,
    pass2Output,
    pass3Output,
    reAuditOutput,
    error,
    raceSignalActionTaken,
    raceSignalModalOpen,
  } = machine.state;

  // Mode-switch reset hygiene per Finding I. Persona machine auto-resets via
  // its own personaId useEffect (when mode flips away from persona, the null
  // passthrough above triggers it). Live machine needs explicit reset when
  // leaving 'live' to clear terminal state; startLiveRun handles reset on
  // entry to 'live'. Avoid resetting live machine on entry — startLiveRun
  // will reset() then startPass1() and the duplicate reset would race.
  // Ledger D5: explicit reset on mode change; covered by tests, do not remove.
  useEffect(() => {
    if (mode !== 'live') liveMachine.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  // PersonaSelector change handler. Switches mode based on the selection
  // (null → idle). Persona machine reacts to the resulting personaId change
  // via its own internal useEffect.
  const handlePersonaChange = (id: PersonaId | null) => {
    setPersonaId(id);
    setMode(id === null ? 'idle' : 'persona');
  };

  // CustomInputForm submit handler. Switches mode to live and kicks the live
  // run. startLiveRun internally resets the live machine + advances to pass_1.
  const handleLiveSubmit = (profile: CustomerProfile) => {
    setLiveProfile(profile);
    setMode('live');
    liveMachine.startLiveRun(profile);
  };

  // raceTrigger: two independent race signals OR'd at the panel-prop site per
  // Finding B. Signal independence preserved at the 9.1 machine layer; the
  // panel's 8.5 unary raceTrigger? prop sees the merged value.
  const raceTrigger = raceSignalActionTaken || raceSignalModalOpen;

  // shouldAnimate derivation per Finding F / AuditPanelTicker contract:
  // true for audit-bearing in-flight states (pass_2 / re_audit), false
  // otherwise including terminal + 'failed' (per Decision 41c).
  const shouldAnimate = stateValue === 'pass_2' || stateValue === 're_audit';

  // Headline derivation. For 'failed', use failedHeadlineProps (Finding H
  // workaround). Otherwise use the 9.2 passHeadlineMap utility.
  const headlineProps: PassHeadlineProps | null =
    stateValue === 'failed' && error
      ? failedHeadlineProps(error)
      : passHeadlineProps(stateValue);

  // Persona name derivation via listPersonas() (Batch 10.1's first consumer;
  // reused here for the AnalystControlPanel modal title).
  const personas = listPersonas();
  const personaName =
    personas.find((p) => p.id === personaId)?.name ?? PERSONA_NAME_FALLBACK;
  // Live-mode label is a fixed mode-disclosure string, NOT derived from
  // liveProfile.customer_reference. Iteration 1 surfaced a 100%-of-live-renders
  // duplication ("X · X") when both header lines and the modal title shared
  // the customer_reference value; the mode-label rework restores role
  // distinction (label vs identifier).
  const livePersonaName = LIVE_MODE_LABEL;

  // Effective Pass 1 for AnalystControlPanel + RecommendationCard at
  // terminal states. When Pass 3 fired and produced a correction, the
  // corrected output is the "current" Pass 1 the analyst is acting on.
  const effectivePass1 = pass3Output?.corrected_pass_1_output ?? pass1Output;

  // === ExaminerNotes content selection (Batch 10.4 Iteration 1) ===
  //
  // displayPass1 — single per-render selection of which Pass 1 to display in
  // ExaminerNotes. Replicates the AnalystControlPanel dual-mode pass1 pattern
  // inline rather than extracting (Iteration 1 Finding E disposition: two
  // consumers don't justify a helper; revisit at Batch 11 if a third arises).
  //
  // Selection rule:
  //   - corrected_and_verified / correction_failed_surfaced  → effectivePass1
  //     (corrected, since pass3Output is set at these states)
  //   - everything else  → pass1Output (original)
  //
  // At passed_first_audit: pass3Output is null, effectivePass1 === pass1Output,
  // so the two branches converge — `pass1Output` is the correct selection here
  // and the "mid-flight original / terminal corrected" framing applies even
  // though it's a terminal state, because no Pass 3 fired.
  //
  // At failed: original pass1Output renders regardless of whether pass3Output
  // exists (e.g., failed at re-audit after Pass 3 already returned). Per
  // Iteration 1 directive test surface: "Mid-flight content: original Pass 1
  // summary_finding + examiner_notes_full at pass_2 / pass_3 / re_audit /
  // failed." Failed is bundled with mid-flight for content-selection purposes.
  const displayPass1 =
    stateValue === 'corrected_and_verified' ||
    stateValue === 'correction_failed_surfaced'
      ? effectivePass1
      : pass1Output;

  // customerReference — ExaminerNotes header second line.
  // Persona mode: loadPersona for the validated profile.customer_reference.
  //   Slightly redundant with usePersonaPlayback's internal loadPersona
  //   (the 9.3 hook validates the persona JSON), but the hook does not
  //   expose the loaded profile and extending the 9.3 contract is out of
  //   scope for Iteration 1. Memoized on personaId so the redundant call
  //   fires only on persona change, not on every render.
  // Live mode: liveProfile.customer_reference from the submitted form.
  //   Dep is liveProfile (the React state ref); the ref is stable across
  //   re-renders unless setLiveProfile is called (which only fires inside
  //   handleLiveSubmit), so the memo re-fires correctly only on new live
  //   submissions.
  const customerReference = useMemo(() => {
    if (mode === 'live') return liveProfile?.customer_reference ?? '';
    if (personaId) {
      try {
        return loadPersona(personaId).profile.customer_reference;
      } catch {
        return '';
      }
    }
    return '';
  }, [mode, personaId, liveProfile]);

  // AnalystControlPanel callbacks: live mode only per Decision 36h
  // Implementation Requirements. Persona mode passes no callbacks; the 10.1
  // optional-callback contract handles the absence cleanly. Discipline made
  // structural: persona mode has no path to raise race signals.
  const analystCallbacks =
    mode === 'live'
      ? {
          onActionTaken: () => liveMachine.setAnalystActionTaken(true),
          onOverrideModalOpen: () => liveMachine.setOverrideModalOpen(true),
          onOverrideModalClose: () => liveMachine.setOverrideModalOpen(false),
        }
      : {};

  // AnalystControlPanel mount helper. The panel internally orchestrates
  // Pass3CorrectionBanner / Pass3RaceBanner placement based on pass3 +
  // raceTrigger + overrideModalOpen + actionState (Batch 8.5 contract; this
  // orchestrator does not mount banners directly — Finding F reinterpretation).
  //
  // pass1Override lets mid-flight states (pass_2/pass_3/re_audit) pass the
  // ORIGINAL pass1Output instead of effectivePass1 — preserving the
  // "acted on the uncorrected output" semantics of Decision 36h sub-case (a).
  // At terminal states (passed_first_audit / corrected_and_verified /
  // correction_failed_surfaced) the helper uses effectivePass1 which picks
  // the corrected output if Pass 3 fired.
  const renderAnalystPanel = (
    opts: { pass1Override?: typeof pass1Output } = {},
  ) => {
    const panelPass1 = opts.pass1Override ?? effectivePass1;
    if (!panelPass1) return null;
    return (
      <AnalystControlPanel
        personaId={mode === 'live' ? 'live' : personaId ?? 'unknown'}
        personaName={mode === 'live' ? livePersonaName : personaName}
        pass1={panelPass1}
        pass3={pass3Output ?? null}
        raceTrigger={raceTrigger}
        auditRefSource={
          mode === 'live' && liveProfile
            ? { kind: 'live', sessionSeed: liveProfile.customer_reference }
            : undefined
        }
        {...analystCallbacks}
      />
    );
  };

  // ExaminerNotes mount helper. Mounts at all post-pass_1 states where
  // displayPass1 is non-null. Selection of original vs corrected content is
  // baked into displayPass1 above per Iteration 1 Finding E disposition.
  // Persona-mode personaName = persona display name; live-mode personaName =
  // livePersonaName (which derives from liveProfile.customer_reference with
  // 'this case' fallback — Iteration 1 Things-to-Flag #41 deferred this
  // assignment for close-out review; live-mode header may end up showing
  // duplicate strings on the two header lines).
  const renderExaminerNotes = () => {
    if (!displayPass1) return null;
    return (
      <ExaminerNotes
        pass1={displayPass1}
        personaName={mode === 'live' ? livePersonaName : personaName}
        customerReference={customerReference}
      />
    );
  };

  // State-driven decisioning surface render.
  const decisioningSurface = (() => {
    switch (stateValue) {
      case 'idle':
        return (
          <p
            data-testid="idle-prompt"
            className="font-sans text-sm text-text-tertiary"
          >
            {IDLE_PROMPT}
          </p>
        );

      case 'pass_1':
        // pass_1 in flight — no pass1Output yet, no panel yet.
        return (
          <div className="flex flex-col gap-4">
            {headlineProps && <PassHeadline {...headlineProps} />}
          </div>
        );

      case 'pass_2':
      case 're_audit': {
        // Mid-flight audit-bearing state. Panel mounts here too so race
        // sub-case (b) [Override modal open at pass_2 → pass_3 transition]
        // and sub-case (a) [analyst action before terminal] are reachable.
        // Panel sees pass1=pass1Output (the ORIGINAL Pass 1) preserving the
        // "acted on the uncorrected output" semantics of Decision 36h
        // sub-case (a). See the 10.3 spec-walk note in the synthesis doc:
        // the directive's render table only listed AnalystControlPanel at
        // terminal states, but the directive's race-test surface implies
        // mid-flight mounting. Panel mounts from pass_2 onward.
        //
        // ExaminerNotes mounts here too (Batch 10.4 Iteration 1) — reads
        // displayPass1 which selects original Pass 1 content at mid-flight
        // states per Iteration 1 directive content-selection rule.
        const auditData = stateValue === 'pass_2' ? pass2Output : reAuditOutput;
        return (
          <div className="flex flex-col gap-4">
            {headlineProps && <PassHeadline {...headlineProps} />}
            {auditData && (
              <AuditPanelTicker
                pass2={auditData}
                shouldAnimate={shouldAnimate}
                live={mode === 'live'}
              />
            )}
            {renderExaminerNotes()}
            {renderAnalystPanel({ pass1Override: pass1Output })}
          </div>
        );
      }

      case 'pass_3':
        // Pass 3 in flight — no pass3Output yet. Panel mounts with the
        // original pass1Output. The "Correcting…" indicator signals the
        // in-flight correction work. ExaminerNotes mounts with original
        // Pass 1 content (Batch 10.4 Iteration 1).
        return (
          <div className="flex flex-col gap-4">
            {headlineProps && <PassHeadline {...headlineProps} />}
            <p
              data-testid="pass-3-in-flight"
              className="font-sans text-sm text-text-tertiary"
            >
              {PASS_3_IN_FLIGHT_LABEL}
            </p>
            {renderExaminerNotes()}
            {renderAnalystPanel({ pass1Override: pass1Output })}
          </div>
        );

      case 'passed_first_audit': {
        if (!effectivePass1 || !pass2Output) return null;
        // ExaminerNotes mounts with original Pass 1 content (no Pass 3 fired
        // here; displayPass1 === pass1Output === effectivePass1).
        return (
          <div className="flex flex-col gap-6">
            <RecommendationCard pass1={effectivePass1} />
            <AuditPanelTicker
              pass2={pass2Output}
              shouldAnimate={false}
              live={mode === 'live'}
            />
            {renderExaminerNotes()}
            {renderAnalystPanel()}
          </div>
        );
      }

      case 'corrected_and_verified': {
        if (!effectivePass1 || !reAuditOutput) return null;
        // ExaminerNotes mounts with CORRECTED Pass 1 content (Pass 3 fired,
        // re-audit passed clean; displayPass1 === effectivePass1 ===
        // pass3Output.corrected_pass_1_output).
        return (
          <div className="flex flex-col gap-6">
            <RecommendationCard pass1={effectivePass1} />
            <AuditPanelTicker
              pass2={reAuditOutput}
              shouldAnimate={false}
              live={mode === 'live'}
            />
            {renderExaminerNotes()}
            {renderAnalystPanel()}
          </div>
        );
      }

      case 'correction_failed_surfaced': {
        // Cap-reached layout per Finding G — four stacked sections.
        if (!pass1Output || !pass2Output || !pass3Output || !reAuditOutput) {
          return null;
        }
        return (
          <div
            data-testid="cap-reached-surface"
            className="flex flex-col gap-6"
          >
            <CapReachedSection label="Original recommendation">
              <RecommendationCard pass1={pass1Output} />
            </CapReachedSection>
            <CapReachedSection label="Original audit">
              <AuditPanelTicker
                pass2={pass2Output}
                shouldAnimate={false}
                live={mode === 'live'}
              />
            </CapReachedSection>
            <CapReachedSection label="Correction attempted">
              <Pass3CorrectionBanner pass3={pass3Output} />
            </CapReachedSection>
            <CapReachedSection label="Re-audit findings">
              <AuditPanelTicker
                pass2={reAuditOutput}
                shouldAnimate={false}
                live={mode === 'live'}
              />
            </CapReachedSection>
            {/* ExaminerNotes mounts BETWEEN the final "Re-audit findings"
                section and AnalystControlPanel — preserves the canonical
                visual_system.md:186 ordering (audit panel → examiner notes →
                analyst panel) inside the elaborated cap-reached layout.
                Renders CORRECTED Pass 1 content (Pass 3 fired). */}
            {renderExaminerNotes()}
            {renderAnalystPanel()}
          </div>
        );
      }

      case 'failed': {
        // Ledger D3: failed-state surface follows corpus §5.3 violation treatment.
        if (!error) return null;
        // ExaminerNotes mounts at failed state with ORIGINAL Pass 1 content
        // per Iteration 1 directive ("Mid-flight content: original Pass 1 ...
        // at pass_2 / pass_3 / re_audit / failed"). Positioned BELOW the
        // error message (Iteration 1 Finding F disposition): error is the
        // primary signal; notes are supplementary context. AnalystControlPanel
        // intentionally does NOT mount at failed (no analyst action when the
        // system errored out — eighth-sub-class-candidate divergence per
        // Iteration 1 Finding F).
        return (
          <div className="flex flex-col gap-4">
            {headlineProps && <PassHeadline {...headlineProps} />}
            <p
              data-testid="failed-error-message"
              className="font-sans text-sm text-violation-primary"
            >
              {error.message}
            </p>
            {renderExaminerNotes()}
          </div>
        );
      }

      default: {
        // Exhaustiveness guard — a new DecisioningState value in a future
        // batch fails typecheck here until this switch is updated.
        const _exhaustive: never = stateValue;
        return _exhaustive;
      }
    }
  })();

  return (
    <>
      <section data-testid="persona-section" aria-label="Case selector">
        <PersonaSelector
          activePersonaId={personaId}
          onPersonaChange={handlePersonaChange}
        />
      </section>

      <section data-testid="decisioning-surface" aria-label="Decisioning surface">
        {decisioningSurface}
      </section>

      <section data-testid="custom-input-section" aria-label="Live custom input">
        <CustomInputForm onValidatedSubmit={handleLiveSubmit} />
      </section>
    </>
  );
}
