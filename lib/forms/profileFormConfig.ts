// lib/forms/profileFormConfig.ts
// Enum source of truth for the 13-field customer profile.
// Per PRIMARY_PROMPT.md §4.7 (Decision 34), enums live HERE; persona JSONs validate as subsets.

export type FieldGroup = 'identity' | 'account' | 'risk' | 'relationship';

export interface FieldConfig {
  group: FieldGroup;
  label: string;
  options: readonly string[];
  composite?: boolean;
  citationTooltip?: string;
}

export const profileFormConfig = {
  customer_reference: {
    group: 'identity',
    label: 'Customer reference',
    options: [] as const, // free text
  },
  identity_document_type: {
    group: 'identity',
    label: 'Identity document',
    options: ['PhilSys', 'passport', 'driver\'s license', 'other government ID'] as const,
    composite: true, // + "PhilSys enrollment in process" checkbox
  },
  residency_status: {
    group: 'identity',
    label: 'Residency status',
    options: ['PH resident', 'PH non-resident', 'OFW', 'foreign national'] as const,
  },
  customer_type: {
    group: 'identity',
    label: 'Customer type',
    options: ['individual retail', 'individual high-net-worth', 'sole proprietor', 'corporate', 'NGO'] as const,
    citationTooltip: 'Classification per MORB §901 customer typology.',
  },
  occupation_type: {
    group: 'account',
    label: 'Occupation',
    options: ['employed', 'self-employed', 'business owner', 'student', 'OFW'] as const,
    // Also accepts free text — schema uses union; see lib/schemas/customerProfile.ts
  },
  source_of_funds: {
    group: 'account',
    label: 'Source of funds',
    options: ['salary', 'business', 'investments', 'inheritance', 'remittance', 'unclear'] as const,
    composite: true,
    citationTooltip: 'Source of funds verification — FATF R.10, MORB §921.',
  },
  account_purpose: {
    group: 'account',
    label: 'Account purpose',
    options: ['payroll', 'savings', 'business', 'investment', 'remittance', 'unclear'] as const,
    composite: true,
  },
  expected_monthly_volume_php: {
    group: 'account',
    label: 'Expected monthly volume (PHP)',
    options: [] as const, // numeric
  },
  pep_status: {
    group: 'risk',
    label: 'PEP status',
    options: ['none', 'domestic PEP', 'foreign PEP', 'family/close associate'] as const,
    citationTooltip: 'Person currently or formerly in a prominent public function, or their family / close associates — FATF R.12, MORB §923.',
  },
  sanctions_screening: {
    group: 'risk',
    label: 'Sanctions screening',
    options: ['clean', 'partial match', 'confirmed match'] as const,
  },
  high_risk_jurisdiction_connection: {
    group: 'risk',
    label: 'High-risk jurisdiction connection',
    options: ['none', 'transit', 'residence', 'business operations'] as const,
    citationTooltip: 'FATF high-risk / monitored jurisdictions — FATF Public Statement, MORB §923.',
  },
  adverse_media: {
    group: 'risk',
    label: 'Adverse media',
    options: ['no', 'minor flags', 'material concerns'] as const,
  },
  years_with_bank: {
    group: 'relationship',
    label: 'Years with bank',
    options: ['new', '1-3', '3-5', '5+'] as const,
  },
} as const satisfies Record<string, FieldConfig>;

export type ProfileFormConfig = typeof profileFormConfig;
