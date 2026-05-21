// lib/orchestration/fieldGrouping.ts
// Map a CustomerProfile into the four-subgroup structure for Screen 2's
// DataFlowMap. Decision 48d — Customer Identity + Account & Behavior +
// Relationship route to Onboarding; Risk Indicators routes to AML Screening.
//
// Field labels follow lib/forms/profileFormConfig.ts canonical labels
// (Title Case first letter) so persona-display rows and live-form-input
// labels read identically per visual_system.md institutional register.

import type { CustomerProfile } from '@/lib/schemas/customerProfile';
import type { SubgroupFieldRow } from '@/components/decisioning/UpstreamDataSubgroup';

export type UpstreamBoxId = 'onboarding' | 'aml-screening';

export interface GroupedSubgroup {
  title: string;
  upstream: UpstreamBoxId;
  fields: SubgroupFieldRow[];
}

function formatPhp(amount: number): string {
  return `PHP ${amount.toLocaleString('en-US')}`;
}

function humanize(value: string): string {
  // 'retail_individual' → 'Retail individual'; passes through values that already
  // look human (e.g. 'PhilSys', 'None') without mangling.
  if (!value) return '';
  if (value === value.toUpperCase()) return value;
  return value
    .replace(/_/g, ' ')
    .replace(/^./, (c) => c.toUpperCase());
}

export function groupProfileForDataFlow(p: CustomerProfile): GroupedSubgroup[] {
  return [
    {
      title: 'Customer identity',
      upstream: 'onboarding',
      fields: [
        { label: 'Customer reference', value: p.customer_reference },
        { label: 'Identity document', value: humanize(p.identity_document_type) },
        { label: 'Residency status', value: humanize(p.residency_status) },
        { label: 'Customer type', value: humanize(p.customer_type) },
      ],
    },
    {
      title: 'Account & behavior',
      upstream: 'onboarding',
      fields: [
        { label: 'Occupation', value: humanize(p.occupation_type) },
        { label: 'Source of funds', value: humanize(p.source_of_funds) },
        { label: 'Account purpose', value: humanize(p.account_purpose) },
        { label: 'Expected monthly volume', value: formatPhp(p.expected_monthly_volume_php) },
      ],
    },
    {
      title: 'Risk indicators',
      upstream: 'aml-screening',
      fields: [
        { label: 'PEP status', value: humanize(p.pep_status) },
        { label: 'Sanctions screening', value: humanize(p.sanctions_screening) },
        { label: 'Jurisdiction connection', value: humanize(p.high_risk_jurisdiction_connection) },
        { label: 'Adverse media', value: humanize(p.adverse_media) },
      ],
    },
    {
      title: 'Relationship',
      upstream: 'onboarding',
      fields: [
        { label: 'Years with bank', value: String(p.years_with_bank) },
      ],
    },
  ];
}
