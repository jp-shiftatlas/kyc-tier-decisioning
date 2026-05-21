// components/wizard/StepIndicator.tsx
// Persistent step indicator rendered above each screen panel.
//
// Decision 48 / visual_system.md §6 — institutional register: no decorative
// icons, no animation beyond the active-state accent.
//
// Visual contract:
//   - Each step shows a numbered square + label
//   - Active step: filled slate-accent square + accent-primary bold label
//   - Completed step: subtle-bg square with accent-deep digit + secondary label
//   - Upcoming step: outlined square + tertiary label
//   - Steps connected by ─ dividers in --text-tertiary

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
  active: 'bg-accent-primary text-text-inverse',
  upcoming: 'border border-border-default text-text-tertiary bg-surface-elevated',
};

export function StepIndicator({ activeScreen }: StepIndicatorProps) {
  return (
    <nav
      data-testid="step-indicator"
      aria-label="Wizard progress"
      className="flex flex-row flex-wrap items-center justify-center gap-3 py-6"
    >
      {SCREEN_SEQUENCE.map((step, idx) => {
        const status = statusFor(step.id, activeScreen);
        const isLast = idx === SCREEN_SEQUENCE.length - 1;
        const stepNumber = idx + 1;
        return (
          <div key={step.id} className="flex flex-row items-center gap-3">
            <div className="flex flex-row items-center gap-2">
              <span
                aria-hidden="true"
                className={cx(
                  'inline-flex h-7 w-7 items-center justify-center font-sans text-sm font-semibold',
                  NUM_CLASSES[status],
                )}
              >
                {stepNumber}
              </span>
              <span
                data-step-status={status}
                aria-current={status === 'active' ? 'step' : undefined}
                className={cx('font-sans text-base', LABEL_CLASSES[status])}
              >
                {step.stepperLabel}
              </span>
            </div>
            {!isLast && (
              <span
                data-testid="step-chevron"
                aria-hidden="true"
                className="font-sans text-text-tertiary select-none"
              >
                ──
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
