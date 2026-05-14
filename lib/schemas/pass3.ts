// lib/schemas/pass3.ts
import { z } from 'zod';
import { Pass1OutputSchema } from './pass1';

// Pass3OutputSchema models the auto-correction pass output.
//
// The corrected-Pass-1 field is `corrected_pass_1_output` per the canonical
// Pass 3 contract (07_PASS_3_DESIGN.md §3 line 77, §4 pseudocode line 280,
// §5 schema-output instruction line 459 + 03_DESIGN_DECISIONS.md:370,389).
// Finding 20 closure: the prior `corrected_pass_1` field name was Batch 1
// schema drift — NOT a deliberate prompt-vs-schema divergence — the same
// defect class as Findings 9/10/19 (closed at 2babca2). The Pass3FieldCanon
// regression guard in pass3.test.ts institutionalizes the canonical name.
//
// Pass3OutputSchema is z.looseObject so prompt-contract-evolving extras
// (e.g. metadata, preservation_attestation, correction_metadata nesting)
// round-trip without manual modeling. The flat `change_log` + optional
// `addressed_violations` shape is the Batch-1 envelope; Batch 11 live
// integration may tighten it further.

export const ChangeLogEntrySchema = z.strictObject({
  field: z.string(),
  before: z.unknown(),
  after: z.unknown(),
  reason: z.string(),
});

export const AddressedViolationSchema = z.looseObject({
  check_id: z.string(),
  check_type: z.string(),
  severity_addressed: z.enum(['critical', 'material']),
  remedy_summary: z.string(),
});

export const Pass3OutputSchema = z.looseObject({
  correction_against_audit_id: z.string(),
  correction_attempt_number: z.number().int().positive(),
  corrected_pass_1_output: Pass1OutputSchema,
  change_log: z.array(ChangeLogEntrySchema).min(1),
  // Prompt-contract optionals surfaced from prompts/pass_3_system_prompt.md §Output Schema.
  // Tightened in Batch 11 once live Pass 3 calls land.
  regeneration_scope_applied: z
    .enum(['structured_decision_only', 'examiner_notes_only', 'full_regeneration'])
    .optional(),
  addressed_violations: z.array(AddressedViolationSchema).optional(),
  correction_summary: z.string().optional(),
  preservation_attestation: z.looseObject({
    preserved_fields_explicitly_unchanged: z.array(z.string()),
    preservation_method_note: z.string(),
  }).optional(),
});

export type Pass3Output = z.infer<typeof Pass3OutputSchema>;
export type ChangeLogEntry = z.infer<typeof ChangeLogEntrySchema>;
export type AddressedViolation = z.infer<typeof AddressedViolationSchema>;
