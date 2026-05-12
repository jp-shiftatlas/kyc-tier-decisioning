// components/primitives/Chip.tsx
// Chip primitive per visual_system.md §5 component constraints.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §2 token rules — color tokens with reserved usage:
//     --status-success-bg / --status-success      (PASS clean states ONLY)
//     --violation-bg / --violation-primary        (Pass 2 violation rule ONLY)
//     --status-warning-bg / --status-warning      (quality flags ONLY — not material)
//     --accent-subtle-bg / --accent-deep          (slate-blue badge family)
//     --surface-recessed / --text-secondary       (neutral chip default)
//   §5.1 line 222 — "category breakdown chips below" (neutral non-status chips)
//   §5.2 line 243 — "Status chip: PASS (success green), FAIL (violation red),
//                    QUALITY (warning amber)" — the canonical three-status mapping
//   §5.2 line 275 — "violation categories chip strip" (categorical accent chips)
//
// Status set is the §5.2 spec-named three: PASS | FAIL | QUALITY. No additional
// statuses (no INFO, no ERROR, no SUCCESS) — per "no variant proliferation" scope.
//
// Non-status variants:
//   - accent  : --accent-subtle-bg + --accent-deep — §5.2 violation-categories
//               strip + §5.1 badge family
//   - neutral : --surface-recessed + --text-secondary — §5.1 category breakdown
//               chips (default when neither status nor variant is set)
//
// Reserved-token enforcement is contextual, NOT primitive-level. The Chip
// primitive does not refuse to render `status="FAIL"` outside a Pass 2 audit
// row — that's a composition-layer obligation. The primitive trusts the caller
// to pass the spec-correct status for the spec-correct context.
//
// No border-radius — visual_system.md is silent on chip corner radius. Per the
// spec-silence-as-discipline pattern (Task 6.2 Card finding), unnamed
// affordances default to flat/crisp 90° corners. Regression-guarded.
//
// No hover state, no shadow, no transition, no animation — §3 line 92 + §6
// line 464 reserve interaction affordances for elements where they communicate
// something. Status chips are read, not pressed. Regression-guarded.
//
// Tier badge (§5.1 line 221) is NOT this primitive — it's a composition-layer
// component with specific large size, mono font, and tier-label content. Tier
// badge uses the same `accent` color family but otherwise diverges.

import type { ReactNode } from 'react';
import { cx } from '@/lib/ui/classnames';

type Status = 'PASS' | 'FAIL' | 'QUALITY';
type Variant = 'accent' | 'neutral';

interface ChipProps {
  status?: Status;
  variant?: Variant;
  className?: string;
  children: ReactNode;
}

const STATUS_CLASSES: Record<Status, string> = {
  PASS: 'bg-status-success-bg text-status-success',
  FAIL: 'bg-violation-bg text-violation-primary',
  QUALITY: 'bg-status-warning-bg text-status-warning',
};

const VARIANT_CLASSES: Record<Variant, string> = {
  accent: 'bg-accent-subtle-bg text-accent-deep',
  neutral: 'bg-surface-recessed text-text-secondary',
};

export function Chip({ status, variant, className, children }: ChipProps) {
  const colors = status ? STATUS_CLASSES[status] : VARIANT_CLASSES[variant ?? 'neutral'];
  return (
    <span className={cx('inline-flex items-center px-2 py-0.5 text-xs font-medium', colors, className)}>
      {children}
    </span>
  );
}
