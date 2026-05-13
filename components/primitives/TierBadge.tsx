// components/primitives/TierBadge.tsx
// TierBadge primitive per visual_system.md §5.1 line 221 + PRIMARY_PROMPT.md §6.1.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   visual_system.md §5.1 line 221 — "Tier badge: large, slate-blue accent
//     background (--accent-subtle-bg) with --accent-deep text, mono font for
//     the tier label."
//   PRIMARY_PROMPT.md §6.1 line 300 — "Recommended tier with prominent visual
//     treatment (slate-blue accent on tier badge)."
//   docs/batch-6-primitive-bindings.md Section 1 line 42 — "TierBadge is a
//     separate Batch 7 primitive — NOT a chip variant. It shares the
//     --accent-subtle-bg + --accent-deep color family with variant='accent'
//     chips but differs in size, font (mono), and content (tier label)."
//   §2 tokens — --accent-subtle-bg, --accent-deep, --font-mono.
//   §4 padding system — spec-aligned hero-element padding (px-3 py-1.5;
//     ratified in commit body — larger than Chip's px-2 py-0.5 to honor the
//     §5.1 "large" directive, smaller than Card's p-6 / 24px because this is
//     a badge nested inside a Card, not a Card surface itself).
//
// COMPOSITION-FITNESS RULE (preserved from Batch 6 synthesis doc):
// TierBadge shares the --accent-subtle-bg + --accent-deep color family with
// Chip variant="accent" but differs in three dimensions:
//   - Size:    TierBadge is large per §5.1 hero treatment; Chip is regular size.
//   - Font:    TierBadge is mono (--font-mono); Chip is sans (--font-sans).
//   - Content: TierBadge renders the tier label (SDD / Standard / EDD); Chip
//              variant="accent" renders arbitrary status / category text.
// A future composer reaching for Chip variant="accent" to display a tier
// should encounter this docstring rule and switch to TierBadge.
//
// === TIER PROP UNION — three CDD eligibility tiers (disposition B) ===
//
// Tier prop union encodes the three CDD eligibility tiers per visual_system.md
// §5.1 + ruleset Tier Decision Logic. The ruleset names a fourth outcome
// (Decline, ES-04 sanctions hit) which is not a tier-badge surface in the
// spec corpus — Decline routes to a different demo branch (sanctions hit →
// STR filing per ruleset_v1.md line 93, prompts/pass_1_system_prompt.md
// Decision Logic point 1, 05_PASS_1_DESIGN.md §2 JSON contract).
//
// Schema drift note: lib/schemas/pass1.ts:21 currently declares
// recommended_tier as z.enum(['SDD', 'Standard', 'EDD', 'Hold']) — the
// fourth value is wrong (should be 'Decline' per the canonical spec corpus).
// This drift is captured in the Build Findings Log at Batch 8 close as a
// Batch 1 implementation defect; schema correction is queued. TierBadge's
// three-value union forces a compile-time conversation at any future call
// site where a Pass 1 with recommended_tier === 'Decline' (post-schema-fix)
// or recommended_tier === 'Hold' (current schema bug) tries to compose
// TierBadge — surfacing the schema-vs-spec drift exactly where it would
// matter, per Batch 6 TypeScript-union-enforcement-of-spec-named-
// enumerations methodology.
//
// === TRUST BOUNDARY ===
// TypeScript enforces the three-value union at compile time at call sites;
// the primitive itself does no runtime enum-validation. If a future caller
// widens the type (e.g., `as 'SDD'`) to pass an unknown string, the primitive
// renders it without error. The schema layer is authoritative for tier
// validity; TierBadge just renders.
//
// === REUSABILITY FRAMING (forward-looking, not currently required) ===
// The primitive admits standalone use if a future composition needs a tier
// badge outside RecommendationCard. No such surface exists in the locked spec
// at Batch 8 / Batch 9 / Batch 10. Transitive consumers (Override modal
// "before" rendering at Decision 36c; Batch 9 re-audit / cap-reached
// surfaces) consume RecommendationCard whole, not TierBadge directly.
//
// Spec-silence regression guards (Card/Chip/Button/Tooltip/Modal/Skeleton/
// ChevronDisclosure pattern, extended for TierBadge):
//   - no border-radius (institutional register; Card/Chip discipline)
//   - no hover utilities (badges are read, not pressed)
//   - no transition / animate utilities (badges appear; they don't motion)

import { cx } from '@/lib/ui/classnames';

type Tier = 'SDD' | 'Standard' | 'EDD';

interface TierBadgeProps {
  tier: Tier;
  className?: string;
}

export function TierBadge({ tier, className }: TierBadgeProps) {
  return (
    <span
      className={cx(
        'inline-flex items-center px-3 py-1.5',
        'bg-accent-subtle-bg text-accent-deep',
        'font-mono text-lg',
        className,
      )}
    >
      {tier}
    </span>
  );
}
