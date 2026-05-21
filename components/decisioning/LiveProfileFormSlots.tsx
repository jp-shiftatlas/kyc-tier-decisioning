// components/decisioning/LiveProfileFormSlots.tsx
// Live-mode form field sections rendered as edit slots inside DataFlowMap.
// Each slot reads RHF form context (FormProvider sits above in DataFlowScreen)
// and renders just its slice of fields — no card chrome, no submit button.
// DataFlowMap's UpstreamDataSubgroup provides the chrome on Screen 2.
//
// Scope notes (v1 demo simplification):
//   - source_of_funds / account_purpose composite "+ Add another" deferred —
//     single selects produce schema-valid wire values for the common case.
//   - identity_document_type composite checkbox folded into the option list
//     as "PhilSys (in process)" — single dropdown, no separate checkbox.
//   - regulatory citation tooltips deferred.
//   - occupation_type free-text branch deferred — enum dropdown only.
//
// Dropdown display uses Title Case via the `formalize()` helper. The
// underlying option `value` stays as the canonical schema enum string
// (lowercase / snake-case) so CustomerProfileSchema validates correctly;
// only the rendered label is capitalized.

'use client';

import { useFormContext } from 'react-hook-form';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';
import { profileFormConfig } from '@/lib/forms/profileFormConfig';

const FIELD_WRAPPER = 'flex flex-col gap-1 font-sans text-sm';
const LABEL_CLS = 'text-text-secondary text-xs';
const INPUT_CLS =
  'rounded-none border border-border-default bg-surface-elevated px-3 py-2 font-sans text-sm text-text-primary focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary';
const ERROR_CLS = 'font-sans text-xs text-violation-primary';

// Capitalize first character; preserves embedded acronyms (PEP, OFW, PH, NGO,
// PhilSys) and existing capital letters. "employed" → "Employed",
// "domestic PEP" → "Domestic PEP", "PhilSys" → "PhilSys".
function formalize(value: string): string {
  if (!value) return '';
  return value.charAt(0).toUpperCase() + value.slice(1);
}

// identity_document_type option list — composite-control checkbox folded in
// as a selectable enum value per JP's Screen 2 feedback. Wire value matches
// the locked persona JSON convention ("passport (PhilSys enrollment in process)"
// from CustomInputForm composite-join logic).
const IDENTITY_DOCUMENT_OPTIONS = [
  ...profileFormConfig.identity_document_type.options,
  'PhilSys (in process)',
] as const;

function fieldError(errors: Record<string, any>, key: string): string | undefined {
  const e = errors[key];
  return e?.message as string | undefined;
}

function EnumSelect({
  name,
  label,
  options,
  required = true,
}: {
  name: keyof CustomerProfile;
  label: string;
  options: readonly string[];
  required?: boolean;
}) {
  const { register, formState: { errors } } = useFormContext<CustomerProfile>();
  const err = fieldError(errors as any, name as string);
  return (
    <div className={FIELD_WRAPPER}>
      <label htmlFor={`live-${name}`} className={LABEL_CLS}>{label}</label>
      <select
        id={`live-${name}`}
        {...register(name as any, { required })}
        className={INPUT_CLS}
        defaultValue=""
      >
        <option value="" disabled>Select…</option>
        {options.map((opt) => (
          <option key={opt} value={opt}>{formalize(opt)}</option>
        ))}
      </select>
      {err && <p className={ERROR_CLS}>{err}</p>}
    </div>
  );
}

function TextInput({
  name,
  label,
  type = 'text',
  placeholder,
}: {
  name: keyof CustomerProfile;
  label: string;
  type?: string;
  placeholder?: string;
}) {
  const { register, formState: { errors } } = useFormContext<CustomerProfile>();
  const err = fieldError(errors as any, name as string);
  return (
    <div className={FIELD_WRAPPER}>
      <label htmlFor={`live-${name}`} className={LABEL_CLS}>{label}</label>
      <input
        id={`live-${name}`}
        type={type}
        placeholder={placeholder}
        {...register(name as any, {
          required: true,
          valueAsNumber: type === 'number' ? true : undefined,
        })}
        className={INPUT_CLS}
      />
      {err && <p className={ERROR_CLS}>{err}</p>}
    </div>
  );
}

export function CustomerIdentitySlot() {
  return (
    <div className="flex flex-col gap-3">
      <TextInput
        name="customer_reference"
        label="Customer reference"
        placeholder="e.g. CUST-2026-0042"
      />
      <EnumSelect
        name="identity_document_type"
        label={profileFormConfig.identity_document_type.label}
        options={IDENTITY_DOCUMENT_OPTIONS}
      />
      <EnumSelect
        name="residency_status"
        label={profileFormConfig.residency_status.label}
        options={profileFormConfig.residency_status.options}
      />
      <EnumSelect
        name="customer_type"
        label={profileFormConfig.customer_type.label}
        options={profileFormConfig.customer_type.options}
      />
    </div>
  );
}

export function AccountBehaviorSlot() {
  return (
    <div className="flex flex-col gap-3">
      <EnumSelect
        name="occupation_type"
        label={profileFormConfig.occupation_type.label}
        options={profileFormConfig.occupation_type.options}
      />
      <EnumSelect
        name="source_of_funds"
        label={profileFormConfig.source_of_funds.label}
        options={profileFormConfig.source_of_funds.options}
      />
      <EnumSelect
        name="account_purpose"
        label={profileFormConfig.account_purpose.label}
        options={profileFormConfig.account_purpose.options}
      />
      <TextInput
        name="expected_monthly_volume_php"
        label={profileFormConfig.expected_monthly_volume_php.label}
        type="number"
        placeholder="e.g. 850000"
      />
    </div>
  );
}

export function RiskIndicatorsSlot() {
  return (
    <div className="flex flex-col gap-3">
      <EnumSelect
        name="pep_status"
        label={profileFormConfig.pep_status.label}
        options={profileFormConfig.pep_status.options}
      />
      <EnumSelect
        name="sanctions_screening"
        label={profileFormConfig.sanctions_screening.label}
        options={profileFormConfig.sanctions_screening.options}
      />
      <EnumSelect
        name="high_risk_jurisdiction_connection"
        label={profileFormConfig.high_risk_jurisdiction_connection.label}
        options={profileFormConfig.high_risk_jurisdiction_connection.options}
      />
      <EnumSelect
        name="adverse_media"
        label={profileFormConfig.adverse_media.label}
        options={profileFormConfig.adverse_media.options}
      />
    </div>
  );
}

export function RelationshipSlot() {
  return (
    <div className="flex flex-col gap-3">
      <EnumSelect
        name="years_with_bank"
        label={profileFormConfig.years_with_bank.label}
        options={profileFormConfig.years_with_bank.options}
      />
    </div>
  );
}
