// components/primitives/Card.tsx
// Card surface primitive per visual_system.md §5 component constraints.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §2  — surface tokens (--surface-elevated, --surface-recessed) + border token
//         (--border-default warm-grey #D9D2C5)
//   §4  — whitespace discipline: "Cards have 24px internal padding minimum"
//   §5.1 / §5.5 / §5.6 — primary content cards on --surface-elevated
//   §5.4 — architecture-strip side boxes (non-middle four) on --surface-recessed
//
// Variants are surface treatments only:
//   - elevated (default): white surface for primary content (§5.1, §5.5, §5.6)
//   - recessed:           warm-grey surface for §5.4 side boxes
//
// No semantic variants (no card-success, card-warning, etc.) — composition layer
// composes meaning via content and context, not via Card props.
//
// No border-radius — institutional register (Financial Times, Economist, BSP
// annual report) uses crisp 90° corners. visual_system.md does not name a
// corner radius; per standing instruction #3, no unrequested affordance.
//
// className prop is the composition-layer override hatch — positioning, margin,
// width constraints, and per-context surface overrides (e.g., §5.4 middle
// architecture-strip box uses --accent-primary background via className).

import type { ReactNode } from 'react';
import { cx } from '@/lib/ui/classnames';

interface CardProps {
  variant?: 'elevated' | 'recessed';
  className?: string;
  children: ReactNode;
}

export function Card({ variant = 'elevated', className, children }: CardProps) {
  const surface = variant === 'recessed' ? 'bg-surface-recessed' : 'bg-surface-elevated';
  return (
    <div className={cx('border border-border-default p-6', surface, className)}>
      {children}
    </div>
  );
}
