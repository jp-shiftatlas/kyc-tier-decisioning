'use client';
// components/decisioning/CustomInputForm.tsx
// Custom input form per visual_system.md §5.6 (Decision 37 / 37a–g).
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §5.6 lines 371–422 — four-group regulatory-function layout, composite sub-
//     controls, regulatory citation tooltips, numeric format-on-blur,
//     inline error treatment, submit button placement, mode-disclosure label.
//   §5.6 line 395 — occupation_type "enum dropdown with 'Other…' option that
//     reveals free-text input". Schema accepts either branch per Decision 37b.
//   §5.6 line 406 — Mobile tap-to-show / tap-elsewhere-to-dismiss / tap-glyph-
//     again-to-dismiss for the four regulatory citation tooltips.
//   PRIMARY_PROMPT.md §6.6 — Decision 37 architectural positioning.
//   Decision 27 — wrapper-leakage prohibition: NO "demo intent" or "scenario
//     type" fields. CustomerProfileSchema does not contain them and never will.
//   Decision 34 — form-config-as-SSOT contract. profileFormConfig is the enum
//     source of truth; CustomerProfileSchema validates against the same arrays.
//   Decision 37a — composite sub-control wire format: "mixed (salary +
//     inheritance)" / "business and remittance" / "passport (PhilSys enrollment
//     in process)". Wire join happens inline in this component (no shared
//     wire-variant library exists; composite joining is composition-layer
//     responsibility per Batch 8 dispatch-prep spec-walk finding 2).
//   Decision 37b — occupation_type three guards: min-3 on free-text, case-
//     insensitive enum match, case-normalize before validation. Implemented at
//     the SCHEMA layer per Task 8.1 sub-step (lib/schemas/customerProfile.ts
//     OccupationField preprocess). This form passes user input through that
//     schema in the submit handler.
//   Decision 37d — regulatory citation tooltips on pep_status,
//     high_risk_jurisdiction_connection, source_of_funds, customer_type.
//
// === MOBILE TOOLTIP HANDLING (path A per Task 8.1 spec-walk finding 3) ===
//
// The Tooltip primitive's docstring (components/primitives/Tooltip.tsx lines
// 41–49) is explicit: mobile tap-to-show + tap-elsewhere-to-dismiss is NOT
// implemented at the primitive layer. The accidental mouseenter synthesis on
// touch browsers is not a deliberate affordance. This composition owns the
// three mobile behaviors required by §5.6 line 406.
//
// Implementation:
//   - The ? glyph is a focusable <button type="button"> with data-tooltip-
//     trigger attribute, wrapped in the Tooltip primitive.
//   - Tooltip primitive's onFocus/onBlur handlers fire when the button gains
//     or loses focus (React focus events bubble from descendant to wrapper).
//   - Tap-to-show: tapping the button focuses it → primitive opens via onFocus.
//   - Tap-glyph-again-to-dismiss: the button's onClick calls blur() → primitive
//     closes via onBlur.
//   - Tap-elsewhere-to-dismiss: a single document-level pointerdown listener
//     (registered once at mount) blurs the active tooltip-trigger button when
//     the pointerdown target is outside any tooltip-trigger element.
//
// The Tooltip primitive's prop surface stays unchanged at { content, children }
// per the disposition's path A resolution. Desktop hover continues to work via
// the primitive's onMouseEnter/onMouseLeave handlers independently.
//
// This closes Batch 11 prerequisite #2 (Tooltip mobile tap-to-dismiss) at the
// composition layer.
//
// === WRAPPER-LEAKAGE DISCIPLINE (Decision 27) ===
//
// The form renders the 13 customer-profile fields per CustomerProfileSchema —
// NOTHING else. No "demo intent," no "scenario type," no orchestration metadata.
// CustomerProfileSchema does not contain these fields and never will; any
// attempt to add them would fail Zod's z.strictObject() check. Regression-
// guarded at the test layer.

import { useEffect, useId, useRef, useState } from 'react';
import { useForm, type SubmitHandler } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { profileFormConfig } from '@/lib/forms/profileFormConfig';
import { CustomerProfileSchema, type CustomerProfile } from '@/lib/schemas/customerProfile';
import { Card } from '@/components/primitives/Card';
import { Button } from '@/components/primitives/Button';
import { Tooltip } from '@/components/primitives/Tooltip';
import { TabularNumber } from '@/components/primitives/TabularNumber';
import { cx } from '@/lib/ui/classnames';

// === Form schema (form-control structure → CustomerProfile via .transform) ===
// FormSchema is a superset of CustomerProfileSchema with composite parts as
// separate form fields. .transform() produces the wire-string-joined
// CustomerProfile-compatible output. The submit handler re-parses through
// CustomerProfileSchema to apply Decision 37b OccupationField normalization.

const identityDocOptions = profileFormConfig.identity_document_type.options as readonly [string, ...string[]];
const residencyOptions = profileFormConfig.residency_status.options as readonly [string, ...string[]];
const customerTypeOptions = profileFormConfig.customer_type.options as readonly [string, ...string[]];
const occupationOptions = profileFormConfig.occupation_type.options as readonly [string, ...string[]];
const sourceOfFundsOptions = profileFormConfig.source_of_funds.options as readonly [string, ...string[]];
const accountPurposeOptions = profileFormConfig.account_purpose.options as readonly [string, ...string[]];
const pepOptions = profileFormConfig.pep_status.options as readonly [string, ...string[]];
const sanctionsOptions = profileFormConfig.sanctions_screening.options as readonly [string, ...string[]];
const jurisdictionOptions = profileFormConfig.high_risk_jurisdiction_connection.options as readonly [string, ...string[]];
const adverseMediaOptions = profileFormConfig.adverse_media.options as readonly [string, ...string[]];
const yearsOptions = profileFormConfig.years_with_bank.options as readonly [string, ...string[]];

const FormSchema = z.object({
  customer_reference: z.string().min(1, 'Customer reference required'),
  identity_document_primary: z.enum(identityDocOptions),
  identity_document_philsys_in_process: z.boolean(),
  residency_status: z.enum(residencyOptions),
  customer_type: z.enum(customerTypeOptions),
  occupation_kind: z.enum(['enum', 'other']),
  occupation_enum: z.string().optional(),
  occupation_free: z.string().optional(),
  source_of_funds_primary: z.enum(sourceOfFundsOptions),
  source_of_funds_secondary: z.string().optional(),
  account_purpose_primary: z.enum(accountPurposeOptions),
  account_purpose_secondary: z.string().optional(),
  expected_monthly_volume_php: z.coerce.number().int().positive('Expected monthly volume must be positive'),
  pep_status: z.enum(pepOptions),
  sanctions_screening: z.enum(sanctionsOptions),
  high_risk_jurisdiction_connection: z.enum(jurisdictionOptions),
  adverse_media: z.enum(adverseMediaOptions),
  years_with_bank: z.enum(yearsOptions),
})
  .refine(
    (d) =>
      d.occupation_kind === 'enum'
        ? d.occupation_enum !== undefined && d.occupation_enum.length > 0
        : d.occupation_free !== undefined && d.occupation_free.trim().length >= 3,
    { message: 'Occupation required (≥3 chars if free text)', path: ['occupation_enum'] },
  )
  .transform((d): CustomerProfile => {
    const idt =
      d.identity_document_philsys_in_process && d.identity_document_primary !== 'PhilSys'
        ? `${d.identity_document_primary} (PhilSys enrollment in process)`
        : d.identity_document_primary;
    const sof = d.source_of_funds_secondary
      ? `mixed (${d.source_of_funds_primary} + ${d.source_of_funds_secondary})`
      : d.source_of_funds_primary;
    const ap = d.account_purpose_secondary
      ? `${d.account_purpose_primary} and ${d.account_purpose_secondary}`
      : d.account_purpose_primary;
    const occupation =
      d.occupation_kind === 'enum' ? (d.occupation_enum as string) : (d.occupation_free as string);
    return {
      customer_reference: d.customer_reference,
      identity_document_type: idt,
      residency_status: d.residency_status,
      customer_type: d.customer_type,
      occupation_type: occupation,
      source_of_funds: sof,
      account_purpose: ap,
      expected_monthly_volume_php: d.expected_monthly_volume_php,
      pep_status: d.pep_status,
      sanctions_screening: d.sanctions_screening,
      high_risk_jurisdiction_connection: d.high_risk_jurisdiction_connection,
      adverse_media: d.adverse_media,
      years_with_bank: d.years_with_bank,
    };
  });

type FormInput = z.input<typeof FormSchema>;
type FormOutput = z.output<typeof FormSchema>;

interface CustomInputFormProps {
  onValidatedSubmit: (profile: CustomerProfile) => void;
}

export function CustomInputForm({ onValidatedSubmit }: CustomInputFormProps) {
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    setError,
    formState: { errors, touchedFields },
  } = useForm<FormInput, unknown, FormOutput>({
    resolver: zodResolver(FormSchema),
    mode: 'onTouched',
    defaultValues: {
      identity_document_philsys_in_process: false,
      occupation_kind: 'enum',
    },
  });

  // Composite reveal state (UI-only; not part of the form schema)
  const [showSourceOfFundsSecondary, setShowSourceOfFundsSecondary] = useState(false);
  const [showAccountPurposeSecondary, setShowAccountPurposeSecondary] = useState(false);

  // Volume display state for format-on-blur with thousand separators (§5.6 line 396)
  const [volumeDisplay, setVolumeDisplay] = useState('');

  // Document-level pointerdown listener for tap-elsewhere-to-dismiss on tooltips
  // (path A per Task 8.1 spec-walk finding 3 disposition).
  useEffect(() => {
    const handlePointerDown = (e: PointerEvent) => {
      const active = document.activeElement;
      if (!(active instanceof HTMLButtonElement)) return;
      if (active.dataset.tooltipTrigger === undefined) return;
      const target = e.target as Node | null;
      if (!target) return;
      if (active === target || active.contains(target as Node)) return;
      active.blur();
    };
    document.addEventListener('pointerdown', handlePointerDown);
    return () => document.removeEventListener('pointerdown', handlePointerDown);
  }, []);

  // Build secondary-select option lists (exclude the primary value)
  const occupationKind = watch('occupation_kind');
  const idtPrimary = watch('identity_document_primary');
  const sofPrimary = watch('source_of_funds_primary');
  const apPrimary = watch('account_purpose_primary');
  const sofSecondaryOptions = sourceOfFundsOptions.filter((o) => o !== sofPrimary);
  const apSecondaryOptions = accountPurposeOptions.filter((o) => o !== apPrimary);

  const philsysCheckboxDisabled = idtPrimary === 'PhilSys';
  useEffect(() => {
    if (philsysCheckboxDisabled) {
      setValue('identity_document_philsys_in_process', false);
    }
  }, [philsysCheckboxDisabled, setValue]);

  const submitHandler: SubmitHandler<FormOutput> = (data) => {
    // `data` is FormSchema's TRANSFORM OUTPUT: a CustomerProfile-shaped object
    // with composite wire strings already joined.
    // Re-parse through CustomerProfileSchema to apply OccupationField guards
    // (Decision 37b: trim + case-insensitive enum match + lowercase free-text).
    const result = CustomerProfileSchema.safeParse(data);
    if (!result.success) {
      result.error.issues.forEach((issue) => {
        const path = issue.path.join('.') as keyof FormInput;
        setError(path as keyof FormInput, { message: issue.message });
      });
      return;
    }
    onValidatedSubmit(result.data);
  };

  // Helper for inline error rendering (only when field has been touched)
  const fieldError = (key: keyof FormInput): string | undefined => {
    if (!(touchedFields as Record<string, unknown>)[key as string]) return undefined;
    const e = (errors as Record<string, { message?: string } | undefined>)[key as string];
    return e?.message;
  };

  return (
    <form onSubmit={handleSubmit(submitHandler)} noValidate className="flex flex-col gap-6">
      <p className="font-sans text-xs text-text-tertiary">Live audit</p>

      {/* Group 1 — Customer identity */}
      <Card variant="elevated">
        <fieldset className="flex flex-col gap-4">
          <legend className="font-sans text-sm text-text-tertiary">Customer identity</legend>

          <Field label="Customer reference" error={fieldError('customer_reference')}>
            {(id) => (
              <input
                id={id}
                type="text"
                {...register('customer_reference')}
                className={INPUT_CLS}
                aria-invalid={fieldError('customer_reference') ? true : undefined}
              />
            )}
          </Field>

          <Field
            label="Identity document"
            error={
              fieldError('identity_document_primary') ?? fieldError('identity_document_type' as keyof FormInput)
            }
          >
            {(id) => (
              <>
                <select id={id} {...register('identity_document_primary')} className={INPUT_CLS} defaultValue="">
                  <option value="" disabled>
                    Select…
                  </option>
                  {identityDocOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                <label className="mt-2 inline-flex items-center gap-2 font-sans text-sm text-text-secondary">
                  <input
                    type="checkbox"
                    {...register('identity_document_philsys_in_process')}
                    disabled={philsysCheckboxDisabled}
                  />
                  PhilSys enrollment in process
                </label>
              </>
            )}
          </Field>

          <Field label="Residency status" error={fieldError('residency_status')}>
            {(id) => (
              <select id={id} {...register('residency_status')} className={INPUT_CLS} defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {residencyOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            label="Customer type"
            tooltip={profileFormConfig.customer_type.citationTooltip}
            error={fieldError('customer_type')}
          >
            {(id) => (
              <select id={id} {...register('customer_type')} className={INPUT_CLS} defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {customerTypeOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </fieldset>
      </Card>

      {/* Group 2 — Account & behavior */}
      <Card variant="elevated">
        <fieldset className="flex flex-col gap-4">
          <legend className="font-sans text-sm text-text-tertiary">Account &amp; behavior</legend>

          <Field
            label="Occupation"
            error={fieldError('occupation_enum') ?? fieldError('occupation_free')}
          >
            {(id) => (
              <>
                <select
                  id={id}
                  {...register('occupation_kind')}
                  className={INPUT_CLS}
                  onChange={(e) => {
                    const v = e.target.value as 'enum' | 'other';
                    setValue('occupation_kind', v, { shouldTouch: true });
                    if (v === 'enum') {
                      setValue('occupation_free', '');
                    } else {
                      setValue('occupation_enum', '');
                    }
                  }}
                >
                  <option value="enum">Select from list…</option>
                  <option value="other">Other…</option>
                </select>
                {occupationKind === 'enum' && (
                  <select
                    aria-label="Occupation (from list)"
                    {...register('occupation_enum')}
                    className={cx(INPUT_CLS, 'mt-2')}
                    defaultValue=""
                  >
                    <option value="" disabled>
                      Select…
                    </option>
                    {occupationOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                )}
                {occupationKind === 'other' && (
                  <input
                    type="text"
                    aria-label="Occupation (free text)"
                    {...register('occupation_free')}
                    placeholder="Describe occupation"
                    className={cx(INPUT_CLS, 'mt-2')}
                  />
                )}
              </>
            )}
          </Field>

          <Field
            label="Source of funds"
            tooltip={profileFormConfig.source_of_funds.citationTooltip}
            error={fieldError('source_of_funds_primary')}
          >
            {(id) => (
              <>
                <select id={id} {...register('source_of_funds_primary')} className={INPUT_CLS} defaultValue="">
                  <option value="" disabled>
                    Select…
                  </option>
                  {sourceOfFundsOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                {showSourceOfFundsSecondary ? (
                  <select
                    aria-label="Source of funds (additional)"
                    {...register('source_of_funds_secondary')}
                    className={cx(INPUT_CLS, 'mt-2')}
                    defaultValue=""
                  >
                    <option value="">— none —</option>
                    {sofSecondaryOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowSourceOfFundsSecondary(true)}
                    className="mt-2 self-start font-sans text-sm text-accent-primary"
                  >
                    + Add additional source
                  </button>
                )}
              </>
            )}
          </Field>

          <Field label="Account purpose" error={fieldError('account_purpose_primary')}>
            {(id) => (
              <>
                <select id={id} {...register('account_purpose_primary')} className={INPUT_CLS} defaultValue="">
                  <option value="" disabled>
                    Select…
                  </option>
                  {accountPurposeOptions.map((o) => (
                    <option key={o} value={o}>
                      {o}
                    </option>
                  ))}
                </select>
                {showAccountPurposeSecondary ? (
                  <select
                    aria-label="Account purpose (additional)"
                    {...register('account_purpose_secondary')}
                    className={cx(INPUT_CLS, 'mt-2')}
                    defaultValue=""
                  >
                    <option value="">— none —</option>
                    {apSecondaryOptions.map((o) => (
                      <option key={o} value={o}>
                        {o}
                      </option>
                    ))}
                  </select>
                ) : (
                  <button
                    type="button"
                    onClick={() => setShowAccountPurposeSecondary(true)}
                    className="mt-2 self-start font-sans text-sm text-accent-primary"
                  >
                    + Add additional purpose
                  </button>
                )}
              </>
            )}
          </Field>

          <Field
            label="Expected monthly volume"
            error={fieldError('expected_monthly_volume_php')}
          >
            {(id) => (
              <div className="inline-flex items-baseline gap-2">
                <span className="font-sans text-sm text-text-tertiary">PHP</span>
                <input
                  id={id}
                  type="text"
                  inputMode="numeric"
                  {...register('expected_monthly_volume_php', { valueAsNumber: false })}
                  value={volumeDisplay}
                  onChange={(e) => setVolumeDisplay(e.target.value.replace(/[^0-9]/g, ''))}
                  onBlur={(e) => {
                    const raw = e.target.value.replace(/[^0-9]/g, '');
                    if (raw === '') {
                      setVolumeDisplay('');
                      setValue('expected_monthly_volume_php', undefined as unknown as number, {
                        shouldTouch: true,
                        shouldValidate: true,
                      });
                      return;
                    }
                    const n = parseInt(raw, 10);
                    setVolumeDisplay(n.toLocaleString('en-US'));
                    setValue('expected_monthly_volume_php', n, { shouldTouch: true, shouldValidate: true });
                  }}
                  className={cx(INPUT_CLS, 'font-numeric tabular-nums')}
                />
                {volumeDisplay && (
                  <TabularNumber value={volumeDisplay} className="hidden text-sm text-text-tertiary" />
                )}
              </div>
            )}
          </Field>
        </fieldset>
      </Card>

      {/* Group 3 — Risk indicators */}
      <Card variant="elevated">
        <fieldset className="flex flex-col gap-4">
          <legend className="font-sans text-sm text-text-tertiary">Risk indicators</legend>

          <Field
            label="PEP status"
            tooltip={profileFormConfig.pep_status.citationTooltip}
            error={fieldError('pep_status')}
          >
            {(id) => (
              <select id={id} {...register('pep_status')} className={INPUT_CLS} defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {pepOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Sanctions screening" error={fieldError('sanctions_screening')}>
            {(id) => (
              <select id={id} {...register('sanctions_screening')} className={INPUT_CLS} defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {sanctionsOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field
            label="High-risk jurisdiction connection"
            tooltip={profileFormConfig.high_risk_jurisdiction_connection.citationTooltip}
            error={fieldError('high_risk_jurisdiction_connection')}
          >
            {(id) => (
              <select
                id={id}
                {...register('high_risk_jurisdiction_connection')}
                className={INPUT_CLS}
                defaultValue=""
              >
                <option value="" disabled>
                  Select…
                </option>
                {jurisdictionOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </Field>

          <Field label="Adverse media" error={fieldError('adverse_media')}>
            {(id) => (
              <select id={id} {...register('adverse_media')} className={INPUT_CLS} defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {adverseMediaOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </fieldset>
      </Card>

      {/* Group 4 — Relationship */}
      <Card variant="elevated">
        <fieldset className="flex flex-col gap-4">
          <legend className="font-sans text-sm text-text-tertiary">Relationship</legend>

          <Field label="Years with bank" error={fieldError('years_with_bank')}>
            {(id) => (
              <select id={id} {...register('years_with_bank')} className={INPUT_CLS} defaultValue="">
                <option value="" disabled>
                  Select…
                </option>
                {yearsOptions.map((o) => (
                  <option key={o} value={o}>
                    {o}
                  </option>
                ))}
              </select>
            )}
          </Field>
        </fieldset>
      </Card>

      <p className="font-sans text-xs text-text-tertiary">
        Live generation is rate-limited per session. Pre-generated examples are not affected.
      </p>

      <div className="flex md:justify-end">
        <Button type="submit" variant="primary" className="w-full md:w-auto">
          Run three-pass analysis
        </Button>
      </div>
    </form>
  );
}

// === Field wrapper (label + optional tooltip glyph + control + error) ===
//
// Render-prop pattern: the Field generates a stable id, passes it to the child
// render fn, and the child applies it as `id` to the actual control. This
// keeps <label htmlFor> ↔ <control id> association explicit even when the
// child is a composite (e.g. select + checkbox) — only the primary control
// receives the id.
//
// Tooltip handling per path A (Task 8.1 spec-walk finding 3 disposition):
//   - The "?" glyph is a focusable <button type="button" data-tooltip-trigger>
//     wrapped in the Tooltip primitive, rendered as a SIBLING of the <label>
//     so the label's accessible name stays exactly the field-label string
//     (testable via getByLabelText with the exact label text).
//   - Desktop hover → Tooltip primitive's onMouseEnter opens.
//   - Tap-to-show → button focus → Tooltip primitive's onFocus opens.
//   - Tap-glyph-again → onClick calls blur() → Tooltip primitive's onBlur closes.
//   - Tap-elsewhere → document-level pointerdown listener in CustomInputForm
//     blurs the active tooltip-trigger button.

interface FieldProps {
  label: string;
  tooltip?: string;
  error?: string;
  children: (id: string) => React.ReactNode;
}

function Field({ label, tooltip, error, children }: FieldProps) {
  const fieldId = useId();
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1">
        <label htmlFor={fieldId} className="font-sans text-sm text-text-secondary">
          {label}
        </label>
        {tooltip && <TooltipGlyph citation={tooltip} fieldLabel={label} />}
      </div>
      {children(fieldId)}
      {error && <span className="font-sans text-sm text-violation-primary">{error}</span>}
    </div>
  );
}

function TooltipGlyph({ citation, fieldLabel }: { citation: string; fieldLabel: string }) {
  const buttonRef = useRef<HTMLButtonElement>(null);
  return (
    <Tooltip content={citation}>
      <button
        ref={buttonRef}
        type="button"
        data-tooltip-trigger=""
        aria-label={`Regulatory citation for ${fieldLabel}`}
        onClick={(e) => {
          // Tap-glyph-again-to-dismiss: clicking a focused trigger blurs it
          e.currentTarget.blur();
        }}
        className="ml-1 inline-flex h-4 w-4 items-center justify-center text-xs text-text-tertiary"
      >
        ?
      </button>
    </Tooltip>
  );
}

const INPUT_CLS = [
  'border border-border-default bg-surface-elevated',
  'px-3 py-2 font-sans text-sm text-text-primary',
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
  'disabled:opacity-50',
].join(' ');
