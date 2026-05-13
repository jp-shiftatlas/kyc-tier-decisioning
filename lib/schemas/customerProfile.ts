// lib/schemas/customerProfile.ts
import { z } from 'zod';
import { profileFormConfig } from '@/lib/forms/profileFormConfig';

const enumOf = <T extends readonly [string, ...string[]]>(opts: T) => z.enum(opts);

// Composite-prone fields accept any non-empty string (wire format per Decision 37a)
const compositeString = z.string().min(1);

// occupation_type — enum or free text with three guards per PRIMARY_PROMPT.md §6.6 (Decision 37b)
// Guard 1: free-text branch requires ≥3 chars (z.string().min(3) below)
// Guard 2: case-insensitive enum match — "Employed" / "EMPLOYED" → "employed"; "ofw" → "OFW".
//          Preserves the enum's canonical casing (e.g. "OFW" stays uppercase).
// Guard 3: free-text branch is trim+lowercase-normalized so "  Software Engineer  " and
//          "software engineer" produce identical parsed values.
// Lives at the schema layer (not the form) so direct POSTs to /api/decisioning validate identically
// to form submissions — Decision 34 form-config-as-SSOT contract held.
const occupationEnumValues = profileFormConfig.occupation_type.options as readonly [string, ...string[]];
const OccupationField = z.preprocess(
  (val) => {
    if (typeof val !== 'string') return val;
    const trimmed = val.trim();
    const lowered = trimmed.toLowerCase();
    const enumMatch = occupationEnumValues.find((v) => v.toLowerCase() === lowered);
    if (enumMatch) return enumMatch;
    return lowered;
  },
  z.union([
    enumOf(occupationEnumValues),
    z.string().min(3),
  ]),
);

export const CustomerProfileSchema = z.strictObject({
  customer_reference: z.string().min(1),
  identity_document_type: compositeString,
  residency_status: enumOf(profileFormConfig.residency_status.options as readonly [string, ...string[]]),
  customer_type: enumOf(profileFormConfig.customer_type.options as readonly [string, ...string[]]),
  occupation_type: OccupationField,
  source_of_funds: compositeString,
  account_purpose: compositeString,
  expected_monthly_volume_php: z.number().int().positive(),
  pep_status: enumOf(profileFormConfig.pep_status.options as readonly [string, ...string[]]),
  sanctions_screening: enumOf(profileFormConfig.sanctions_screening.options as readonly [string, ...string[]]),
  high_risk_jurisdiction_connection: enumOf(profileFormConfig.high_risk_jurisdiction_connection.options as readonly [string, ...string[]]),
  adverse_media: enumOf(profileFormConfig.adverse_media.options as readonly [string, ...string[]]),
  years_with_bank: enumOf(profileFormConfig.years_with_bank.options as readonly [string, ...string[]]),
});

export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;
