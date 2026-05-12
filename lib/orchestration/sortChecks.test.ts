import { describe, it, expect } from 'vitest';
import { sortChecks, CANONICAL_CHECK_TYPE_ORDER } from './sortChecks';
import { loadPersona } from '@/lib/schemas/personaAdapters';

describe('sortChecks', () => {
  it('sorts by check_type in canonical order', () => {
    const checks = [
      { check_type: 'dc07_documentation', rule_id: 'DC-07' },
      { check_type: 'hard_rule_floor', rule_id: 'ES-02' },
      { check_type: 'numeric_threshold_verification', rule_id: 'TE-05' },
      { check_type: 'rule_firing', rule_id: 'TE-02' },
    ];
    const sorted = sortChecks(checks as any);
    expect(sorted.map((c) => c.check_type)).toEqual([
      'hard_rule_floor',
      'rule_firing',
      'numeric_threshold_verification',
      'dc07_documentation',
    ]);
  });

  it('sorts by rule_id within the same check_type', () => {
    const checks = [
      { check_type: 'rule_firing', rule_id: 'TE-05' },
      { check_type: 'rule_firing', rule_id: 'TE-01' },
      { check_type: 'rule_firing', rule_id: 'TE-02' },
    ];
    const sorted = sortChecks(checks as any);
    expect(sorted.map((c) => c.rule_id)).toEqual(['TE-01', 'TE-02', 'TE-05']);
  });

  it('is stable across all four personas without mutating the input', () => {
    for (const id of ['maria', 'carlos', 'persona_c', 'persona_d'] as const) {
      const p = loadPersona(id);
      const before = JSON.stringify(p.pass_2.checks);
      const sorted = sortChecks(p.pass_2.checks);
      // Input not mutated
      expect(JSON.stringify(p.pass_2.checks)).toBe(before);
      // Order is canonical
      for (let i = 1; i < sorted.length; i++) {
        const prev = CANONICAL_CHECK_TYPE_ORDER.indexOf(sorted[i - 1].check_type);
        const cur = CANONICAL_CHECK_TYPE_ORDER.indexOf(sorted[i].check_type);
        expect(prev).toBeLessThanOrEqual(cur);
      }
    }
  });

  it('places unknown check_types at the end (defensive)', () => {
    const sorted = sortChecks([
      { check_type: 'unknown_type', rule_id: 'X' },
      { check_type: 'hard_rule_floor', rule_id: 'A' },
    ] as any);
    expect(sorted[0].check_type).toBe('hard_rule_floor');
    expect(sorted[sorted.length - 1].check_type).toBe('unknown_type');
  });
});
