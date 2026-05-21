'use client';
// components/screens/AuditScreen.tsx
// Screen 3 — Three-pass audit (HERO).
//
// State-driven render of the three-pass pipeline. Per-state matrix is the
// same as the prior DecisioningOrchestrator switch on stateValue, with two
// additions for the wizard demo experience:
//
//   1. Persona-mode simulated analysis phase. Per Decision 46a the persona
//      machine resolves instantly when the personaId is set on Screen 1, so
//      by the time the user reaches Screen 3 the machine is already at
//      passed_first_audit (terminal). To make the audit FEEL like work is
//      being done — JP's Batch 12 Screen 3 feedback — we override the
//      terminal-state render for ~5 seconds:
//         sim-pass-1 (2s): Pass 1 headline + "Analyzing customer profile…"
//         sim-pass-2 (3s): Pass 1 reveal + Pass 2 headline + AuditPanelTicker animating
//         reveal       : full terminal state + Next button
//      The audit panel's per-check ticker (80–120ms per check × 25–30 checks)
//      naturally fills the sim-pass-2 phase.
//   2. Pass labels at terminal state. Each pass section now carries its
//      PassHeadline (Pass 1 — Recommendation / Pass 2 — Re-check Pass 1) above
//      the corresponding card so the audit-as-document feel reads even
//      when the machine has settled.
//
// Live mode rendering follows the state machine directly — the in-flight
// states drive the headline + animating ticker naturally, no simulation
// needed.

import { useEffect, useState } from 'react';
import { useDecisioning } from '@/components/orchestration/DecisioningContext';
import { useWizard } from '@/components/wizard/WizardContext';
import { PassHeadline } from '@/components/decisioning/PassHeadline';
import { RecommendationCard } from '@/components/decisioning/RecommendationCard';
import { AuditPanelTicker } from '@/components/decisioning/AuditPanelTicker';
import { Pass3CorrectionBanner } from '@/components/decisioning/Pass3CorrectionBanner';
import { Button } from '@/components/primitives/Button';
import { AnalysisLoadingBar } from '@/components/decisioning/AnalysisLoadingBar';

const PASS_3_IN_FLIGHT_LABEL = 'Correcting…';
const PASS_1_SIM_LABEL = 'Analyzing customer profile…';

// Persona-mode simulation phases. Live mode does not use these — the state
// machine drives transitions on its own.
type SimPhase = 'sim-pass-1' | 'sim-pass-2' | 'reveal';
const SIM_PASS_1_MS = 2000;
const SIM_PASS_2_MS = 3000;

function CapReachedSection({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-3">
      <h3 className="font-sans text-sm font-semibold text-text-secondary">{label}</h3>
      {children}
    </div>
  );
}

export function AuditScreen() {
  const decisioning = useDecisioning();
  const wizard = useWizard();
  const {
    stateValue,
    pass1Output,
    pass2Output,
    pass3Output,
    reAuditOutput,
    error,
    effectivePass1,
    headlineProps,
    shouldAnimate,
    mode,
  } = decisioning;

  const isTerminal =
    stateValue === 'passed_first_audit' ||
    stateValue === 'corrected_and_verified' ||
    stateValue === 'correction_failed_surfaced';

  // Persona-mode simulation phase. Runs only when persona mode AND machine
  // is at terminal state at mount. Live mode skips this — the state
  // transitions naturally through pass_1 / pass_2 / terminal.
  const usesSimulation = mode === 'persona' && isTerminal;
  const [simPhase, setSimPhase] = useState<SimPhase>(
    usesSimulation ? 'sim-pass-1' : 'reveal',
  );

  useEffect(() => {
    if (!usesSimulation) {
      setSimPhase('reveal');
      return;
    }
    const t1 = setTimeout(() => setSimPhase('sim-pass-2'), SIM_PASS_1_MS);
    const t2 = setTimeout(() => setSimPhase('reveal'), SIM_PASS_1_MS + SIM_PASS_2_MS);
    return () => {
      clearTimeout(t1);
      clearTimeout(t2);
    };
  }, [usesSimulation]);

  // Show the Next button only when the terminal state is fully revealed
  // (or live-mode terminal state).
  const showNextButton = isTerminal && simPhase === 'reveal' && stateValue !== 'correction_failed_surfaced';
  const showNextButtonOnCapReached = stateValue === 'correction_failed_surfaced' && simPhase === 'reveal';

  // Persona-mode simulation render override at terminal.
  // PassHeadline above AuditPanelTicker is intentionally omitted in sim-pass-2
  // and downstream — AuditPanel renders its own "Pass 2 — Re-check Pass 1"
  // headline internally per the Decision 41 S3 / 41d contract. Wrapping with
  // an additional PassHeadline would duplicate the label.
  if (usesSimulation && simPhase !== 'reveal') {
    if (simPhase === 'sim-pass-1') {
      return (
        <div className="flex flex-col gap-6">
          <section className="flex flex-col gap-3">
            <PassHeadline pass={1} variant="recommendation" />
            <AnalysisLoadingBar />
            <p className="font-sans text-sm italic text-text-tertiary">
              {PASS_1_SIM_LABEL}
            </p>
          </section>
        </div>
      );
    }
    // sim-pass-2
    return (
      <div className="flex flex-col gap-6">
        <section className="flex flex-col gap-3">
          <PassHeadline pass={1} variant="recommendation" />
          {effectivePass1 && <RecommendationCard pass1={effectivePass1} />}
        </section>
        {pass2Output && (
          <AuditPanelTicker pass2={pass2Output} shouldAnimate={true} live={false} />
        )}
      </div>
    );
  }

  const renderBody = () => {
    switch (stateValue) {
      case 'idle':
      case 'pass_1':
        return headlineProps ? (
          <section className="flex flex-col gap-3">
            <PassHeadline {...headlineProps} />
            <p className="font-sans text-sm italic text-text-tertiary">
              {PASS_1_SIM_LABEL}
            </p>
          </section>
        ) : null;

      case 'pass_2':
      case 're_audit': {
        const auditData = stateValue === 'pass_2' ? pass2Output : reAuditOutput;
        // AuditPanel renders its own "Pass 2 — Re-check Pass 1" headline; the
        // outer PassHeadline above is intentionally omitted (was duplicate).
        return (
          <div className="flex flex-col gap-6">
            {effectivePass1 && (
              <section className="flex flex-col gap-3">
                <PassHeadline pass={1} variant="recommendation" />
                <RecommendationCard pass1={effectivePass1} />
              </section>
            )}
            {auditData && (
              <AuditPanelTicker
                pass2={auditData}
                shouldAnimate={shouldAnimate}
                live={mode === 'live'}
              />
            )}
          </div>
        );
      }

      case 'pass_3':
        return (
          <div className="flex flex-col gap-6">
            {effectivePass1 && (
              <section className="flex flex-col gap-3">
                <PassHeadline pass={1} variant="recommendation" />
                <RecommendationCard pass1={effectivePass1} />
              </section>
            )}
            <section className="flex flex-col gap-3">
              {headlineProps && <PassHeadline {...headlineProps} />}
              <p
                data-testid="pass-3-in-flight"
                className="font-sans text-sm italic text-text-tertiary"
              >
                {PASS_3_IN_FLIGHT_LABEL}
              </p>
            </section>
          </div>
        );

      case 'passed_first_audit':
        if (!effectivePass1 || !pass2Output) return null;
        // AuditPanel renders its own Pass 2 headline; outer wrapping omitted.
        return (
          <div className="flex flex-col gap-6">
            <section className="flex flex-col gap-3">
              <PassHeadline pass={1} variant="recommendation" />
              <RecommendationCard pass1={effectivePass1} />
            </section>
            <AuditPanelTicker
              pass2={pass2Output}
              shouldAnimate={false}
              live={mode === 'live'}
            />
          </div>
        );

      case 'corrected_and_verified':
        if (!effectivePass1 || !reAuditOutput || !pass3Output) return null;
        return (
          <div className="flex flex-col gap-6">
            <Pass3CorrectionBanner pass3={pass3Output} />
            <section className="flex flex-col gap-3">
              <PassHeadline pass={1} variant="recommendation" />
              <RecommendationCard pass1={effectivePass1} />
            </section>
            <AuditPanelTicker
              pass2={reAuditOutput}
              shouldAnimate={false}
              live={mode === 'live'}
            />
          </div>
        );

      case 'correction_failed_surfaced':
        if (!pass1Output || !pass2Output || !pass3Output || !reAuditOutput) return null;
        return (
          <div data-testid="cap-reached-surface" className="flex flex-col gap-6">
            <CapReachedSection label="Original recommendation">
              <RecommendationCard pass1={pass1Output} />
            </CapReachedSection>
            <CapReachedSection label="Original audit">
              <AuditPanelTicker pass2={pass2Output} shouldAnimate={false} live={mode === 'live'} />
            </CapReachedSection>
            <CapReachedSection label="Correction attempted">
              <Pass3CorrectionBanner pass3={pass3Output} />
            </CapReachedSection>
            <CapReachedSection label="Re-audit findings">
              <AuditPanelTicker pass2={reAuditOutput} shouldAnimate={false} live={mode === 'live'} />
            </CapReachedSection>
          </div>
        );

      case 'failed':
        if (!error) return null;
        return (
          <div className="flex flex-col gap-4">
            {headlineProps && <PassHeadline {...headlineProps} />}
            <p
              data-testid="failed-error-message"
              className="font-sans text-sm text-violation-primary"
            >
              {error.message}
            </p>
          </div>
        );

      default: {
        const _exhaustive: never = stateValue;
        return _exhaustive;
      }
    }
  };

  return (
    <div className="flex flex-col gap-6">
      {renderBody()}
      {(showNextButton || showNextButtonOnCapReached) && (
        <div className="flex flex-row justify-end">
          <Button variant="primary" onClick={() => wizard.advance()}>
            Next: Examiner notes ›
          </Button>
        </div>
      )}
    </div>
  );
}
