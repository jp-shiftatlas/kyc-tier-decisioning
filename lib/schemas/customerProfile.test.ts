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

  // Decision 37b guard 1 — min-3 still applies after case-normalization
  it('rejects occupation_type free text shorter than 3 chars after case-normalization (Decision 37b guard 1)', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    // "Xy" → trim → "Xy" → lowercase "xy" → no enum match → free-text branch → min(3) fails
    expect(CustomerProfileSchema.safeParse({ ...maria!.profile, occupation_type: 'Xy' }).success).toBe(false);
  });

  // Decision 37b guard 2 — case-insensitive enum match normalizes to canonical enum casing
  it('normalizes case-variant enum input to canonical enum value (Decision 37b guard 2)', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const result = CustomerProfileSchema.safeParse({ ...maria!.profile, occupation_type: 'Employed' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.occupation_type).toBe('employed');
  });

  it('preserves canonical enum casing for uppercase enum values (Decision 37b guard 2)', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    // profileFormConfig.occupation_type.options includes 'OFW' (uppercase) — input "ofw" must
    // normalize back to 'OFW' so the enum branch accepts it.
    const result = CustomerProfileSchema.safeParse({ ...maria!.profile, occupation_type: 'ofw' });
    expect(result.success).toBe(true);
    if (result.success) expect(result.data.occupation_type).toBe('OFW');
  });

  // Decision 37b guard 3 — trim + case-normalize produce identical free-text parsed values
  it('trim+lowercase produces identical parsed values for spacing/case variants (Decision 37b guard 3)', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const padded = CustomerProfileSchema.safeParse({ ...maria!.profile, occupation_type: '  Software Engineer  ' });
    const plain = CustomerProfileSchema.safeParse({ ...maria!.profile, occupation_type: 'software engineer' });
    expect(padded.success).toBe(true);
    expect(plain.success).toBe(true);
    if (padded.success && plain.success) {
      expect(padded.data.occupation_type).toBe('software engineer');
      expect(plain.data.occupation_type).toBe('software engineer');
      expect(padded.data.occupation_type).toBe(plain.data.occupation_type);
    }
  });
});
