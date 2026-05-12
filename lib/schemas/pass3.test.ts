import { describe, it, expect } from 'vitest';
import { Pass3OutputSchema } from './pass3';

describe('Pass3OutputSchema', () => {
  it('validates a minimal corrected Pass 1 + change log', () => {
    const sample = {
      correction_against_audit_id: 'audit-test-20260512T120000Z',
      correction_attempt_number: 1,
      corrected_pass_1: {
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
    const bad = { correction_against_audit_id: 'x', correction_attempt_number: 1, corrected_pass_1: {} };
    expect(Pass3OutputSchema.safeParse(bad).success).toBe(false);
  });
});
