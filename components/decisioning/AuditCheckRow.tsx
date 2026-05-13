// components/decisioning/AuditCheckRow.tsx
// Per-check audit row per visual_system.md §5.2 lines 241–245.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §5.2 lines 241–245 — "Per-check rendering:
//     - Rule ID in mono on the left
//     - Status chip: PASS (success green), FAIL (violation red), QUALITY
//       (warning amber)
//     - Brief evidence note in --font-sans --text-sm
//     - Regulatory citation in --text-tertiary --text-xs"
//   §2 token usage — Chip status flows through the primitive's spec-named
//     three (PASS / FAIL / QUALITY) per §5.2 line 243.
//
// STATUS MAPPING (composition-layer trust boundary per Batch 6 synthesis doc):
// per-check status is lowercase 'pass' / 'fail' / 'quality' in the locked
// persona JSON (verified at lib/schemas/pass2.ts line 28). Chip primitive's
// Status union is uppercase. Composition layer maps; primitive trusts. Use
// of isPass() helper from personaAdapters is unnecessary here because the
// schema constrains the values to a closed three-element set.
//
// "Brief evidence note" per §5.2 line 244 — the locked persona JSON's
// evidence_note IS the full content (verified during dispatch). No
// chevron disclosure expansion; no truncate-with-tooltip; the brief is
// the full.

import type { AuditCheck } from '@/lib/schemas/pass2';
import { Chip } from '@/components/primitives/Chip';

interface AuditCheckRowProps {
  check: AuditCheck;
}

function statusToChip(s: 'pass' | 'fail' | 'quality'): 'PASS' | 'FAIL' | 'QUALITY' {
  if (s === 'pass') return 'PASS';
  if (s === 'fail') return 'FAIL';
  return 'QUALITY';
}

export function AuditCheckRow({ check }: AuditCheckRowProps) {
  const chipStatus = statusToChip(check.status);
  return (
    <li className="grid grid-cols-[auto_auto_1fr_auto] items-start gap-3 border-b border-border-subtle py-2">
      <span className="font-mono text-sm text-text-secondary">{check.rule_id ?? '—'}</span>
      <Chip status={chipStatus}>{chipStatus}</Chip>
      <span className="font-sans text-sm text-text-primary">{check.evidence_note ?? ''}</span>
      <span className="font-mono text-xs text-text-tertiary">{check.regulatory_citation ?? ''}</span>
    </li>
  );
}
