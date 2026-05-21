// components/decisioning/RunAnalysisButton.tsx
// Inline CTA inside the Reasoning Layer row on Screen 2.
//
// Decision 48c — Run Analysis CTA placement inside Reasoning Layer row,
// not in the bottom navigation bar. Anchors the action semantically to the
// stage that performs it.

'use client';

import { Button } from '@/components/primitives/Button';

interface RunAnalysisButtonProps {
  onRun: () => void;
  disabled: boolean;
  /** True briefly between click and screen advance — shows "Starting…" microcopy. */
  running?: boolean;
}

export function RunAnalysisButton({ onRun, disabled, running = false }: RunAnalysisButtonProps) {
  return (
    <div className="flex flex-row justify-end">
      <Button variant="primary" onClick={onRun} disabled={disabled || running}>
        {running ? 'Starting…' : 'Run Analysis ›'}
      </Button>
    </div>
  );
}
