// lib/orchestration/fieldGrouping.test.ts
import { describe, it, expect } from 'vitest';
import { groupProfileForDataFlow } from './fieldGrouping';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';

const SAMPLE: CustomerProfile = {
  customer_reference: 'M-0042',
  identity_document_type: 'PhilSys',
  residency_status: 'resident',
  customer_type: 'retail_individual',
  occupation_type: 'employed',
  source_of_funds: 'salary',
  account_purpose: 'personal_banking',
  expected_monthly_volume_php: 850000,
  pep_status: 'none',
  sanctions_screening: 'clear',
  high_risk_jurisdiction_connection: 'clear',
  adverse_media: 'none',
  years_with_bank: '5+',
};

describe('groupProfileForDataFlow', () => {
  it('returns four subgroups in canonical order', () => {
    const groups = groupProfileForDataFlow(SAMPLE);
    expect(groups.map((g) => g.title)).toEqual([
      'Customer identity',
      'Account & behavior',
      'Risk indicators',
      'Relationship',
    ]);
  });

  it('Customer identity + Account & behavior + Relationship map to Onboarding', () => {
    const groups = groupProfileForDataFlow(SAMPLE);
    expect(groups[0].upstream).toBe('onboarding');
    expect(groups[1].upstream).toBe('onboarding');
    expect(groups[3].upstream).toBe('onboarding');
  });

  it('Risk indicators maps to AML Screening upstream', () => {
    const groups = groupProfileForDataFlow(SAMPLE);
    expect(groups[2].upstream).toBe('aml-screening');
  });

  it('formats PHP volume with thousand-separator', () => {
    const groups = groupProfileForDataFlow(SAMPLE);
    const volumeRow = groups[1].fields.find((f) => f.label === 'Expected monthly volume');
    expect(volumeRow?.value).toBe('PHP 850,000');
  });

  it('humanizes snake_case enum values', () => {
    const groups = groupProfileForDataFlow(SAMPLE);
    const customerType = groups[0].fields.find((f) => f.label === 'Customer type');
    expect(customerType?.value).toBe('Retail individual');
  });

  it('preserves PhilSys casing (not mangled)', () => {
    const groups = groupProfileForDataFlow(SAMPLE);
    const doc = groups[0].fields.find((f) => f.label === 'Identity document');
    expect(doc?.value).toBe('PhilSys');
  });

  it('uses Title Case first letter on every field label', () => {
    const groups = groupProfileForDataFlow(SAMPLE);
    for (const g of groups) {
      for (const f of g.fields) {
        expect(f.label[0]).toBe(f.label[0].toUpperCase());
      }
    }
  });
});
