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

export const DecisionSchema = z.strictObject({
  recommended_tier: z.enum(['SDD', 'Standard', 'EDD', 'Hold']),
  decision_basis: z.enum(['score_based', 'hard_rule', 'multi_decisive_rule', 'hold']),
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

export const Pass1OutputSchema = z.looseObject({
  decision: DecisionSchema,
  // risk_score uses looseObject because the locked persona JSON carries persona-specific extras
  // (score_band, score_vs_decision_note) alongside the canonical total + category_breakdown.
  risk_score: z.looseObject({
    total: z.number(),
    category_breakdown: z.strictObject({
      tier_eligibility: z.number(),
      escalation_triggers: z.number(),
      documentation_process: z.number(),
    }),
  }),
  rules_fired: z.array(RuleFiredSchema),
  considered_rules: z.array(z.looseObject({
    rule_id: z.string(),
    fired: z.boolean(),
    confidence_basis: z.string(),
  })).optional(),
  examiner_notes_full: ExaminerNotesFullSchema,
  summary_finding: z.string(),
  edd_requirements: z.array(z.string()).optional(),
});

export type Pass1Output = z.infer<typeof Pass1OutputSchema>;
