// components/decisioning/ArchitectureStrip.tsx
// Static positioning artifact per Decision 42 / visual_system.md §5.4 /
// PRIMARY_PROMPT.md §6.4.
//
// Five-box horizontal strip rendering the augmentation context:
//   Identity Verification › AML Screening › [Reasoning Layer] › Case Management
//   › Core Banking
//
// The middle box ("Reasoning Layer") is visually emphasized in --accent-primary
// per §5.4 line 309. The four flanking boxes use --surface-recessed per §5.4
// line 310 (Card primitive's `recessed` variant — synthesis doc Card composition
// obligation #2).
//
// Below the strip: parallel two-line production annotation centered horizontally,
// scoped to the entire pipeline (not just the middle box) per §5.4 line 321.
// Answers the production-hardening / DPA / data-residency objection without
// prompting (Decision 13, PRIMARY_PROMPT.md success criterion #2).
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   Decision 13 — Single-model architecture for v1; multi-model audit on Bedrock
//                 in production. The positioning narrative made visible.
//   Decision 42 — Static positioning artifact. NO interactive disclosure:
//                 no click-to-expand, no hover state, no popover. The annotation
//                 does the "what's inside" work.
//   Amendment 5 — Fragment-key pattern for the box+chevron iteration. Don't ship
//                 the missing-key warning.
//   visual_system.md §5.4 lines 293–323:
//     - Middle box: --accent-primary bg, --text-inverse text
//     - Flanking boxes: --surface-recessed bg, --text-primary text,
//       --border-default border
//     - Chevrons in --text-tertiary (typographic, not iconographic)
//     - Mobile (<768px): vertical stack, chevrons become ↓
//     - Production annotation: --text-tertiary labels, --text-secondary body,
//       --font-sans --text-sm
//   PRIMARY_PROMPT.md §6.4 — same spec as visual_system.md §5.4; framed as
//                 positioning artifact, not workflow diagram.
//
// COMPOSITION: composes Card primitive only — flanking variants use `recessed`,
// middle uses default variant with className overriding bg + text per the
// composition trust boundary (synthesis doc Section 1 Card obligation #2).
// No Chip, no Button, no Tooltip, no ChevronDisclosure, no TabularNumber. The
// chevron separators are typographic glyph characters (› / ↓), NOT SVG icon
// components — standing instruction #4 (no decorative icons) honored.
//
// SPEC-POSITIVE PROHIBITIONS (Decision 42 explicitly rejected):
//   - click-to-expand on middle box → no onClick handler anywhere in strip
//   - hover-to-expand on middle box → no hover: utility classes
//   - always-expanded second tier "tell me more" content → strip is the strip,
//     no expanded subtree
// These prohibitions are enforced as does-not-contain regression guards at the
// test layer per the Tooltip/Modal spec-positive-prohibition pattern.
//
// Accessibility: chevron spans carry aria-hidden="true" so screen readers
// announce the box-label sequence ("Identity Verification, AML Screening,
// Reasoning Layer, ...") without typographic-noise interpolation.

import { Fragment } from 'react';
import { Card } from '@/components/primitives/Card';

interface BoxSpec {
  label: string;
  emphasis: 'flanking' | 'middle';
}

const STRIP_BOXES: readonly BoxSpec[] = [
  { label: 'Identity Verification', emphasis: 'flanking' },
  { label: 'AML Screening', emphasis: 'flanking' },
  { label: 'Reasoning Layer', emphasis: 'middle' },
  { label: 'Case Management', emphasis: 'flanking' },
  { label: 'Core Banking', emphasis: 'flanking' },
];

export function ArchitectureStrip() {
  return (
    <section data-testid="architecture-strip" className="space-y-6">
      <div className="flex flex-col items-stretch gap-3 md:flex-row md:items-center md:justify-between md:gap-2">
        {STRIP_BOXES.map((box, i) => (
          <Fragment key={`arch-${box.label}`}>
            {box.emphasis === 'middle' ? (
              <Card className="bg-accent-primary text-text-inverse text-center font-sans">
                {box.label}
              </Card>
            ) : (
              <Card variant="recessed" className="text-center font-sans">
                {box.label}
              </Card>
            )}
            {i < STRIP_BOXES.length - 1 && (
              <>
                <span aria-hidden="true" className="hidden text-text-tertiary md:inline">
                  ›
                </span>
                <span aria-hidden="true" className="inline text-center text-text-tertiary md:hidden">
                  ↓
                </span>
              </>
            )}
          </Fragment>
        ))}
      </div>
      <div className="text-center font-sans text-sm">
        <div>
          <span className="text-text-tertiary">v1 demo: </span>
          <span className="text-text-secondary">single-model with independent re-derivation.</span>
        </div>
        <div>
          <span className="text-text-tertiary">Production: </span>
          <span className="text-text-secondary">multi-model audit on Bedrock with redacted input.</span>
        </div>
      </div>
    </section>
  );
}
