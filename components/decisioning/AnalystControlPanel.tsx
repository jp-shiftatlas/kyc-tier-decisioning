'use client';
// components/decisioning/AnalystControlPanel.tsx
// AnalystControlPanel — primary action surface per visual_system.md §5.5 +
// Decision 36 (sub-decisions 36a–36h) + Decision 17 (analyst as decision
// authority). The heaviest orchestration node in the project: composes Modal,
// RecommendationCard, Pass3CorrectionBanner, Pass3RaceBanner.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   visual_system.md §5.5 lines 325–369:
//     - lines 329–332: three buttons (Approve / Escalate / Override) with
//       per-variant token treatment (Approve primary; Escalate outline;
//       Override subtle).
//     - lines 334–337: concordance signaling on Escalate when Pass 1 set
//       senior_approval_required:true — Escalate label flips to "Confirm
//       Escalation"; Approve de-emphasized via reduced opacity +
//       --text-secondary border. Post-click confirmation block reads
//       "Escalated" without parenthetical.
//     - lines 339–353: confirmation block structure (Case approved / Analyst /
//       Timestamp / Tier / Decisive rules / Audit reference); --surface-elevated
//       card; label values --text-secondary; data values --text-primary;
//       audit reference in --font-mono; microcopy in --text-tertiary --text-xs.
//     - lines 355–360: Override Modal contract (Modal primitive at Task 6.6
//       handles this; AnalystControlPanel orchestrates open/close + post-submit
//       transition to "Superseded by analyst override" view per line 358).
//     - lines 362–364: post-action state — all three buttons disable (Button
//       primitive's disabled:opacity-50 disabled:cursor-not-allowed handles
//       the visual); Reset case link in --text-tertiary --text-sm; persona
//       switching mid-action resets all state per Decision 36e.
//     - lines 366–369: Pass 3 race banner — above panel default; inside Modal
//       when Override modal is open AND Pass 3 fires (Decision 36h; modal
//       does NOT auto-close to preserve typed-but-not-submitted basis).
//   PRIMARY_PROMPT.md §6.5 — analyst control panel architectural positioning.
//   Decision 17 — analyst as decision authority, NOT final approver. Action
//     affordances live HERE exclusively; AuditPanel is the display surface
//     and has the inverse regression guard at AuditPanel.test.tsx:96
//     (queryByRole('button', { name: /override/i }) → not in document).
//   Decision 36a–36h — sub-decisions, exercised end-to-end:
//     36a Approve confirmation block shape
//     36b Escalate concordance signaling (Carlos PEP case in locked personas)
//     36c Override modal with full-fidelity "before" rendering
//        (RecommendationCard re-rendered post-submit per Finding 17 disposition
//        A: modal closes; "Superseded" view renders below the panel as the
//        post-action state, consistent with approved/escalated treatment)
//     36d post-action button state lockdown + "Reset case" link
//     36e persona switching mid-action resets action state
//     36f modal cancellation paths (Escape + backdrop click + Cancel button —
//        Modal primitive handles all three internally per its docstring)
//     36g audit reference format via generateAuditReferenceId helper
//     36h race coordination: raceTrigger prop signals race-during/after action;
//        Pass3RaceBanner placement is panel's responsibility (above panel
//        default; inside Modal via banner slot when modal open AND
//        raceTrigger)
//
// === TRUST BOUNDARY (Decision 17 corollary) ===
//
// Component owns:
//   - Three-action state machine (idle → approved / escalated / overridden →
//     reset back to idle via Reset case link).
//   - Override modal open/closed state.
//   - Audit reference generation at moment of action (Decision 36g).
//   - Race banner PLACEMENT decision per Decision 36h (above panel vs inside
//     modal). Pass3RaceBanner remains render-context-agnostic (Task 8.4).
//   - Persona switching reset via useEffect keyed on personaId (Decision 36e).
//
// Component does NOT own (per Decision 17 trust framing):
//   - The Pass 3 firing DECISION. Batch 9 state machine drives Pass 3; this
//     panel observes via pass3 prop. Race-condition DETECTION ("this pass3
//     represents a post-action race") is the parent's responsibility via
//     explicit raceTrigger:boolean prop (Finding 16 disposition A). Panel
//     does not self-detect race via pass3 identity comparison.
//   - The audit findings (AuditPanel's responsibility).
//   - The recommendation content (RecommendationCard's responsibility — the
//     panel composes it inside the "Superseded by analyst override" view
//     post-Override submit, but does not author the content).
//
// === MODAL PRIMITIVE EVOLUTION CONSUMER ===
//
// AnalystControlPanel is the canonical (and currently sole) consumer of
// Modal's `banner` slot, added at Task 8.5 as the first primitive-layer
// modification since Batch 6 closed. The banner slot exists specifically to
// satisfy Decision 36h's inside-Modal race-banner placement requirement.

import { useEffect, useRef, useState } from 'react';
import type { Pass1Output } from '@/lib/schemas/pass1';
import type { Pass3Output } from '@/lib/schemas/pass3';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Modal } from '@/components/primitives/Modal';
import { RecommendationCard } from './RecommendationCard';
import { Pass3CorrectionBanner } from './Pass3CorrectionBanner';
import { Pass3RaceBanner } from './Pass3RaceBanner';
import {
  generateAuditReferenceId,
  type AuditRefSource,
} from '@/lib/orchestration/auditReferenceId';
import { cx } from '@/lib/ui/classnames';

type ActionState = 'idle' | 'approved' | 'escalated' | 'overridden';

interface ConfirmationRecord {
  state: Exclude<ActionState, 'idle'>;
  tier: string;
  decisiveRules: string[];
  timestamp: string;
  auditReference: string;
  overrideBasis?: string;
}

interface AnalystControlPanelProps {
  // Persona id used as the audit-reference id component; string-typed to
  // admit both PersonaId enum values and live-mode session-seed hashes.
  personaId: string;
  // Persona display name for the Override modal title ("Override {name}'s
  // recommendation"). For live mode, parent passes the session-scoped label.
  personaName: string;
  pass1: Pass1Output;
  // Pass 3 output: when non-null AND !raceTrigger AND actionState === 'idle',
  // renders Pass3CorrectionBanner above the panel (initial correction case).
  // When raceTrigger is true, drives Pass3RaceBanner placement instead.
  pass3?: Pass3Output | null;
  // Parent-signaled race condition (Decision 36h; Finding 16 disposition A).
  // True → Pass3RaceBanner placement orchestration kicks in; resets action
  // state to idle if it transitions false→true while action is recorded.
  raceTrigger?: boolean;
  // Optional audit-ref source override for live mode. Defaults to using
  // personaId directly as the source string.
  auditRefSource?: AuditRefSource;
}

export function AnalystControlPanel({
  personaId,
  personaName,
  pass1,
  pass3,
  raceTrigger = false,
  auditRefSource,
}: AnalystControlPanelProps) {
  const [actionState, setActionState] = useState<ActionState>('idle');
  const [overrideModalOpen, setOverrideModalOpen] = useState(false);
  const [record, setRecord] = useState<ConfirmationRecord | null>(null);

  const seniorApprovalRequired = pass1.decision.senior_approval_required;

  // Decision 36e: persona switching mid-action resets action state.
  useEffect(() => {
    setActionState('idle');
    setOverrideModalOpen(false);
    setRecord(null);
  }, [personaId]);

  // Decision 36h: race-trigger transition false→true resets action state
  // to idle (action surface reset; Pass3RaceBanner takes over). Does NOT
  // close the Override modal — modal stays open per §5.5 line 369 to
  // preserve typed-but-not-submitted analyst reasoning.
  const prevRaceTriggerRef = useRef(raceTrigger);
  useEffect(() => {
    if (raceTrigger && !prevRaceTriggerRef.current) {
      setActionState('idle');
      setRecord(null);
    }
    prevRaceTriggerRef.current = raceTrigger;
  }, [raceTrigger]);

  const buildRecord = (
    state: Exclude<ActionState, 'idle'>,
    overrideBasis?: string,
  ): ConfirmationRecord => ({
    state,
    tier: pass1.decision.recommended_tier,
    decisiveRules: pass1.decision.decisive_rule_ids,
    timestamp: new Date().toISOString(),
    auditReference: generateAuditReferenceId(auditRefSource ?? personaId),
    overrideBasis,
  });

  const handleApprove = () => {
    setRecord(buildRecord('approved'));
    setActionState('approved');
  };
  const handleEscalate = () => {
    setRecord(buildRecord('escalated'));
    setActionState('escalated');
  };
  const handleOverride = () => {
    setOverrideModalOpen(true);
  };
  const handleOverrideSubmit = (basis: string) => {
    setRecord(buildRecord('overridden', basis));
    setActionState('overridden');
    setOverrideModalOpen(false);
  };
  const handleReset = () => {
    setActionState('idle');
    setRecord(null);
    setOverrideModalOpen(false);
  };

  // Placement orchestration per Decision 36h.
  const showCorrectionBanner =
    !!pass3 && actionState === 'idle' && !raceTrigger;
  const showRaceBannerAbovePanel =
    raceTrigger && !overrideModalOpen && !!pass3;
  const showRaceBannerInsideModal =
    raceTrigger && overrideModalOpen && !!pass3;

  const escalateLabel = seniorApprovalRequired ? 'Confirm Escalation' : 'Escalate';
  const isPostAction = actionState !== 'idle';

  return (
    <>
      {showCorrectionBanner && <Pass3CorrectionBanner pass3={pass3 as Pass3Output} />}
      {showRaceBannerAbovePanel && <Pass3RaceBanner pass3={pass3 as Pass3Output} />}

      <Card variant="elevated">
        <div className="flex flex-col gap-4">
          <h2 className="font-sans text-base font-semibold text-text-primary">
            Analyst review
          </h2>

          {/* Three action buttons — always rendered (disable in post-action) */}
          <div className="flex flex-wrap gap-3">
            <Button
              variant="primary"
              disabled={isPostAction}
              onClick={handleApprove}
              // Concordance signaling per Decision 36b: when senior approval
              // required AND pre-click (idle), Approve is de-emphasized.
              className={
                !isPostAction && seniorApprovalRequired
                  ? 'border border-text-secondary opacity-50'
                  : undefined
              }
            >
              Approve
            </Button>
            <Button variant="outline" disabled={isPostAction} onClick={handleEscalate}>
              {escalateLabel}
            </Button>
            <Button variant="subtle" disabled={isPostAction} onClick={handleOverride}>
              Override
            </Button>
          </div>

          {/* Confirmation block — post-action only */}
          {isPostAction && record && (
            <ConfirmationView record={record} pass1={pass1} />
          )}

          {/* Reset case link — post-action only (Decision 36d) */}
          {isPostAction && (
            <button
              type="button"
              onClick={handleReset}
              className="self-start font-sans text-sm text-text-tertiary underline"
            >
              Reset case
            </button>
          )}
        </div>
      </Card>

      <Modal
        open={overrideModalOpen}
        onClose={() => setOverrideModalOpen(false)}
        onSubmit={handleOverrideSubmit}
        title={`Override ${personaName}'s recommendation`}
        banner={
          showRaceBannerInsideModal ? (
            <Pass3RaceBanner pass3={pass3 as Pass3Output} />
          ) : undefined
        }
      />
    </>
  );
}

// === ConfirmationView ===
//
// Renders three distinct post-action treatments:
//   - approved   → "Case approved" + fields card (Decision 36a)
//   - escalated  → "Escalated" + fields card (Decision 36b; same field
//                  structure, different heading; concordance cue lived in
//                  the pre-click button label, NOT a post-click parenthetical)
//   - overridden → "Superseded by analyst override" header + full
//                  RecommendationCard (re-rendered render-context-agnostically
//                  per Decision 36c) + analyst-basis card. Treatment per §5.5
//                  line 358; Finding 17 disposition A (renders below panel
//                  as post-action state, consistent with approved/escalated).

function ConfirmationView({
  record,
  pass1,
}: {
  record: ConfirmationRecord;
  pass1: Pass1Output;
}) {
  if (record.state === 'overridden') {
    return (
      <div className="flex flex-col gap-3">
        <div className="font-sans text-sm text-text-tertiary">
          Superseded by analyst override
        </div>
        <RecommendationCard pass1={pass1} />
        <Card variant="elevated">
          <h3 className="mb-2 font-sans text-sm font-medium text-text-secondary">
            Analyst basis
          </h3>
          <p className="font-sans text-sm text-text-primary">{record.overrideBasis}</p>
        </Card>
        <ProductionPreviewMicrocopy />
      </div>
    );
  }

  const heading = record.state === 'approved' ? 'Case approved' : 'Escalated';
  return (
    <Card variant="elevated">
      <div className="flex flex-col gap-2">
        <h3 className="font-sans text-base font-semibold text-text-primary">
          {heading}
        </h3>
        <ConfirmationField label="Analyst" value="Demo Analyst" />
        <ConfirmationField label="Timestamp" value={record.timestamp} />
        <ConfirmationField label="Tier" value={record.tier} />
        <ConfirmationField
          label="Decisive rules"
          value={record.decisiveRules.join(', ')}
        />
        <ConfirmationField
          label="Audit reference"
          value={record.auditReference}
          mono
        />
        <ProductionPreviewMicrocopy />
      </div>
    </Card>
  );
}

function ConfirmationField({
  label,
  value,
  mono = false,
}: {
  label: string;
  value: string;
  mono?: boolean;
}) {
  return (
    <div className="flex flex-wrap gap-2">
      <span className="font-sans text-sm text-text-secondary">{label}:</span>
      <span
        className={cx(
          mono ? 'font-mono' : 'font-sans',
          'text-sm text-text-primary',
        )}
      >
        {value}
      </span>
    </div>
  );
}

function ProductionPreviewMicrocopy() {
  return (
    <p className="mt-2 font-sans text-xs text-text-tertiary">
      Production: this record persists to your case management workflow. Demo: this record is not retained.
    </p>
  );
}
