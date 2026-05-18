// @vitest-environment node
//
// tests/smoke/pass3.live.smoke.test.ts
//
// Live Anthropic API smoke test for Pass 3 — regression guard for the
// prompt-vs-schema gap closed in Batch 11A Phase 2 by embedding a literal
// JSON output template in prompts/pass_3_system_prompt.md.
//
// The four locked personas all PASS clean (Decision 21 / 27 — Pass 3 fires
// only on live custom input). To exercise Pass 3 from synthetic input we
// pair each locked persona's Pass 1 with a SYNTHETIC Pass 2 audit fixture
// that flags correction_required:true with a regeneration_scope value
// covering all three correction modes.
//
// Test goal is schema conformance only: the model must return JSON that
// conforms to Pass3OutputSchema (FLAT shape — corrected_pass_1_output,
// change_log, correction_against_audit_id, correction_attempt_number at the
// root; NOT nested under correction_metadata). The synthetic fault content
// is plausible but not load-bearing — the model may legitimately judge the
// claimed fault as immaterial; what we verify is response shape.
//
// Skipped unless INTEGRATION=real AND ANTHROPIC_API_KEY is set to a real
// (non-stub) value.

import { describe, it, expect } from 'vitest';
import { Pass3OutputSchema } from '@/lib/schemas/pass3';
import { loadPersona, type PersonaId } from '@/lib/schemas/personaAdapters';
import { injectPrompt } from '@/lib/prompts/inject';
import { callPass } from '@/lib/anthropic/client';

const RUN = process.env.INTEGRATION === 'real';
const HAS_KEY =
  !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('stub');
const describeOrSkip = RUN && HAS_KEY ? describe : describe.skip;

// Build a minimal synthetic Pass 2 fixture for a given regeneration_scope.
// The fixture is plausible audit output, not a contract: its sole role is to
// drive Pass 3 into one of its three correction modes so the smoke test
// exercises that code path and validates the schema-conforming response.
function syntheticPass2(opts: {
  scope: 'structured_decision_only' | 'examiner_notes_only' | 'full_regeneration';
  syntheticCheckId: string;
  faultSummary: string;
  ruleId?: string;
  checkType:
    | 'rule_firing'
    | 'register_compliance'
    | 'decision_basis_consistency'
    | 'consistency';
  preservationNote: string;
}): Record<string, unknown> {
  return {
    target_check_ids: [opts.syntheticCheckId],
    regeneration_scope: 'targeted',
    correction_required: true,
    audit_summary: `[SYNTHETIC SMOKE-TEST FIXTURE] ${opts.faultSummary}`,
    overall_status: 'FAIL',
    checks: [
      {
        check_id: opts.syntheticCheckId,
        rule_id: opts.ruleId ?? null,
        check_type: opts.checkType,
        status: 'fail',
        severity: 'material',
        evidence_note: `Synthetic fixture for Pass 3 smoke test — ${opts.faultSummary}`,
        regulatory_citation: null,
      },
    ],
    severity_counts: { critical: 0, material: 1, quality: 0 },
    metadata: {
      audit_generated_at: new Date().toISOString(),
      ruleset_version: 'v1',
      smoke_test_fixture: true,
    },
    pass_3_targeting: {
      target_check_ids: [opts.syntheticCheckId],
      regeneration_scope: opts.scope,
      preservation_note: opts.preservationNote,
    },
  };
}

interface SmokeCase {
  readonly label: string;
  readonly personaId: PersonaId;
  readonly buildPass2: () => Record<string, unknown>;
}

const CASES: readonly SmokeCase[] = [
  {
    label: 'Maria + structured_decision_only fault',
    personaId: 'maria',
    buildPass2: () =>
      syntheticPass2({
        scope: 'structured_decision_only',
        syntheticCheckId: 'synth_check_p3_001',
        ruleId: 'TE-02',
        checkType: 'decision_basis_consistency',
        faultSummary:
          'decision.decision_basis stated as score_based but the TE-02 baseline-rule pattern can also be characterized as hard_rule on the SDD-ineligibility floor; recommend Pass 3 re-affirm decision_basis with a more explicit decisive_rule_ids justification.',
        preservationNote:
          'Preserve all examiner_notes_full sections, summary_finding, rules_fired array, risk_score, and recommended_edd_procedures.',
      }),
  },
  {
    label: 'Carlos + examiner_notes_only fault',
    personaId: 'carlos',
    buildPass2: () =>
      syntheticPass2({
        scope: 'examiner_notes_only',
        syntheticCheckId: 'synth_check_p3_002',
        ruleId: 'DC-07',
        checkType: 'register_compliance',
        faultSummary:
          'examiner_notes_full.audit_trail satisfies the substantive documentation requirement but lacks an inline reference to NPC Advisory 2024-04 by name; recommend Pass 3 add the named regulatory anchor to the audit_trail prose.',
        preservationNote:
          'Preserve the entire structured decision layer (decision, risk_score, rules_fired, recommended_edd_procedures), summary_finding, and all examiner_notes_full sections OTHER than audit_trail.',
      }),
  },
  {
    label: 'persona_c (Convergent Hybrid) + full_regeneration fault',
    personaId: 'persona_c',
    buildPass2: () =>
      syntheticPass2({
        scope: 'full_regeneration',
        syntheticCheckId: 'synth_check_p3_003',
        // ruleId omitted — full_regeneration faults aren't rule-scoped
        checkType: 'consistency',
        faultSummary:
          'Multiple internal-consistency concerns require fresh re-derivation: risk_score.total reconciliation, examiner_notes_full.rule_application alignment with rules_fired, and summary_finding consistency with decision; recommend Pass 3 re-derive the full output while preserving correct rule-firing decisions.',
        preservationNote:
          'No field-level preservation contract; however, correct rule-firing decisions (per the ruleset) should converge with the original wherever they were correct on the merits.',
      }),
  },
];

describeOrSkip('Pass 3 — live Anthropic API schema conformance (smoke)', () => {
  for (const { label, personaId, buildPass2 } of CASES) {
    it(`schema-conforming response: ${label}`, async () => {
      const persona = loadPersona(personaId);
      const auditId = `smoke-audit-${personaId}-${Date.now()}`;
      const pass2Fixture = buildPass2();
      const systemPrompt = injectPrompt({
        pass: 3,
        profile: persona.profile,
        pass1: persona.pass_1,
        pass2: pass2Fixture,
        orchestration: { audit_id: auditId, attempt: 1 },
      });
      const t0 = Date.now();
      const result = await callPass({
        pass: 3,
        systemPrompt,
        userMessage: 'Produce the Pass 3 correction JSON per the system prompt schema.',
        schema: Pass3OutputSchema,
      });
      const elapsed = Date.now() - t0;
      console.log(
        `[pass3-smoke] ${label} → ${elapsed}ms ok=${result.ok}` +
          (result.ok
            ? ` change_log_entries=${result.data.change_log.length} scope_applied=${result.data.regeneration_scope_applied ?? '<absent>'}`
            : ` errorType=${result.error.errorType} issues=${result.error.zodIssues?.length ?? 0}`),
      );
      if (!result.ok) {
        console.error('[pass3-smoke] zodIssues:', JSON.stringify(result.error.zodIssues, null, 2));
      }
      expect(result.ok).toBe(true);
    }, 120_000);
  }
});

describe('Pass 3 live-API smoke — runtime guard', () => {
  it('reports skip reason when not opted in', () => {
    if (!RUN) {
      console.log('[pass3-smoke] SKIPPED — set INTEGRATION=real');
    } else if (!HAS_KEY) {
      console.log('[pass3-smoke] SKIPPED — ANTHROPIC_API_KEY not set to a real value');
    } else {
      console.log('[pass3-smoke] RUNNING against live Anthropic API');
    }
    expect(true).toBe(true);
  });
});
