// components/primitives/Skeleton.tsx
// Skeleton primitive per visual_system.md §5.8 line 434.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §5.8 line 434 — "Skeleton placeholders in --surface-recessed for the
//                     panel content"
//   §5.8 line 438 — "Same visual pattern as persona playback for the loading
//                     bar and skeletons" (live generation reuses this primitive)
//   §6 line 464  — "No animation for animation's sake" — load-bearing for
//                    skeleton specifically. Consumer-app skeletons shimmer,
//                    pulse, or fade; institutional-register skeletons are
//                    static placeholder boxes signaling "content is loading"
//                    without performance theater.
//   §2 tokens   — --surface-recessed (placeholder background)
//
// PLAN-RECIPE DEVIATIONS (substantive):
//   - dropped `animate-pulse` — consumer-app pulse shimmer; spec at §6 line
//     464 is the load-bearing constraint. Static placeholder is the
//     institutional read.
//   - dropped `rounded` — Card/Chip/Button/Tooltip/Modal spec-silence-as-
//     discipline pattern applied
//
// VARIANT SET: zero — no size, no shape, no animation prop. Composition
// layer sets dimensions via className (w-full, h-4, etc.). Single-purpose
// placeholder.
//
// Spec-silence regression guards (CRITICAL for Skeleton — JP flagged as
// highest AI-slop drift surface in Batch 6):
//   - no animate-* (no pulse, no shimmer, no ping)
//   - no border-radius
//   - no gradient classes (no bg-gradient-*, no from-/to-)
//   - no transition or opacity transitions (no transition-opacity, etc.)
// Static placeholder. The institutional contract is "loading state visible,
// no performance theater."

import { cx } from '@/lib/ui/classnames';

interface SkeletonProps {
  className?: string;
}

export function Skeleton({ className }: SkeletonProps) {
  return <div data-testid="skeleton" className={cx('bg-surface-recessed', className)} />;
}
