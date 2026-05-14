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

  // Decision 41e regression guard — stability within (check_type, rule_id) tie
  // groups. JS Array.prototype.sort is stable (ES2019+); sortChecks relies on
  // it via `[...checks].sort()`. This test fails loudly if a future refactor
  // swaps in an unstable sort or a comparator that perturbs equal pairs.
  it('is stable within (check_type, rule_id) tie groups — equal pairs preserve input order', () => {
    const checks = [
      { check_type: 'rule_firing', rule_id: 'TE-02', evidence_note: 'first' },
      { check_type: 'rule_firing', rule_id: 'TE-02', evidence_note: 'second' },
      { check_type: 'rule_firing', rule_id: 'TE-02', evidence_note: 'third' },
    ];
    const sorted = sortChecks(checks as any);
    expect(sorted.map((c) => (c as { evidence_note: string }).evidence_note)).toEqual([
      'first',
      'second',
      'third',
    ]);
  });

  // Decision 41e + Decisions 28/29 byte-frozen discipline — sortChecks is pure:
  // deterministic output, a fresh array each call, no input mutation. The
  // byte-frozen discipline (render-time sort, never source-edit sort) made
  // into a code-level guard.
  it('is pure — deterministic output, a new array each call, no input mutation', () => {
    const checks = [
      { check_type: 'consistency', rule_id: 'X' },
      { check_type: 'hard_rule_floor', rule_id: 'A' },
    ];
    const snapshot = JSON.stringify(checks);
    const out1 = sortChecks(checks as any);
    const out2 = sortChecks(checks as any);
    // Deterministic: same input → deep-equal output.
    expect(out1).toEqual(out2);
    // A new array each call — never the input, never a shared reference.
    expect(out1).not.toBe(checks);
    expect(out2).not.toBe(checks);
    expect(out1).not.toBe(out2);
    // Input unmutated.
    expect(JSON.stringify(checks)).toBe(snapshot);
  });
});
