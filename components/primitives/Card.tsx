// components/primitives/Card.tsx
// Card surface primitive per visual_system.md §5 component constraints,
// extended with Batch 12 product-polish variants.
//
// Variants:
//   - elevated (default) : white surface, soft shadow (sm), warm-grey border
//   - recessed           : warm-grey surface, no shadow (§5.4 side-box treatment)
//   - hero               : warm-cream surface, slightly more padding, soft shadow
//                          (sm); reserved for hero/feature surfaces (Screen 1
//                          headline band, RecommendationCard)
//
// The shadow on `elevated` is the most consequential Batch 12 deviation
// from the prior flat-card discipline — adds editorial depth without
// crossing into consumer-app drop-shadow territory. Token values live in
// globals.css (`--shadow-card-sm` / `--shadow-card-md`) and harmonize with
// the typography palette via low-alpha text-primary tone.
//
// `interactive` prop opts a card into a hover-lift treatment (shadow goes
// sm → md). Used by clickable cards (persona cards, "Enter your own"
// tile); read-only cards leave it off.
//
// className prop is the composition-layer override hatch — positioning,
// margin, width constraints, per-context surface overrides.

import type { ReactNode } from 'react';
import { cx } from '@/lib/ui/classnames';

interface CardProps {
  variant?: 'elevated' | 'recessed' | 'hero';
  interactive?: boolean;
  className?: string;
  children: ReactNode;
}

const SURFACE_CLASSES: Record<Required<CardProps>['variant'], string> = {
  elevated: 'bg-surface-elevated border border-border-default',
  recessed: 'bg-surface-recessed border border-border-default',
  hero: 'bg-surface-warm border border-border-default',
};

// Soft shadow per variant. Recessed cards stay flat (they sit INSIDE other
// surfaces and don't need depth). Elevated + hero carry the soft shadow.
const SHADOW_CLASSES: Record<Required<CardProps>['variant'], string> = {
  elevated: 'shadow-[var(--shadow-card-sm)]',
  recessed: '',
  hero: 'shadow-[var(--shadow-card-sm)]',
};

const INTERACTIVE_CLASSES =
  'transition-shadow duration-150 hover:shadow-[var(--shadow-card-md)]';

const PADDING_CLASSES: Record<Required<CardProps>['variant'], string> = {
  elevated: 'p-6',
  recessed: 'p-6',
  hero: 'p-8',
};

export function Card({
  variant = 'elevated',
  interactive = false,
  className,
  children,
}: CardProps) {
  return (
    <div
      className={cx(
        PADDING_CLASSES[variant],
        SURFACE_CLASSES[variant],
        SHADOW_CLASSES[variant],
        interactive && INTERACTIVE_CLASSES,
        className,
      )}
    >
      {children}
    </div>
  );
}
