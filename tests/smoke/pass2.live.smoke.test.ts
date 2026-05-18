// @vitest-environment node
//
// tests/smoke/pass2.live.smoke.test.ts
//
// Live Anthropic API smoke test for Pass 2 — regression guard for the
// prompt-vs-schema gap closed in Batch 11A Phase 2 by embedding a literal
// JSON output template in prompts/pass_2_system_prompt.md.
//
// Each case feeds the live API a locked-persona Pass 1 output as the
// Pass-2-input, then validates the model's audit response against
// Pass2OutputSchema. Persona choice spans the three decision-tier
// shapes the audit must handle:
//   - Maria   — Standard baseline      (clean audit expected)
//   - Carlos  — multi-factor EDD       (clean audit expected)
//   - persona_c (Convergent Hybrid)    — convergent EDD (clean audit expected)
//
// We do NOT assert on overall_status / correction_required values — the
// model may legitimately differ between calls. We assert contract
// conformance only.
//
// Skipped unless INTEGRATION=real AND ANTHROPIC_API_KEY is set to a real
// (non-stub) value.

import { describe, it, expect } from 'vitest';
import { Pass2OutputSchema } from '@/lib/schemas/pass2';
import { loadPersona, type PersonaId } from '@/lib/schemas/personaAdapters';
import { injectPrompt } from '@/lib/prompts/inject';
import { callPass } from '@/lib/anthropic/client';

const RUN = process.env.INTEGRATION === 'real';
const HAS_KEY =
  !!process.env.ANTHROPIC_API_KEY && !process.env.ANTHROPIC_API_KEY.startsWith('stub');
const describeOrSkip = RUN && HAS_KEY ? describe : describe.skip;

interface SmokeCase {
  readonly label: string;
  readonly personaId: PersonaId;
}

const CASES: readonly SmokeCase[] = [
  { label: 'Maria — Standard baseline',                      personaId: 'maria' },
  { label: 'Carlos — multi-factor EDD',                      personaId: 'carlos' },
  { label: 'persona_c (Convergent Hybrid) — convergent EDD', personaId: 'persona_c' },
];

describeOrSkip('Pass 2 — live Anthropic API schema conformance (smoke)', () => {
  for (const { label, personaId } of CASES) {
    it(`schema-conforming response: ${label}`, async () => {
      const persona = loadPersona(personaId);
      const systemPrompt = injectPrompt({
        pass: 2,
        profile: persona.profile,
        pass1: persona.pass_1,
      });
      const t0 = Date.now();
      const result = await callPass({
        pass: 2,
        systemPrompt,
        userMessage: 'Produce the Pass 2 audit JSON per the system prompt schema.',
        schema: Pass2OutputSchema,
      });
      const elapsed = Date.now() - t0;
      console.log(
        `[pass2-smoke] ${label} → ${elapsed}ms ok=${result.ok}` +
          (result.ok
            ? ` overall_status=${result.data.overall_status} correction_required=${result.data.correction_required} checks=${result.data.checks.length}`
            : ` errorType=${result.error.errorType} issues=${result.error.zodIssues?.length ?? 0}`),
      );
      if (!result.ok) {
        console.error('[pass2-smoke] zodIssues:', JSON.stringify(result.error.zodIssues, null, 2));
      }
      expect(result.ok).toBe(true);
    }, 120_000);
  }
});

describe('Pass 2 live-API smoke — runtime guard', () => {
  it('reports skip reason when not opted in', () => {
    if (!RUN) {
      console.log('[pass2-smoke] SKIPPED — set INTEGRATION=real');
    } else if (!HAS_KEY) {
      console.log('[pass2-smoke] SKIPPED — ANTHROPIC_API_KEY not set to a real value');
    } else {
      console.log('[pass2-smoke] RUNNING against live Anthropic API');
    }
    expect(true).toBe(true);
  });
});
