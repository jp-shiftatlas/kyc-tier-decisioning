import { describe, it, expect } from 'vitest';
import { normalizePass1, normalizePass2 } from './personaAdapters';
import personasData from '@/data/personas.json';

describe('normalizePass1 (pure)', () => {
  it('rewrites "escalation" category to "escalation_triggers" (Carlos / Persona C)', () => {
    const carlos = personasData.personas.find((p: any) => p.id === 'carlos');
    const before = carlos!.pass_1.rules_fired.find((r: any) => r.category === 'escalation');
    if (before) {
      const normalized = normalizePass1(carlos!.pass_1);
      expect(normalized.rules_fired.every((r: any) => r.category !== 'escalation')).toBe(true);
      expect(normalized.rules_fired.some((r: any) => r.category === 'escalation_triggers')).toBe(true);
    }
  });

  it('is a no-op for canonical Pass 1 (Maria)', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const normalized = normalizePass1(maria!.pass_1);
    expect(normalized.rules_fired).toEqual(maria!.pass_1.rules_fired);
  });

  it('is idempotent', () => {
    const carlos = personasData.personas.find((p: any) => p.id === 'carlos');
    const once = normalizePass1(carlos!.pass_1);
    const twice = normalizePass1(once);
    expect(twice).toEqual(once);
  });
});

describe('normalizePass2 (pure)', () => {
  it('maps audit_generated_at → generated_at (Persona C)', () => {
    const c = personasData.personas.find((p: any) => p.id === 'persona_c');
    if ((c!.pass_2 as any).audit_generated_at) {
      const normalized = normalizePass2(c!.pass_2);
      expect(normalized.generated_at).toBe((c!.pass_2 as any).audit_generated_at);
    }
  });

  it('maps target_violations → target_check_ids', () => {
    const c = personasData.personas.find((p: any) => p.id === 'persona_c');
    if ((c!.pass_2 as any).target_violations) {
      const normalized = normalizePass2(c!.pass_2);
      expect(normalized.target_check_ids).toEqual((c!.pass_2 as any).target_violations);
    }
  });

  it('defaults regeneration_scope to "none" when null', () => {
    const c = personasData.personas.find((p: any) => p.id === 'persona_c');
    const normalized = normalizePass2(c!.pass_2);
    expect(normalized.regeneration_scope).toBe('none');
  });

  it('is idempotent', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const once = normalizePass2(maria!.pass_2);
    const twice = normalizePass2(once);
    expect(twice).toEqual(once);
  });

  it('emits computed DC-07 dual-satisfaction flags (per plan amendment #4)', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const normalized = normalizePass2(maria!.pass_2);
    expect(typeof normalized._dc07_structured_record).toBe('boolean');
    expect(typeof normalized._dc07_prose).toBe('boolean');
  });
});
