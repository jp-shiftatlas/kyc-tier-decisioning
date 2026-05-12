// lib/schemas/pass3.ts
import { z } from 'zod';
import { Pass1OutputSchema } from './pass1';

// Pass3OutputSchema models the auto-correction pass output.
//
// Plan vs. live prompt contract divergence (surfaced in Task 1.5):
//   prompts/pass_3_system_prompt.md specifies a richer envelope —
//   `corrected_pass_1_output` (not `corrected_pass_1`), `change_log` under
//   `correction_metadata` (not top-level), and a structured `addressed_violations`
//   array. This Batch-1 schema follows the plan's flat shape (Decision 27 —
//   no persona exercises Pass 3, all four lock PASS clean) and exposes the
//   prompt-contract additions as optional top-level fields so live Batch 11
//   integration can either lift them in place or tighten the envelope.
// Pass3OutputSchema is z.looseObject so prompt-contract-evolving extras
// (e.g. metadata, preservation_attestation, correction_metadata nesting)
// round-trip without manual modeling.

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
  corrected_pass_1: Pass1OutputSchema,
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
