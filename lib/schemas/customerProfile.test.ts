import { describe, it, expect } from 'vitest';
import { CustomerProfileSchema } from './customerProfile';
import { normalizeWireVariants } from './personaAdapters';
import personasData from '@/data/personas.json';

describe('CustomerProfileSchema', () => {
  it('validates Maria profile', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    expect(CustomerProfileSchema.safeParse(normalizeWireVariants(maria!.profile)).success).toBe(true);
  });

  it('validates Carlos profile', () => {
    const carlos = personasData.personas.find((p: any) => p.id === 'carlos');
    expect(CustomerProfileSchema.safeParse(normalizeWireVariants(carlos!.profile)).success).toBe(true);
  });

  it('validates persona_c profile', () => {
    const c = personasData.personas.find((p: any) => p.id === 'persona_c');
    expect(CustomerProfileSchema.safeParse(normalizeWireVariants(c!.profile)).success).toBe(true);
  });

  it('validates persona_d profile', () => {
    const d = personasData.personas.find((p: any) => p.id === 'persona_d');
    expect(CustomerProfileSchema.safeParse(normalizeWireVariants(d!.profile)).success).toBe(true);
  });

  it('rejects expected_monthly_volume_php = 0', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const bad = { ...maria!.profile, expected_monthly_volume_php: 0 };
    expect(CustomerProfileSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts composite source_of_funds wire string', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const composite = { ...maria!.profile, source_of_funds: 'mixed (salary + inheritance)' };
    expect(CustomerProfileSchema.safeParse(composite).success).toBe(true);
  });

  it('accepts occupation_type as enum value', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    expect(CustomerProfileSchema.safeParse({ ...maria!.profile, occupation_type: 'employed' }).success).toBe(true);
  });

  it('accepts occupation_type as free text (≥ 3 chars)', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    expect(CustomerProfileSchema.safeParse({ ...maria!.profile, occupation_type: 'chef de partie' }).success).toBe(true);
  });

  it('rejects occupation_type free text shorter than 3 chars', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    expect(CustomerProfileSchema.safeParse({ ...maria!.profile, occupation_type: 'xy' }).success).toBe(false);
  });
});
