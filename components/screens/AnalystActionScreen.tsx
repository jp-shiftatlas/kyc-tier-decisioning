'use client';
// components/screens/AnalystActionScreen.tsx
// Screen 5 — Analyst action.
//
// Wraps existing AnalystControlPanel. Live-mode race callbacks attached,
// persona mode passes none. auditRefSource derives from live profile when
// in live mode.
//
// Reset case: wizard.reset() + decisioning.reset() returns user to S1 with
// state cleared. Per Decision 46b mid-flight reset semantics, switching
// personas requires returning to S1.
//
// JP Batch 12 Screen 5 feedback — context paragraph added below the panel
// heading explaining what the analyst surface is for.

import { useDecisioning } from '@/components/orchestration/DecisioningContext';
import { useWizard } from '@/components/wizard/WizardContext';
import { AnalystControlPanel } from '@/components/decisioning/AnalystControlPanel';
import { Button } from '@/components/primitives/Button';

const SCREEN_5_CONTEXT_PARAGRAPH =
  'The compliance analyst makes the final decision — the three-pass pipeline produces a recommendation, but the analyst retains authority. Approve accepts the recommendation, Escalate routes the case to senior compliance for review (required for PEP cases), and Override documents an analyst-supplied basis for a different tier. In production, the recorded action persists to the bank’s case-management workflow with a full audit reference. Demo actions are not retained.';

export function AnalystActionScreen() {
  const wizard = useWizard();
  const decisioning = useDecisioning();
  const {
    mode,
    personaId,
    personaName,
    effectivePass1,
    pass3Output,
    raceTrigger,
    liveProfile,
    setAnalystActionTaken,
    setOverrideModalOpen,
    reset,
  } = decisioning;

  const handleReset = () => {
    reset();
    wizard.reset();
  };

  if (!effectivePass1) {
    return (
      <p className="font-sans text-sm text-text-tertiary">
        Analyst action becomes available once Pass 1 completes.
      </p>
    );
  }

  const analystCallbacks =
    mode === 'live'
      ? {
          onActionTaken: () => setAnalystActionTaken(true),
          onOverrideModalOpen: () => setOverrideModalOpen(true),
          onOverrideModalClose: () => setOverrideModalOpen(false),
        }
      : {};

  return (
    <div className="flex flex-col gap-6">
      <p className="font-sans text-sm leading-relaxed text-text-secondary">
        {SCREEN_5_CONTEXT_PARAGRAPH}
      </p>
      <AnalystControlPanel
        personaId={mode === 'live' ? 'live' : (personaId ?? 'unknown')}
        personaName={personaName}
        pass1={effectivePass1}
        pass3={pass3Output ?? null}
        raceTrigger={raceTrigger}
        auditRefSource={
          mode === 'live' && liveProfile
            ? { kind: 'live', sessionSeed: liveProfile.customer_reference }
            : undefined
        }
        {...analystCallbacks}
      />
      <div className="flex flex-row justify-start">
        <button
          type="button"
          onClick={handleReset}
          className="font-sans text-sm text-text-tertiary underline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          Reset case ›
        </button>
      </div>
    </div>
  );
}
