import { describe, it, expect } from 'vitest';
import { Pass3OutputSchema } from './pass3';

describe('Pass3OutputSchema', () => {
  it('validates a minimal corrected Pass 1 + change log', () => {
    const sample = {
      correction_against_audit_id: 'audit-test-20260512T120000Z',
      correction_attempt_number: 1,
      corrected_pass_1_output: {
        decision: {
          recommended_tier: 'EDD',
          decision_basis: 'hard_rule',
          decisive_rule_ids: ['ES-03'],
          senior_approval_required: true,
          onboarding_hold: false,
          hold_reason: null,
        },
        risk_score: {
          total: 25,
          category_breakdown: {
            tier_eligibility: 15,
            escalation_triggers: 10,
            documentation_process: 0,
          },
        },
        rules_fired: [
          { rule_id: 'ES-03', category: 'escalation_triggers', weight: 10, trigger_evidence: 'sample trigger evidence' },
        ],
        // Six-section structured examiner_notes_full per Pass1OutputSchema (Task 1.3 update).
        // recommended_edd_procedures may be null for non-EDD tiers; we include a string here
        // because this sample is an EDD case.
        examiner_notes_full: {
          decision_summary: 'sample decision summary',
          profile_analysis: 'sample profile analysis',
          rule_application_and_risk_pattern: 'sample rule application and risk pattern',
          considered_alternatives: 'sample considered alternatives',
          recommended_edd_procedures: 'sample recommended EDD procedures',
          audit_trail: 'sample audit trail',
        },
        summary_finding: 'sample summary finding',
      },
      change_log: [
        {
          field: 'decision.recommended_tier',
          before: 'Standard',
          after: 'EDD',
          reason: 'ES-03 hard rule missed in original',
        },
      ],
    };
    const result = Pass3OutputSchema.safeParse(sample);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });

  it('rejects missing change_log', () => {
    const bad = {
      correction_against_audit_id: 'x',
      correction_attempt_number: 1,
      corrected_pass_1_output: {},
    };
    expect(Pass3OutputSchema.safeParse(bad).success).toBe(false);
  });
});

// Pass3FieldCanon — institutionalizes the canonical Pass 3 field name at the
// consumption-end test surface (same pattern as Pass1EnumCanon from 2babca2).
// Finding 20 closure: the corrected-Pass-1 field is `corrected_pass_1_output`
// per the canonical contract (07_PASS_3_DESIGN.md §3 line 77 / §4 line 280 /
// §5 line 459 + 03_DESIGN_DECISIONS.md:370,389). The prior `corrected_pass_1`
// was Batch 1 schema drift — the fourth instance of the Batch-1-schema-drift
// class, sibling to Findings 9/10/19 (closed at 2babca2). A future schema edit
// that drifts the field name in EITHER direction fails this guard.
describe('Pass3FieldCanon — schema field name matches the canonical Pass 3 contract', () => {
  it('the corrected-Pass-1 field is named corrected_pass_1_output (Finding 20)', () => {
    const keys = Object.keys(Pass3OutputSchema.shape);
    expect(keys).toContain('corrected_pass_1_output');
    expect(keys).not.toContain('corrected_pass_1');
  });
});
