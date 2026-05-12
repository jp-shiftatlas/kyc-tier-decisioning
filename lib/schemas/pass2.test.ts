import { describe, it, expect } from 'vitest';
import { Pass2OutputSchema } from './pass2';
import { normalizePass2 } from './personaAdapters';
import personasData from '@/data/personas.json';

describe('Pass2OutputSchema', () => {
  for (const id of ['maria', 'carlos', 'persona_c', 'persona_d']) {
    it(`validates ${id} Pass 2 after normalization`, () => {
      const p = personasData.personas.find((x: any) => x.id === id);
      const normalized = normalizePass2(p!.pass_2);
      const result = Pass2OutputSchema.safeParse(normalized);
      if (!result.success) console.error(result.error.issues);
      expect(result.success).toBe(true);
    });
  }

  it('accepts numeric_threshold_verification check shape', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const normalized = normalizePass2(maria!.pass_2);
    const ntv = normalized.checks.find((c: any) => c.check_type === 'numeric_threshold_verification');
    expect(ntv).toBeDefined();
    expect(ntv?.profile_value).toBeDefined();
    expect(ntv?.rule_threshold).toBeDefined();
    expect(ntv?.comparison_result).toBeDefined();
  });

  it('marks DC-07 check', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const normalized = normalizePass2(maria!.pass_2);
    expect(normalized.checks.some((c: any) => c.rule_id === 'DC-07')).toBe(true);
  });
});
