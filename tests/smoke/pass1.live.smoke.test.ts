// @vitest-environment node
//
// tests/smoke/pass1.live.smoke.test.ts
//
// Live Anthropic API smoke test for Pass 1 — regression guard for the
// prompt-vs-schema gap diagnosed in Batch 11A Phase 1 (May 17, 2026) and
// closed in Phase 2 by embedding a literal JSON output template in
// prompts/pass_1_system_prompt.md.
//
// Three profiles exercise different decision tiers / decisive rules to
// confirm the template-driven schema conformance holds across the response
// space, not just on the clean Standard baseline.
//
// Skipped unless INTEGRATION=real AND ANTHROPIC_API_KEY is set to a real
// (non-stub) value. Default `pnpm test` excludes tests/smoke/** via
// vitest.config.ts.
//
// Run: pnpm test:smoke
// Or:  INTEGRATION=real ANTHROPIC_API_KEY=sk-ant-... corepack pnpm vitest run tests/smoke

import { describe, it, expect } from 'vitest';
import { Pass1OutputSchema } from '@/lib/schemas/pass1';
import { CustomerProfileSchema, type CustomerProfile } from '@/lib/schemas/customerProfile';
import { injectPrompt } from '@/lib/prompts/inject';
import { callPass } from '@/lib/anthropic/client';

const RUN = process.env.INTEGRATION === 'real';
const HAS_KEY =
  !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('stub');
const describeOrSkip = RUN && HAS_KEY ? describe : describe.skip;

interface SmokeCase {
  readonly label: string;
  readonly profile: CustomerProfile;
}

const CASES: readonly SmokeCase[] = [
  {
    label: 'clean baseline (Standard tier expected)',
    profile: CustomerProfileSchema.parse({
      customer_reference: 'Smoke-CleanBaseline-Pass1',
      identity_document_type: 'PhilSys',
      residency_status: 'PH resident',
      customer_type: 'individual retail',
      occupation_type: 'employed',
      source_of_funds: 'salary',
      account_purpose: 'savings',
      expected_monthly_volume_php: 80000,
      pep_status: 'none',
      sanctions_screening: 'clean',
      high_risk_jurisdiction_connection: 'none',
      adverse_media: 'no',
      years_with_bank: '3-5',
    }),
  },
  {
    label: 'PEP-self (foreign PEP, EDD expected via ES-01)',
    profile: CustomerProfileSchema.parse({
      customer_reference: 'Smoke-PEPself-Pass1',
      identity_document_type: 'passport',
      residency_status: 'PH resident',
      customer_type: 'individual retail',
      occupation_type: 'business owner',
      source_of_funds: 'business',
      account_purpose: 'savings',
      expected_monthly_volume_php: 350000,
      pep_status: 'foreign PEP',
      sanctions_screening: 'clean',
      high_risk_jurisdiction_connection: 'none',
      adverse_media: 'no',
      years_with_bank: '1-3',
    }),
  },
  {
    label: 'OFW + minor adverse media (convergent-EDD pattern)',
    profile: CustomerProfileSchema.parse({
      customer_reference: 'Smoke-OFW-Adverse-Pass1',
      identity_document_type: 'passport',
      residency_status: 'OFW',
      customer_type: 'individual retail',
      occupation_type: 'OFW',
      source_of_funds: 'remittance',
      account_purpose: 'savings',
      expected_monthly_volume_php: 250000,
      pep_status: 'none',
      sanctions_screening: 'clean',
      high_risk_jurisdiction_connection: 'none',
      adverse_media: 'minor flags',
      years_with_bank: '1-3',
    }),
  },
];

describeOrSkip('Pass 1 — live Anthropic API schema conformance (smoke)', () => {
  for (const { label, profile } of CASES) {
    it(`schema-conforming response: ${label}`, async () => {
      const systemPrompt = injectPrompt({ pass: 1, profile });
      const t0 = Date.now();
      const result = await callPass({
        pass: 1,
        systemPrompt,
        userMessage: 'Produce the Pass 1 output JSON per the system prompt schema.',
        schema: Pass1OutputSchema,
      });
      const elapsed = Date.now() - t0;
      console.log(
        `[pass1-smoke] ${label} → ${elapsed}ms ok=${result.ok}` +
          (result.ok
            ? ` tier=${result.data.decision.recommended_tier} basis=${result.data.decision.decision_basis} rules_fired=${result.data.rules_fired.length}`
            : ` errorType=${result.error.errorType} issues=${result.error.zodIssues?.length ?? 0}`),
      );
      if (!result.ok) {
        console.error('[pass1-smoke] zodIssues:', JSON.stringify(result.error.zodIssues, null, 2));
      }
      expect(result.ok).toBe(true);
    }, 90_000);
  }
});

// Always-running guard so the file's presence is visible in default runs.
describe('Pass 1 live-API smoke — runtime guard', () => {
  it('reports skip reason when not opted in', () => {
    if (!RUN) {
      console.log('[pass1-smoke] SKIPPED — set INTEGRATION=real');
    } else if (!HAS_KEY) {
      console.log('[pass1-smoke] SKIPPED — ANTHROPIC_API_KEY not set to a real value');
    } else {
      console.log('[pass1-smoke] RUNNING against live Anthropic API');
    }
    expect(true).toBe(true);
  });
});
