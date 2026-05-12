// lib/schemas/pass2.ts
import { z } from 'zod';

// PRIMARY_PROMPT.md §4.4 / §4.7: Pass 2 boundary uses looseObject per Decision 28 so
// persona-specific variations (metadata, pass_3_targeting, violation_summary, etc.) round-trip
// without manual modeling. Status case verified against locked persona JSON:
//   - per-check status: lowercase "pass" (data/personas.json — every check)
//   - overall_status:   uppercase "PASS" (data/personas.json — top-level)
// Source of truth is the locked persona JSON, not the plan recipe.

export const CheckTypeSchema = z.enum([
  'hard_rule_floor',
  'rule_firing',
  'numeric_threshold_verification',
  'score_arithmetic',
  'score_band_mapping',
  'decision_basis_consistency',
  'pattern_substance',
  'dc07_documentation',
  'register_compliance',
  'consistency',
]);

export const AuditCheckSchema = z.looseObject({
  rule_id: z.string().nullable().optional(),
  check_type: CheckTypeSchema,
  // Per-check status: lowercase in locked persona JSON.
  status: z.enum(['pass', 'fail', 'quality']),
  severity: z.enum(['critical', 'material', 'quality']).nullable(),
  evidence_note: z.string().optional(),
  // regulatory_citation can be null (e.g. Maria's score_arithmetic / consistency checks).
  regulatory_citation: z.string().nullable().optional(),
  // Numeric threshold fields — only present when check_type === 'numeric_threshold_verification'.
  profile_value: z.union([z.string(), z.number(), z.null()]).optional(),
  rule_threshold: z.union([z.string(), z.number(), z.null()]).optional(),
  comparison_result: z.string().nullable().optional(),
});

export const Pass2OutputSchema = z.looseObject({
  // normalizePass2 falls back to audit_generated_at; for personas where neither is at the top
  // level (Maria / Carlos / Persona D carry it inside metadata) this stays undefined and is
  // optional here. metadata still round-trips the original.
  generated_at: z.string().optional(),
  target_check_ids: z.array(z.string()),
  regeneration_scope: z.enum(['none', 'full', 'targeted']).nullable().default('none'),
  correction_required: z.boolean(),
  audit_summary: z.string(),
  // overall_status: uppercase in locked persona JSON.
  overall_status: z.enum(['PASS', 'PASS_WITH_QUALITY_FLAGS', 'FAIL']),
  checks: z.array(AuditCheckSchema),
  severity_counts: z
    .strictObject({
      critical: z.number(),
      material: z.number(),
      quality: z.number(),
    })
    .optional(),
  // metadata absorbs persona-specific variations per Decision 28
  metadata: z.record(z.string(), z.unknown()).optional(),
  pass_3_targeting: z.record(z.string(), z.unknown()).optional(),
  // Plan amendment #4 — computed DC-07 dual-satisfaction flags written by normalizePass2.
  // `_` prefix marks them as derived, not part of the wire/model contract.
  _dc07_structured_record: z.boolean().optional(),
  _dc07_prose: z.boolean().optional(),
});

export type Pass2Output = z.infer<typeof Pass2OutputSchema>;
export type AuditCheck = z.infer<typeof AuditCheckSchema>;
