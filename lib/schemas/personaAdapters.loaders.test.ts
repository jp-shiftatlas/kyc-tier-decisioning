import { describe, it, expect } from 'vitest';
import { loadPersona, listPersonas } from './personaAdapters';

describe('loadPersona', () => {
  it('returns a fully-validated, normalized persona', () => {
    const p = loadPersona('maria');
    expect(p.profile.customer_reference).toContain('Maria');
    expect(p.pass_1.decision.recommended_tier).toBe('Standard');
    expect(p.pass_2.overall_status).toMatch(/PASS/);
  });

  it('throws on unknown persona id', () => {
    expect(() => loadPersona('unknown' as any)).toThrow();
  });

  it('preserves the DC-07 dual-satisfaction flags computed by normalizePass2', () => {
    const p = loadPersona('maria');
    expect((p.pass_2 as any)._dc07_structured_record).toBe(true);
    expect((p.pass_2 as any)._dc07_prose).toBe(true);
  });
});

describe('listPersonas', () => {
  it('lists all four persona id/name/descriptor tuples', () => {
    const list = listPersonas();
    expect(list).toHaveLength(4);
    expect(list.map((p) => p.id)).toEqual(['maria', 'carlos', 'persona_c', 'persona_d']);
  });
});
