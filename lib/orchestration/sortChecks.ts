// lib/orchestration/sortChecks.ts
// Render-time canonical check ordering per Decision 41 Path X (PRIMARY_PROMPT.md §4.11).
// Locked persona JSON stays byte-frozen with tail-end orderings; sort normalizes at render.

import type { AuditCheck } from '@/lib/schemas/pass2';

export const CANONICAL_CHECK_TYPE_ORDER = [
  'hard_rule_floor',
  'rule_firing',
  'numeric_threshold_verification',
  'score_arithmetic',
  'score_band_mapping',
  'decision_basis_consistency',
  'pattern_substance',
  'dc07_documentation',
  'register_compliance',
  'consistency',
] as const;

const orderIndex = (t: string): number => {
  const i = CANONICAL_CHECK_TYPE_ORDER.indexOf(t as any);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
};

export function sortChecks(checks: readonly AuditCheck[]): AuditCheck[] {
  return [...checks].sort((a, b) => {
    const ta = orderIndex(a.check_type);
    const tb = orderIndex(b.check_type);
    if (ta !== tb) return ta - tb;
    const ra = (a.rule_id ?? '').toString();
    const rb = (b.rule_id ?? '').toString();
    return ra.localeCompare(rb);
  });
}
