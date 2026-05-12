import { describe, it, expect } from 'vitest';
import { profileFormConfig } from './profileFormConfig';

describe('profileFormConfig', () => {
  it('exports an enum source of truth for each profile field', () => {
    expect(profileFormConfig.identity_document_type.options).toContain('PhilSys');
    expect(profileFormConfig.residency_status.options).toContain('PH resident');
    expect(profileFormConfig.customer_type.options).toContain('individual retail');
    expect(profileFormConfig.pep_status.options).toContain('none');
    expect(profileFormConfig.sanctions_screening.options).toContain('clean');
    expect(profileFormConfig.high_risk_jurisdiction_connection.options).toContain('none');
    expect(profileFormConfig.adverse_media.options).toContain('no');
    expect(profileFormConfig.years_with_bank.options).toContain('new');
    expect(profileFormConfig.years_with_bank.options).toContain('1-3');
  });

  it('groups fields by regulatory function per Decision 37', () => {
    expect(profileFormConfig.identity_document_type.group).toBe('identity');
    expect(profileFormConfig.occupation_type.group).toBe('account');
    expect(profileFormConfig.pep_status.group).toBe('risk');
    expect(profileFormConfig.years_with_bank.group).toBe('relationship');
  });

  it('marks composite-prone fields per Decision 37a', () => {
    expect(profileFormConfig.source_of_funds.composite).toBe(true);
    expect(profileFormConfig.account_purpose.composite).toBe(true);
    expect(profileFormConfig.identity_document_type.composite).toBe(true);
  });
});
