'use client';
// components/screens/ExaminerNotesScreen.tsx
// Screen 4 — Examiner notes.
//
// Wraps existing ExaminerNotes component. Content selection (original Pass 1
// vs. corrected Pass 1 from Pass 3) lives in DecisioningProvider's
// displayPass1 derivation. This screen renders the memo + a Next button
// advancing to Analyst Action.
//
// JP Batch 12 Screen 4 feedback — context paragraph added below the panel
// heading so visitors understand what they're reading: a compliance-memo
// rendering of the analyst's reasoning, structured the way a BSP examiner
// would expect to see it. The deeper polish of this screen is deferred to a
// later iteration.

import { useDecisioning } from '@/components/orchestration/DecisioningContext';
import { useWizard } from '@/components/wizard/WizardContext';
import { ExaminerNotes } from '@/components/decisioning/ExaminerNotes';
import { Button } from '@/components/primitives/Button';

const SCREEN_4_CONTEXT_PARAGRAPH =
  'These notes translate the structured Pass 1 recommendation into a compliance-memo register — the format a BSP examiner expects to see when reviewing the analyst’s reasoning. Decision summary, profile analysis, rule application, considered alternatives, recommended EDD procedures, and audit trail appear as sequenced sections; expand any section to read the full memo.';

export function ExaminerNotesScreen() {
  const wizard = useWizard();
  const { displayPass1, personaName, customerReference } = useDecisioning();

  if (!displayPass1) {
    return (
      <p className="font-sans text-sm text-text-tertiary">
        Examiner notes will appear once Pass 1 completes.
      </p>
    );
  }

  return (
    <div className="flex flex-col gap-6">
      <p className="font-sans text-sm leading-relaxed text-text-secondary">
        {SCREEN_4_CONTEXT_PARAGRAPH}
      </p>
      <ExaminerNotes
        pass1={displayPass1}
        personaName={personaName}
        customerReference={customerReference}
      />
      <div className="flex flex-row justify-end">
        <Button variant="primary" onClick={() => wizard.advance()}>
          Next: Analyst action ›
        </Button>
      </div>
    </div>
  );
}
