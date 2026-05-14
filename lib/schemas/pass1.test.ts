import { describe, it, expect } from 'vitest';
import { Pass1OutputSchema, DecisionSchema } from './pass1';
import { normalizePass1 } from './personaAdapters';
import personasData from '@/data/personas.json';

describe('Pass1OutputSchema', () => {
  for (const id of ['maria', 'carlos', 'persona_c', 'persona_d']) {
    it(`validates ${id} Pass 1 after normalization`, () => {
      const p = personasData.personas.find((x: any) => x.id === id);
      const normalized = normalizePass1(p!.pass_1);
      const result = Pass1OutputSchema.safeParse(normalized);
      if (!result.success) console.error(result.error.issues);
      expect(result.success).toBe(true);
    });
  }

  it('rejects missing decisive_rule_ids', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const normalized = normalizePass1(maria!.pass_1);
    const bad = { ...normalized, decision: { ...normalized.decision, decisive_rule_ids: undefined } };
    expect(Pass1OutputSchema.safeParse(bad).success).toBe(false);
  });
});

// Pass1EnumCanon — institutionalizes the consumption-end discipline that
// surfaced Findings 9, 10, and 19 at Batch 8 dispatch-prep spec walks. The
// three Pass 1 enum unions are asserted verbatim against their canonical
// values (05_PASS_1_DESIGN.md §2 contract + 02_RULESET_v1.md). A future schema
// edit that drifts from the canonical contract — re-adding a Batch-1-style
// drift value ('Hold', 'multi_decisive_rule') or dropping a canonical value —
// fails HERE at the schema-test boundary rather than at a dispatch-prep walk
// batches later. Deep-equality makes the guard bidirectional: it catches both
// removed canonical values and re-added drift values.
describe('Pass1EnumCanon — schema enum unions match canonical Pass 1 contract', () => {
  it('recommended_tier matches the canonical 4-value union (Finding 9: Hold→Decline)', () => {
    // 02_RULESET_v1.md:65 (ES-04 +100 decline) + line 93 (sanctions hit → DECLINE).
    expect(DecisionSchema.shape.recommended_tier.options).toEqual([
      'SDD',
      'Standard',
      'EDD',
      'Decline',
    ]);
  });

  it('decision_basis matches the canonical 3-value union (Finding 19: multi_decisive_rule + hold were drift)', () => {
    // 05_PASS_1_DESIGN.md:70. Multiple decisive rules are handled via
    // decisive_rule_ids cardinality (Carlos: ['ES-03', 'TE-05'] with
    // decision_basis: 'hard_rule'), NOT a separate enum value.
    expect(DecisionSchema.shape.decision_basis.options).toEqual([
      'hard_rule',
      'score_based',
      'hybrid',
    ]);
  });

  it('score_band matches the canonical 3-value union (02_RULESET_v1.md:105–107)', () => {
    // score_band is z.enum(...).optional() on the risk_score object — unwrap
    // the ZodOptional to reach the enum's options.
    const scoreBand = Pass1OutputSchema.shape.risk_score.shape.score_band;
    expect(scoreBand.unwrap().options).toEqual(['0-10', '11-30', '31+']);
  });
});
