// components/decisioning/DC07Indicator.tsx
// DC-07 dual-satisfaction indicator per visual_system.md §5.2 lines 263–271
// (Decision 25 corollary).
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §5.2 lines 263–271 — DC-07 dual-satisfaction indicator: "Both halves
//     visible, both checked. Don't collapse into a single status chip. The
//     dual visibility is the credibility moment — examiners want to see both
//     halves verified."
//   Decision 25 corollary — DC-07 (NPC Advisory 2024-04) is the dual-rule:
//     half 1 = structured-record (rule appears in rules_fired), half 2 =
//     prose-level (substantive audit_trail text).
//   PRIMARY_PROMPT.md §4.6 — DC-07 contract: dual satisfaction required.
//   Amendment 4 — _dc07_structured_record + _dc07_prose flags are written by
//     normalizePass2 (lib/schemas/personaAdapters.ts). The locked persona JSON
//     does NOT carry these flags; if a future refactor bypasses normalizePass2
//     and feeds raw JSON, both halves silently fall back to false. AuditPanel
//     composite test guards this regression (dual-assertion pattern).
//
// COMPOSITION: two Chip instances rendered side-by-side, one per half. status
// derives from the boolean prop: true → PASS (success green), false → FAIL
// (violation red). The chips themselves don't know they belong to a DC-07
// indicator — composition-layer trust boundary per the Batch 6 synthesis
// doc: AuditPanel maps boolean halves to chip statuses; Chip primitive
// renders.
//
// LABEL TEXT: spec text per §5.2 lines 267–268 — "structured-record" and
// "prose-level" with parenthetical hints. Preserves spec literal vocabulary
// rather than reader-friendly paraphrase.

import { Chip } from '@/components/primitives/Chip';

interface DC07IndicatorProps {
  structuredRecord: boolean;
  prose: boolean;
}

export function DC07Indicator({ structuredRecord, prose }: DC07IndicatorProps) {
  return (
    <div className="space-y-3">
      <h3 className="font-mono text-sm text-text-secondary">
        DC-07 — NPC Advisory 2024-04 dual satisfaction
      </h3>
      <div className="flex flex-wrap items-center gap-x-6 gap-y-3">
        <div className="flex items-center gap-2">
          <Chip status={structuredRecord ? 'PASS' : 'FAIL'}>structured-record</Chip>
          <span className="text-xs text-text-tertiary">(rule appears in rules_fired)</span>
        </div>
        <div className="flex items-center gap-2">
          <Chip status={prose ? 'PASS' : 'FAIL'}>prose-level</Chip>
          <span className="text-xs text-text-tertiary">(substantive audit_trail text)</span>
        </div>
      </div>
    </div>
  );
}
