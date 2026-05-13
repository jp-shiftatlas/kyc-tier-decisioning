// components/decisioning/SeverityStrip.tsx
// Severity counts strip per visual_system.md §5.2 line 273.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   visual_system.md §5.2 line 273 — "Severity strip: three counts, horizontal
//     row, labels critical / material / quality. PASS clean shows 0 / 0 / 0."
//   §2 token usage — --status-warning is for quality flags only (line 85),
//     --violation-primary for material/critical contexts; numeric counts here
//     use --text-primary (neutral display) and --text-tertiary (labels). The
//     spec does not name a per-category color treatment for the strip itself;
//     the counts are read literally without color encoding.
//
// COMPOSITION: composes TabularNumber for digit-stable count display so the
// three counts align in their column positions even when one is double-digit.

import { TabularNumber } from '@/components/primitives/TabularNumber';

interface SeverityStripProps {
  counts: {
    critical: number;
    material: number;
    quality: number;
  };
}

export function SeverityStrip({ counts }: SeverityStripProps) {
  return (
    <div className="flex gap-6 font-sans text-sm">
      <div className="flex items-baseline gap-2">
        <span className="text-text-tertiary">critical</span>
        <TabularNumber value={String(counts.critical)} className="text-text-primary" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-text-tertiary">material</span>
        <TabularNumber value={String(counts.material)} className="text-text-primary" />
      </div>
      <div className="flex items-baseline gap-2">
        <span className="text-text-tertiary">quality</span>
        <TabularNumber value={String(counts.quality)} className="text-text-primary" />
      </div>
    </div>
  );
}
