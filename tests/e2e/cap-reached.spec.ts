// tests/e2e/cap-reached.spec.ts
//
// Block 3 — Cap-reached layout end-to-end per Batch 11A Dispatch 2 Path (a)
// follow-up.
//
// Drives the state machine to `correction_failed_surfaced` (terminal cap-reached)
// via mocked live-mode flow. Mirrors Block 5's mock pattern but the SECOND
// Pass 2 (re-audit) returns correction_required:true, routing the machine to
// the cap-at-1 terminal per Decision 21 + stateMachine.ts:312–315.
//
// === BANNER TEXT DISCOVERY (REPORTED TO JP) ===
//
// Decision 21 spec quote: "Correction did not resolve all flagged violations.
// This case requires analyst review and judgment beyond the system's automated
// reasoning." — this text does NOT exist in the codebase. Searched components/,
// app/, no match. The cap-reached state renders ONLY:
//   - Four CapReachedSection labels (Decision 47g) inside a div with
//     data-testid="cap-reached-surface"
//   - ExaminerNotes (rendering CORRECTED Pass 1 examiner_notes_full prose)
//   - AnalystControlPanel (Decision 21: controls remain active)
// No banner, no header, no subtitle, no message text. The four section
// labels ARE the cap-reached signaling.
//
// Per JP's directive (the four-section structure is the load-bearing
// assertion; banner text is secondary), this test asserts the four labels
// in canonical order and reports the banner-text absence in the dispatch
// closeout. Adding banner text to the code is explicitly out of scope.
//
// === ARCHITECTURE NOTE (also reported) ===
//
// "Persona D is engineered to surface cap-reached" was the directive's
// original framing — superseded by Decision 27 (2026-05-10): all four
// personas PASS clean, cap-reached is structurally live-mode-only. The
// path (a) flow here exercises cap-reached via mocked live-mode, which
// is the only path that reaches `correction_failed_surfaced` in v1.

import { test, expect } from '@playwright/test';
import personasData from '../../data/personas.json';

const maria = (personasData.personas as Array<{ id: string; profile: any; pass_1: any; pass_2: any }>).find(
  (p) => p.id === 'maria',
)!;

// === Synthetic Pass 2 (FAIL — drives Pass 3) ===
// Lifts target_check_ids + regeneration_scope from pass_3_targeting (raw
// locked persona JSON stores them nested; client-side Pass2OutputSchema
// requires them at top level; normalizePass2 lifts at persona-load but
// page.route() bypasses that path).
const pass2FailDrivesPass3 = {
  ...maria.pass_2,
  correction_required: true,
  overall_status: 'FAIL',
  target_check_ids: ['synthetic_check_block3_001'],
  regeneration_scope: 'targeted',
  audit_summary:
    '[SYNTHETIC PLAYWRIGHT FIXTURE — Block 3] Material violation flagged; Pass 3 correction drives toward cap-reached terminal.',
  checks: [
    ...maria.pass_2.checks,
    {
      check_id: 'synthetic_check_block3_001',
      check_type: 'decision_basis_consistency',
      status: 'fail',
      severity: 'material',
      evidence_note: 'Synthetic fixture for cap-reached path — first audit.',
      regulatory_citation: null,
      rule_id: 'TE-02',
    },
  ],
  pass_3_targeting: {
    target_check_ids: ['synthetic_check_block3_001'],
    regeneration_scope: 'structured_decision_only',
    preservation_note: 'Preserve examiner_notes_full + summary_finding.',
  },
};

// === Synthetic Pass 3 (correction; bumps tier to EDD for distinguishability) ===
const correctedPass1 = {
  ...maria.pass_1,
  decision: {
    ...maria.pass_1.decision,
    recommended_tier: 'EDD',
    decision_basis: 'hybrid',
  },
};

const pass3Output = {
  correction_against_audit_id: 'mocked-audit-id-block3',
  correction_attempt_number: 1,
  corrected_pass_1_output: correctedPass1,
  change_log: [
    {
      field: 'decision.recommended_tier',
      before: 'Standard',
      after: 'EDD',
      reason:
        'Synthetic Block 3 fixture — bumps tier so the re-audit-still-FAIL state can be visibly distinguished between original (Standard, in "Original recommendation" section) and corrected (EDD).',
    },
  ],
  regeneration_scope_applied: 'structured_decision_only',
  correction_summary:
    'Synthetic Block 3 fixture; correction applied but re-audit will still flag (cap-at-1 trips).',
};

// === Synthetic Re-audit Pass 2 (still FAIL — caps at 1, drives correction_failed_surfaced) ===
// Per Decision 21 + stateMachine.ts:312-315: from re_audit, correction_required:true
// has no path to a second Pass 3 — routes to correction_failed_surfaced.
const pass2FailReAudit = {
  ...maria.pass_2,
  correction_required: true,
  overall_status: 'FAIL',
  target_check_ids: ['synthetic_check_block3_002'],
  regeneration_scope: 'targeted',
  audit_summary:
    '[SYNTHETIC PLAYWRIGHT FIXTURE — Block 3 re-audit] Pass 3 correction did not resolve the flagged violation; cap-at-1 trips → correction_failed_surfaced terminal.',
  checks: [
    ...maria.pass_2.checks,
    {
      check_id: 'synthetic_check_block3_002',
      check_type: 'decision_basis_consistency',
      status: 'fail',
      severity: 'material',
      evidence_note: 'Synthetic fixture for cap-reached path — re-audit still flags.',
      regulatory_citation: null,
      rule_id: 'TE-02',
    },
  ],
  pass_3_targeting: {
    target_check_ids: ['synthetic_check_block3_002'],
    regeneration_scope: 'full_regeneration',
    preservation_note: 'Cap-at-1 reached; no further Pass 3 attempt.',
  },
};

test.describe('Cap-reached layout — Decision 47g four-stacked-sections terminal (mocked live-mode)', () => {
  test('Pass 1 → Pass 2(FAIL) → Pass 3 → re-audit(FAIL) → correction_failed_surfaced terminal', async ({
    page,
  }) => {
    await page.setViewportSize({ width: 1280, height: 900 });

    let pass2CallCount = 0;
    const passInvocations: string[] = [];

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
        pass2CallCount += 1;
        // First Pass 2: FAIL → drives Pass 3. Second Pass 2 (re-audit): still
        // FAIL → cap-at-1 trips per Decision 21 + stateMachine.ts:312-315.
        const body = pass2CallCount === 1 ? pass2FailDrivesPass3 : pass2FailReAudit;
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(body),
        });
      } else if (pass === '3') {
        await route.fulfill({
          status: 200,
          contentType: 'application/json',
          body: JSON.stringify(pass3Output),
        });
      } else {
        await route.fulfill({
          status: 500,
          contentType: 'application/json',
          body: JSON.stringify({ error: `unexpected pass=${pass}` }),
        });
      }
    });

    await page.goto('/');
    await expect(page.getByTestId('idle-prompt')).toBeVisible();

    // Fill the form with Maria's profile.
    await page.getByLabel('Customer reference', { exact: true }).fill(maria.profile.customer_reference);
    await page.getByLabel('Identity document', { exact: true }).selectOption(maria.profile.identity_document_type);
    await page.getByLabel('Residency status', { exact: true }).selectOption(maria.profile.residency_status);
    await page.getByLabel('Customer type', { exact: true }).selectOption(maria.profile.customer_type);
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

    await page.getByRole('button', { name: 'Run three-pass analysis' }).click();

    // === Cap-reached terminal reached ===
    await expect(page.getByTestId('cap-reached-surface')).toBeVisible({ timeout: 20_000 });

    // === Four canonical section labels render in order (Decision 47g) ===
    // CapReachedSection renders each label as <h3 class="font-sans text-sm
    // font-semibold text-text-secondary">{label}</h3>. We grab all h3 headings
    // inside the cap-reached-surface and assert their text contents in order.
    const surface = page.getByTestId('cap-reached-surface');
    const sectionHeadings = surface.locator('h3.font-semibold');

    // The cap-reached surface has exactly four CapReachedSection h3 labels.
    // ExaminerNotes and AnalystControlPanel render below and may carry their
    // own headings; the four CapReachedSection h3's are the first four we
    // expect to find within the section. We assert by exact text using
    // hasText filters.
    await expect(surface.locator('h3', { hasText: 'Original recommendation' })).toBeVisible();
    await expect(surface.locator('h3', { hasText: 'Original audit' })).toBeVisible();
    await expect(surface.locator('h3', { hasText: 'Correction attempted' })).toBeVisible();
    await expect(surface.locator('h3', { hasText: 'Re-audit findings' })).toBeVisible();

    // Canonical ORDER (Decision 47g) — derive from DOM and assert the
    // sequence. allInnerTexts() returns the visible text of each match in
    // document order; we filter for the four canonical labels and assert
    // the relative ordering.
    const allHeadingTexts = await sectionHeadings.allInnerTexts();
    const canonicalOrder = [
      'Original recommendation',
      'Original audit',
      'Correction attempted',
      'Re-audit findings',
    ];
    const positionsOfCanonical = canonicalOrder.map((label) =>
      allHeadingTexts.findIndex((t) => t.trim() === label),
    );
    // Every canonical label is present.
    for (let i = 0; i < canonicalOrder.length; i++) {
      expect(positionsOfCanonical[i], `${canonicalOrder[i]} missing or duplicated`).toBeGreaterThanOrEqual(0);
    }
    // Strictly increasing positions ⇒ canonical order preserved.
    for (let i = 1; i < positionsOfCanonical.length; i++) {
      expect(
        positionsOfCanonical[i],
        `${canonicalOrder[i]} appears before ${canonicalOrder[i - 1]}`,
      ).toBeGreaterThan(positionsOfCanonical[i - 1]);
    }

    // === Original recommendation section renders the ORIGINAL tier ===
    // The "Original recommendation" CapReachedSection wraps a
    // <RecommendationCard pass1={pass1Output} /> (NOT effectivePass1) —
    // intentional per the cap-reached layout. The ORIGINAL tier (Standard,
    // from Maria's locked Pass 1) renders inside it.
    const originalRecSection = surface
      .locator('div.flex.flex-col.gap-3')
      .filter({ has: page.locator('h3', { hasText: 'Original recommendation' }) });
    await expect(originalRecSection.getByText('Standard', { exact: true }).first()).toBeVisible();

    // === Decision 21 regression guard — AnalystControlPanel remains active ===
    // The panel mounts via renderAnalystPanel() at correction_failed_surfaced.
    // Decision 21 contract: "controls remain active." All three action
    // buttons visible and clickable.
    await expect(page.getByRole('button', { name: 'Approve' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Escalate' })).toBeVisible();
    await expect(page.getByRole('button', { name: 'Override' })).toBeVisible();

    // === Decision 47e dual-mode regression guard ===
    // At correction_failed_surfaced, displayPass1 === effectivePass1 ===
    // pass3Output.corrected_pass_1_output (the CORRECTED Pass 1). Clicking
    // Approve triggers the ConfirmationView which renders
    // <RecommendationCard pass1={pass1} /> with pass1 === corrected pass1.
    // We assert the CORRECTED tier (EDD per fixture) surfaces here.
    await page.getByRole('button', { name: 'Approve' }).click();
    // ConfirmationView surfaces the corrected tier — proves AnalystControlPanel
    // received effectivePass1 (corrected), not pass1Output (original).
    // Two "EDD" elements may surface (one in the confirmation header text,
    // one in the RecommendationCard tier badge); .first() suffices for the
    // regression guard.
    await expect(page.getByText('EDD', { exact: true }).first()).toBeVisible({ timeout: 5_000 });

    // === Pass invocation pattern ===
    // 1 invocation of pass=1, 2 invocations of pass=2 (initial + re-audit),
    // 1 invocation of pass=3.
    expect(passInvocations.filter((p) => p === '1').length).toBeGreaterThanOrEqual(1);
    expect(passInvocations.filter((p) => p === '2').length).toBe(2);
    expect(passInvocations.filter((p) => p === '3').length).toBe(1);
    // Sequence order check: 1 → 2 → 3 → 2.
    const passOnly123Plus2 = passInvocations.filter((p) => p === '1' || p === '2' || p === '3');
    expect(passOnly123Plus2).toEqual(['1', '2', '3', '2']);

    // === Negative assertions ===
    // failed-state error message does NOT mount at correction_failed_surfaced
    // (cap-reached is distinct from the 'failed' state — see Decision 21
    // "system failed gracefully, route to human" framing).
    await expect(page.getByTestId('failed-error-message')).toHaveCount(0);
    // Pass 3 in-flight indicator is no longer mounted at terminal.
    await expect(page.getByTestId('pass-3-in-flight')).toHaveCount(0);
  });
});
