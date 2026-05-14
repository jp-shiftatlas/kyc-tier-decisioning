// lib/schemas/pass1.ts
import { z } from 'zod';

// PRIMARY_PROMPT.md §4.7: strictObject on canonical structural fields; looseObject on category-field-bearing structures per Decision 29.

export const RiskCategorySchema = z.strictObject({
  weight: z.number(),
  rules: z.array(z.string()),
});

export const RuleFiredSchema = z.looseObject({
  rule_id: z.string(),
  // category accepts the locked "escalation" variant via looseObject at the parent level;
  // canonical form is "escalation_triggers" after normalizePass1.
  category: z.enum(['escalation_triggers', 'tier_eligibility', 'documentation_process']),
  weight: z.number(),
  trigger_evidence: z.string(),
});

// recommended_tier + decision_basis enum values match the canonical Pass 1
// contract (05_PASS_1_DESIGN.md §2) per the Decision 45 schema-follows-reality
// discipline. Three Batch 1 schema-drift defects were corrected in the
// pre-Batch-9 schema-alignment commit (Findings 9, 10, 19):
//   - recommended_tier: 'Hold' was Batch 1 drift; canonical fourth tier is
//     'Decline' (ES-04 sanctions hit → DECLINE + file STR per
//     02_RULESET_v1.md:93). Finding 9.
//   - decision_basis: 'multi_decisive_rule' and 'hold' were Batch 1 drift;
//     canonical enum is hard_rule / score_based / hybrid. Multiple decisive
//     rules are handled via decisive_rule_ids cardinality (Carlos:
//     ['ES-03', 'TE-05'] with decision_basis: 'hard_rule'), not a separate
//     enum value. Finding 19.
// The Pass1EnumCanon regression guard in pass1.test.ts asserts these unions
// against their canonical values so future drift fails at the schema-test
// boundary rather than at a dispatch-prep walk batches later.
export const DecisionSchema = z.strictObject({
  recommended_tier: z.enum(['SDD', 'Standard', 'EDD', 'Decline']),
  decision_basis: z.enum(['hard_rule', 'score_based', 'hybrid']),
  decisive_rule_ids: z.array(z.string()),
  senior_approval_required: z.boolean(),
  onboarding_hold: z.boolean(),
  hold_reason: z.string().nullable(),
});

// examiner_notes_full is structured (six narrative sub-sections) in the locked persona JSON,
// not a single string. Modelled as looseObject so the canonical sub-fields are required while
// persona-specific extras still round-trip per Decision 29.
export const ExaminerNotesFullSchema = z.looseObject({
  decision_summary: z.string(),
  profile_analysis: z.string(),
  rule_application_and_risk_pattern: z.string(),
  considered_alternatives: z.string(),
  // recommended_edd_procedures is null for non-EDD tiers (e.g. Maria/Standard) per locked persona JSON.
  recommended_edd_procedures: z.string().nullable(),
  audit_trail: z.string(),
});

// Structured EDD procedure shape per the canonical Pass 1 contract
// (05_PASS_1_DESIGN.md §2). Locked persona JSON carries this exact shape at
// the top-level `recommended_edd_procedures` field. Finding 10 corrected the
// Batch 1 schema drift: the prior `edd_requirements: z.array(z.string())`
// declaration had both the wrong field name AND the wrong shape.
export const EddProcedureSchema = z.strictObject({
  procedure_id: z.number().int().positive(),
  description: z.string(),
  regulatory_basis: z.string(),
});

export const Pass1OutputSchema = z.looseObject({
  decision: DecisionSchema,
  // risk_score uses looseObject because the locked persona JSON carries the
  // persona-specific extra `score_vs_decision_note` alongside the canonical
  // total + category_breakdown + score_band. score_band is now a declared
  // enum (was looseObject-absorbed before the Finding 19 schema-alignment
  // commit) so the Pass1EnumCanon regression guard can assert it.
  risk_score: z.looseObject({
    total: z.number(),
    category_breakdown: z.strictObject({
      tier_eligibility: z.number(),
      escalation_triggers: z.number(),
      documentation_process: z.number(),
    }),
    // score_band canonical values per 02_RULESET_v1.md:105–107 (0–10 SDD
    // eligible / 11–30 Standard / 31+ EDD). Optional because live Pass 1
    // responses are not yet contract-locked on its presence; all four locked
    // personas carry it.
    score_band: z.enum(['0-10', '11-30', '31+']).optional(),
  }),
  rules_fired: z.array(RuleFiredSchema),
  considered_rules: z.array(z.looseObject({
    rule_id: z.string(),
    fired: z.boolean(),
    confidence_basis: z.string(),
  })).optional(),
  examiner_notes_full: ExaminerNotesFullSchema,
  summary_finding: z.string(),
  // Top-level structured EDD procedures (distinct from the prose-string
  // examiner_notes_full.recommended_edd_procedures — the locked persona JSON
  // genuinely carries both fields under that name; see Maria persona JSON
  // top-level [] vs nested null). Finding 10.
  recommended_edd_procedures: z.array(EddProcedureSchema).optional(),
});

export type Pass1Output = z.infer<typeof Pass1OutputSchema>;
export type EddProcedure = z.infer<typeof EddProcedureSchema>;
