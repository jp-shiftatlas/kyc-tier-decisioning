// tests/e2e/live-happy-path.spec.ts
//
// Block 4 — Custom-input live mode happy path per Batch 11A Dispatch 2.
//
// Real form submit flow with /api/decisioning?pass=N responses intercepted by
// Playwright's page.route() handler. The route handler is NOT hit; the live
// Anthropic API is NOT called. We use Maria's locked persona output as the
// mocked Pass 1 / Pass 2 response payloads so the canonical assertion target
// stays in lockstep with the persona contract.
//
// API mocking strategy: Playwright's `page.route('**/api/decisioning**')`
// intercept dispatched by query parameter (pass=1 / pass=2). One handler
// inspects URL.searchParams.get('pass') and fulfills with the appropriate
// locked persona slice. Rationale: native to Playwright, no extra dependency,
// works against `next dev`'s actual fetch lifecycle (the route handler is
// never invoked because Playwright fulfills before the network request lands).
//
// DEBUG_MODE disposition: the env-gated ?force_correction=1 toggle at
// app/api/decisioning/route.ts:292-302 fires inside the route handler. With
// page.route() interception the handler is bypassed, so the toggle is
// irrelevant for these tests. DEBUG_MODE matters for Batch 11B Vercel-preview
// rehearsal (where the real route handler runs); Playwright tests with mocked
// routes don't need it.

import { test, expect } from '@playwright/test';
import personasData from '../../data/personas.json';

const maria = (personasData.personas as Array<{ id: string; profile: any; pass_1: any; pass_2: any }>).find(
  (p) => p.id === 'maria',
)!;

// Lift schema-required top-level fields out of pass_3_targeting. The locked
// persona JSON stores `target_check_ids` and `regeneration_scope` inside
// `pass_3_targeting`; lib/schemas/personaAdapters.ts:normalizePass2 lifts
// them at load time. Since page.route() bypasses both the route handler AND
// the persona-adapter, we lift them here so the client-side Pass2OutputSchema
// re-validation (Finding 8 double-validation discipline) succeeds.
const mariaPass2 = {
  ...maria.pass_2,
  target_check_ids: maria.pass_2.pass_3_targeting?.target_check_ids ?? [],
  regeneration_scope: maria.pass_2.pass_3_targeting?.regeneration_scope ?? 'none',
};

const PAGE_HEADER_TAGLINE =
  'Three-pass reasoning pipeline — Shift Atlas consulting methodology demonstration';

test.describe('Live custom-input — mocked happy path (Maria-baseline Standard tier)', () => {
  test('form submit → Pass 1 → Pass 2 → terminal; Custom case microcopy; AnalystControlPanel mounts from pass_2 onward', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    // Track mock invocations so we can assert ordering.
    const passInvocations: string[] = [];

    // Mock /api/decisioning?pass=N — fulfill before the request reaches Next.
    await page.route('**/api/decisioning*', async (route) => {
      const url = new URL(route.request().url());
      const pass = url.searchParams.get('pass');
      passInvocations.push(pass ?? '<missing>');
      if (pass === '1') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(maria.pass_1),
        });
      } else if (pass === '2') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(mariaPass2),
        });
      } else {
        // Pass 3 should NOT fire on a clean Maria-shaped audit.
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: `unexpected pass=${pass}` }),
        });
      }
    });

    await page.goto('/');
    await expect(page.getByTestId('idle-prompt')).toBeVisible();

    // Fill the form using Maria's profile shape (the canonical Standard
    // baseline input). The field labels match visual_system.md §5.6 +
    // CustomInputForm.tsx <Field label="..."> wrappers.
    await page.getByLabel('Customer reference', { exact: true }).fill(maria.profile.customer_reference);
    await page.getByLabel('Identity document', { exact: true }).selectOption(maria.profile.identity_document_type);
    await page.getByLabel('Residency status', { exact: true }).selectOption(maria.profile.residency_status);
    await page.getByLabel('Customer type', { exact: true }).selectOption(maria.profile.customer_type);

    // Occupation: enum branch. Select "From list" → enum dropdown.
    await page.getByLabel('Occupation', { exact: true }).selectOption('enum');
    await page.getByLabel('Occupation (from list)', { exact: true }).selectOption(maria.profile.occupation_type);

    await page.getByLabel('Source of funds', { exact: true }).selectOption(maria.profile.source_of_funds);
    await page.getByLabel('Account purpose', { exact: true }).selectOption(maria.profile.account_purpose);
    await page.getByLabel('Expected monthly volume', { exact: true }).fill(String(maria.profile.expected_monthly_volume_php));
    await page.getByLabel('PEP status', { exact: true }).selectOption(maria.profile.pep_status);
    await page.getByLabel('Sanctions screening', { exact: true }).selectOption(maria.profile.sanctions_screening);
    await page.getByLabel('High-risk jurisdiction connection', { exact: true }).selectOption(maria.profile.high_risk_jurisdiction_connection);
    await page.getByLabel('Adverse media', { exact: true }).selectOption(maria.profile.adverse_media);
    await page.getByLabel('Years with bank', { exact: true }).selectOption(maria.profile.years_with_bank);

    // Submit.
    await page.getByRole('button', { name: 'Run three-pass analysis' }).click();

    // Pass 1 invocation should fire first.
    await expect.poll(() => passInvocations.length, { timeout: 10_000 }).toBeGreaterThan(0);

    // Audit panel ticker mounts when Pass 2 begins.
    await expect(page.getByTestId('audit-panel-ticker')).toBeVisible({ timeout: 15_000 });

    // Terminal state: Pass 2 returns PASS clean → passed_first_audit.
    // RecommendationCard renders the Standard tier badge. We assert by text.
    await expect(
      page.getByText(maria.pass_1.decision.recommended_tier, { exact: true }).first(),
    ).toBeVisible({ timeout: 15_000 });

    // Decision 47d regression guard: AnalystControlPanel mounts from pass_2
    // onward. At terminal (passed_first_audit) the three action buttons are
    // present and enabled.
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible({ timeout: 5_000 });
    await expect(page.getByRole('button', { name: 'Escalate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Override' })).toBeVisible();

    // Decision 47h regression guard: 'Custom case' microcopy renders, NOT
    // the customer_reference value. Iteration 1 surfaced the duplication;
    // mode-label rework restored role distinction. The label appears in the
    // ExaminerNotes header second line as "Custom case · <customer_reference>"
    // — substring match against "Custom case" picks up that paragraph.
    await expect(page.getByText(/Custom case/).first()).toBeVisible();

    // Cap-reached and Pass-3-in-flight do NOT mount on a clean audit.
    await expect(page.getByTestId('cap-reached-surface')).toHaveCount(0);
    await expect(page.getByTestId('pass-3-in-flight')).toHaveCount(0);
    await expect(page.getByText('Pass 3 — Correction applied')).toHaveCount(0);

    // Pass invocation ordering: pass=1, then pass=2. Pass 3 must NOT fire.
    expect(passInvocations.filter((p) => p === '1').length).toBeGreaterThanOrEqual(1);
    expect(passInvocations.filter((p) => p === '2').length).toBeGreaterThanOrEqual(1);
    expect(passInvocations.filter((p) => p === '3').length).toBe(0);
    // Pass 1 fires before Pass 2.
    expect(passInvocations.indexOf('1')).toBeLessThan(passInvocations.indexOf('2'));

    // Page header tagline still visible (composition layer didn't unmount).
    await expect(page.getByText(PAGE_HEADER_TAGLINE)).toBeVisible();
  });
});
