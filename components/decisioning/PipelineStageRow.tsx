// components/decisioning/PipelineStageRow.tsx
// One row of the vertical pipeline on Screen 2: left stage-box + right panel.
//
// Decision 48a — architecture strip evolves from page-bottom static artifact
// to organizing axis on Screen 2. Boxes preserve non-interactivity (no hover,
// no click) per Decision 42 discipline. The right-panel children are sibling
// surfaces, not interactive disclosure.
//
// Active treatment (Reasoning Layer): slate accent background + inverse text
// per visual_system.md §5.4. Other stages: surface-recessed background.

'use client';

import { cx } from '@/lib/ui/classnames';

interface PipelineStageRowProps {
  stageLabel: string;
  /** True for the Reasoning Layer row only — gets slate-accent treatment. */
  active?: boolean;
  /** True for every row except the last (Core Banking) — renders ↓ connector below. */
  notLast?: boolean;
  children: React.ReactNode;
}

export function PipelineStageRow({
  stageLabel,
  active = false,
  notLast = false,
  children,
}: PipelineStageRowProps) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-row gap-6">
        <div
          data-stage-active={active}
          className={cx(
            'flex w-36 shrink-0 flex-col justify-center p-4 font-sans text-sm font-semibold',
            active
              ? 'bg-accent-primary text-text-inverse'
              : 'bg-surface-recessed text-text-primary border border-border-default',
          )}
        >
          {stageLabel}
        </div>
        <div className="flex-1">{children}</div>
      </div>
      {notLast && (
        <div
          data-testid="pipeline-connector"
          aria-hidden="true"
          className="ml-[3.75rem] my-1 font-sans text-2xl leading-none text-text-tertiary select-none"
        >
          ▾
        </div>
      )}
    </div>
  );
}
