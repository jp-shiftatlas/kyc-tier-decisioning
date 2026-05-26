// components/wizard/StepIndicator.tsx
// Persistent step indicator rendered above each screen panel.
//
// Batch 12 product polish:
//   - Numbered circles upgraded from squares to actual circles (rounded-full)
//     at h-9/w-9 (was h-7/w-7). Larger + circular for product feel.
//   - Connector becomes a solid horizontal line instead of em-dashes — reads
//     as a flow indicator, not a punctuation hint.
//   - Active step gets a slate ring (ring-2 ring-accent-primary at offset)
//     in addition to the filled background, so the active state has extra
//     visual presence.
//   - Container width matches the wizard content width, with vertical
//     padding adjusted for the larger circle size.

'use client';

import {
  SCREEN_SEQUENCE,
  type ScreenId,
} from '@/lib/wizard/screenSequence';
import { cx } from '@/lib/ui/classnames';

interface StepIndicatorProps {
  activeScreen: ScreenId;
}

type StepStatus = 'completed' | 'active' | 'upcoming';

function statusFor(stepId: ScreenId, activeId: ScreenId): StepStatus {
  const activeIdx = SCREEN_SEQUENCE.findIndex((s) => s.id === activeId);
  const stepIdx = SCREEN_SEQUENCE.findIndex((s) => s.id === stepId);
  if (stepIdx < activeIdx) return 'completed';
  if (stepIdx === activeIdx) return 'active';
  return 'upcoming';
}

const LABEL_CLASSES: Record<StepStatus, string> = {
  completed: 'text-text-secondary',
  active: 'text-accent-primary font-semibold',
  upcoming: 'text-text-tertiary',
};

const NUM_CLASSES: Record<StepStatus, string> = {
  completed: 'bg-accent-subtle-bg text-accent-deep',
  active:
    'bg-accent-primary text-text-inverse ring-2 ring-accent-primary ring-offset-2 ring-offset-surface-base',
  upcoming: 'border border-border-default text-text-tertiary bg-surface-elevated',
};

const CONNECTOR_CLASSES: Record<StepStatus, string> = {
  completed: 'bg-accent-subtle-bg',
  active: 'bg-accent-subtle-bg',
  upcoming: 'bg-border-default',
};

export function StepIndicator({ activeScreen }: StepIndicatorProps) {
  return (
    <nav
      data-testid="step-indicator"
      aria-label="Wizard progress"
      className="flex flex-row flex-wrap items-center justify-center gap-2 py-8"
    >
      {SCREEN_SEQUENCE.map((step, idx) => {
        const status = statusFor(step.id, activeScreen);
        const isLast = idx === SCREEN_SEQUENCE.length - 1;
        const stepNumber = idx + 1;
        // Connector segments between steps take the COMPLETED treatment when
        // both flanking steps are completed/active (the segment is part of
        // the user's traversed path).
        const connectorStatus: StepStatus =
          status === 'upcoming' ? 'upcoming' : 'completed';
        return (
          <div key={step.id} className="flex flex-row items-center gap-3">
            <div className="flex flex-row items-center gap-3">
              <span
                aria-hidden="true"
                className={cx(
                  'inline-flex h-9 w-9 items-center justify-center rounded-full font-sans text-sm font-semibold transition-colors',
                  NUM_CLASSES[status],
                )}
              >
                {stepNumber}
              </span>
              <span
                data-step-status={status}
                aria-current={status === 'active' ? 'step' : undefined}
                className={cx(
                  'font-sans text-base transition-colors',
                  LABEL_CLASSES[status],
                )}
              >
                {step.stepperLabel}
              </span>
            </div>
            {!isLast && (
              <span
                data-testid="step-chevron"
                aria-hidden="true"
                className={cx(
                  'mx-2 h-px w-10 transition-colors',
                  CONNECTOR_CLASSES[connectorStatus],
                )}
              />
            )}
          </div>
        );
      })}
    </nav>
  );
}
