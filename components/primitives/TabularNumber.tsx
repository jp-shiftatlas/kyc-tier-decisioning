// components/primitives/TabularNumber.tsx
// TabularNumber primitive per visual_system.md §3 type discipline.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §3 type discipline — tabular figures for numeric values that align in
//     vertical columns. Multiple §5 references all consume this primitive:
//       - §5.1 line 222 — "Risk score: tabular-figure --text-xl"
//       - §5.2 line 237 — "Elapsed-time counter ... with tabular figures"
//       - §5.2 line 259 — "tabular figures for the PHP amounts"
//       - §5.6 line 396 — "tabular figures, format-on-blur with thousand
//                          separators ('PHP 850,000')"
//   §2 tokens / globals.css — --font-numeric (paired with tabular-nums utility
//     per globals.css comment) provides Inter as the numeric font family;
//     `tabular-nums` utility (CSS: font-variant-numeric: tabular-nums) locks
//     digit widths so adjacent numbers align in vertical columns.
//
// USE-CASE CONSTRAINT: this primitive renders numeric values that need
// tabular alignment — PHP amounts, elapsed-time counters, risk scores. NOT
// for prose with embedded numbers (e.g., "11 years with bank" in the
// customer profile prose). The tabular-nums treatment makes digits all the
// same width, which is the right typographic choice for column alignment
// but the wrong choice for inline prose.
//
// PRIMITIVE-VS-UTILITY JUSTIFICATION: this is a thin semantic wrapper around
// `font-numeric tabular-nums` className. Wrapping has documentary value:
// `<TabularNumber value="850,000" />` reads as "this is a number that needs
// tabular alignment with adjacent numbers" — semantic intent visible at the
// call site. Inline `<span className="font-numeric tabular-nums">850,000</span>`
// is mechanically equivalent but loses the semantic signal. Three known
// Batch 7 consumers (audit panel elapsed counter, risk score, threshold
// verification block) each benefit from the semantic wrapper.
//
// VARIANT SET: zero — `value` and `className`. No size/weight/color props.
// Composition layer sets text size via className (text-xl for risk score,
// text-sm for elapsed counter, etc.).

import { cx } from '@/lib/ui/classnames';

interface TabularNumberProps {
  value: string;
  className?: string;
}

export function TabularNumber({ value, className }: TabularNumberProps) {
  return <span className={cx('font-numeric tabular-nums', className)}>{value}</span>;
}
