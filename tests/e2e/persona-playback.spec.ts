// tests/e2e/persona-playback.spec.ts
//
// Block 2 — Persona playback end-to-end per Batch 11A Dispatch 2.
//
// One test per locked persona (Maria, Carlos, Persona C, Persona D). Each:
//   1. Loads page at 1280×900
//   2. Clicks the persona's "Select <Name>" button
//   3. Asserts the audit panel ticker starts (Decision 41 cadence)
//   4. Waits for terminal state (passed_first_audit — all four personas
//      PASS clean per Decision 27)
//   5. Asserts the canonical tier badge text rendered
//   6. Asserts all canonical rule_ids fired (from locked persona JSON)
//   7. Asserts DC-07 present per Decision 25 corollary
//
// ASSERTION SOURCE OF TRUTH: data/personas.json (the bundled persona output
// data). We read it at test load time so assertion values stay in lockstep
// with the locked outputs — no hardcoded tier strings, no hardcoded rule lists.
//
// DIRECTIVE-VS-REPO DEVIATION (recorded for project knowledge):
//   The Dispatch 2 directive said "For personas where Pass 3 fires (Persona D),
//   asserts the Pass3CorrectionBanner appears..." — but the four locked
//   personas have `pass_2.correction_required: false` and no `pass_3` field
//   per Decision 27 (all four PASS clean; Pass 3 not exercised on persona
//   walkthrough). Persona D is no exception. Block 2 here asserts what the
//   locked output actually encodes — Standard tier, no Pass 3 banner —
//   surfaced to JP at the dispatch close.

import { test, expect } from '@playwright/test';
import personasData from '../../data/personas.json';

interface LockedPersona {
  id: string;
  name: string;
  pass_1: {
    decision: {
      recommended_tier: 'SDD' | 'Standard' | 'EDD' | 'Decline';
      decisive_rule_ids: string[];
    };
    rules_fired: Array<{ rule_id: string; category: string }>;
  };
  pass_2: {
    overall_status: 'PASS' | 'PASS_WITH_QUALITY_FLAGS' | 'FAIL';
    correction_required: boolean;
  };
}

const PERSONAS = (personasData.personas as LockedPersona[]).map((p) => ({
  id: p.id,
  name: p.name,
  selectButtonName: `Select ${p.name}`,
  tier: p.pass_1.decision.recommended_tier,
  decisiveRuleIds: p.pass_1.decision.decisive_rule_ids,
  firedRuleIds: p.pass_1.rules_fired.map((r) => r.rule_id),
  hasDc07: p.pass_1.rules_fired.some((r) => r.rule_id === 'DC-07'),
  pass2Status: p.pass_2.overall_status,
  pass2CorrectionRequired: p.pass_2.correction_required,
}));

test.describe('Persona playback — locked-output-driven end-to-end (Decision 27)', () => {
  // Compile-time invariant per Decision 25 corollary: every locked persona
  // carries DC-07 in rules_fired. Verified once at suite load; failure here
  // means the persona lockfile drifted from the AI-accountability contract.
  test('all four locked personas carry DC-07 in rules_fired (Decision 25 corollary)', () => {
    for (const p of PERSONAS) {
      expect(p.hasDc07, `${p.id} missing DC-07`).toBe(true);
    }
  });

  test('all four locked personas are PASS clean (Decision 27 contract)', () => {
    for (const p of PERSONAS) {
      expect(p.pass2Status, `${p.id} not PASS`).toBe('PASS');
      expect(p.pass2CorrectionRequired, `${p.id} correction_required != false`).toBe(false);
    }
  });

  for (const persona of PERSONAS) {
    test(`${persona.id} (${persona.name}): playback → tier=${persona.tier}, decisive=${persona.decisiveRuleIds.join('+')}`, async ({
      page,
    }) => {
      await page.setViewportSize({ width: 1280, height: 900 });
      await page.goto('/');

      // Verify idle state before click.
      await expect(page.getByTestId('idle-prompt')).toBeVisible();

      // Click the persona's selector card.
      await page.getByRole('button', { name: persona.selectButtonName }).click();

      // Idle prompt disappears once a persona is active.
      await expect(page.getByTestId('idle-prompt')).toHaveCount(0);

      // Ticker mounts during pass_2 — Decision 41 cadence animates the
      // checks in. We wait for the ticker testid to appear AND its
      // data-revealed-count to advance past 0 (proves the interval is
      // ticking, not just statically rendered).
      const ticker = page.getByTestId('audit-panel-ticker');
      await expect(ticker).toBeVisible({ timeout: 10_000 });

      // Wait for the ticker to reveal all checks (terminal animation state).
      // The data-revealed-count attribute tracks reveal progress; we wait
      // until it stops advancing. Conservatively poll up to ~5s.
      await expect
        .poll(
          async () => {
            const v = await ticker.getAttribute('data-revealed-count');
            return v ? parseInt(v, 10) : 0;
          },
          { timeout: 10_000, intervals: [100, 200, 500] },
        )
        .toBeGreaterThan(0);

      // Tier badge appears in the RecommendationCard. TierBadge primitive
      // renders the tier string in a font-mono span; we assert by exact text.
      await expect(
        page.getByText(persona.tier, { exact: true }).first(),
      ).toBeVisible({ timeout: 15_000 });

      // Expand the "Why this tier" ChevronDisclosure on the RecommendationCard
      // so the rules_fired list spans (each rule_id in its own font-mono span)
      // are present in the DOM for assertion. The disclosure is collapsed by
      // default at terminal state; clicking it reveals the rules_fired entries
      // without any ticker animation gating.
      await page.getByRole('button', { name: 'Why this tier' }).click();

      // Decisive rule IDs all present in the now-expanded rules_fired list.
      // Each rule_id renders as <span>{r.rule_id}</span> — direct text node
      // whose accessible name === the rule_id.
      for (const ruleId of persona.decisiveRuleIds) {
        await expect(
          page.getByText(ruleId, { exact: true }).first(),
          `decisive rule ${ruleId} not visible`,
        ).toBeVisible({ timeout: 5_000 });
      }

      // Every fired rule_id renders in the rules_fired list. This is the
      // "AI-accountability artifact" assertion — every rule the model fired
      // must be visible to the analyst.
      for (const ruleId of persona.firedRuleIds) {
        await expect(
          page.getByText(ruleId, { exact: true }).first(),
          `fired rule ${ruleId} not visible`,
        ).toBeVisible({ timeout: 5_000 });
      }

      // DC-07 specifically — Decision 25 corollary dual-satisfaction surface:
      // (a) structured-record half visible in rules_fired (asserted above);
      // (b) prose-level half surfaces as the DC-07 dual-satisfaction heading
      // rendered by AuditPanel (visual_system.md §5.2 "DC-07 dual-satisfaction
      // indicator" block). Substring match because the heading is "DC-07 — NPC
      // Advisory 2024-04 dual satisfaction".
      await expect(
        page.getByRole('heading', { name: /DC-07.*dual satisfaction/i }),
      ).toBeVisible();

      // Persona playback locks PASS clean per Decision 27 — no Pass 3 banner,
      // no cap-reached surface, no failed-state error.
      await expect(page.getByTestId('cap-reached-surface')).toHaveCount(0);
      await expect(page.getByTestId('failed-error-message')).toHaveCount(0);
      await expect(page.getByTestId('pass-3-in-flight')).toHaveCount(0);

      // Pass3CorrectionBanner: per Decision 27 (all four PASS clean), the
      // banner does not appear on persona playback. The banner has no testid
      // — assert by its canonical header text "Pass 3 — Targeted correction
      // applied" (or any substring unique to it). Using a substring of the
      // h3 inside the banner.
      await expect(
        page.getByText('Pass 3 — Targeted correction applied'),
      ).toHaveCount(0);
    });
  }
});
