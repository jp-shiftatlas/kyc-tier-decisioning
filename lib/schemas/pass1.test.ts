import { describe, it, expect } from 'vitest';
import { Pass1OutputSchema } from './pass1';
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
