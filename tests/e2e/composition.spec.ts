// tests/e2e/composition.spec.ts
//
// Block 1 — Composition layer smoke per Batch 11A Dispatch 2.
//
// Surface-level checks that the assembled page renders without errors at:
//   - Design-target viewport: 1280×900 (default per playwright.config.ts)
//   - Functional-floor viewport: mobile per Decision 39 three-tier hierarchy
//
// Assertions intentionally scoped to composition-layer concerns ONLY:
//   - PageHeader tagline visible (47a regression guard)
//   - PageFooter regulatory citations visible
//   - ArchitectureStrip five-box section rendered
//   - AnalystControlPanel hidden in idle state (47d regression guard:
//     panel mounts from pass_2 onward, not idle)
//   - 'idle' state prompt visible (47f canonical microcopy)
//
// Primitive-layer assertions (Button, Modal, Chip styling) are NOT duplicated
// here — those are covered by existing Vitest component tests.

import { test, expect } from '@playwright/test';

const PAGEHEADER_TAGLINE =
  'Three-pass reasoning pipeline — Shift Atlas consulting methodology demonstration';
const IDLE_PROMPT = 'Select a persona or fill the custom case form to begin.';

test.describe('Composition layer — assembled page renders at design-target viewport (1280×900)', () => {
  test('all composition landmarks render in idle state at 1280×900', async ({ page }) => {
    // Default viewport is 1280×900 per playwright.config.ts; explicit here for clarity.
    await page.setViewportSize({ width: 1280, height: 900 });
    await page.goto('/');

    // PageHeader: tagline visible (47a canonical microcopy).
    await expect(page.getByTestId('page-header')).toBeVisible();
    await expect(page.getByText(PAGEHEADER_TAGLINE)).toBeVisible();

    // PageFooter: regulatory citations + architecture statements + attribution.
    await expect(page.getByTestId('page-footer')).toBeVisible();
    await expect(page.getByTestId('footer-regulatory-citations')).toBeVisible();
    await expect(page.getByTestId('footer-architecture-statements')).toBeVisible();
    await expect(page.getByTestId('footer-attribution')).toBeVisible();

    // ArchitectureStrip: five-box section landmark.
    await expect(page.getByTestId('architecture-strip')).toBeVisible();

    // Idle state: idle prompt visible with canonical microcopy (47f).
    await expect(page.getByTestId('idle-prompt')).toBeVisible();
    await expect(page.getByTestId('idle-prompt')).toHaveText(IDLE_PROMPT);

    // Persona selector mounted (idle state owns the persona-section by virtue
    // of orchestrator's section landmarks rendering unconditionally).
    await expect(page.getByTestId('persona-selector')).toBeVisible();
    await expect(page.getByTestId('custom-input-section')).toBeVisible();

    // Decision 47d regression guard: AnalystControlPanel does NOT mount in idle.
    // The panel's mount surface is the AnalystControlPanel component; it
    // surfaces three Buttons (Approve / Escalate / Override) when mounted.
    // Asserting absence of the panel's button trio is the structural test.
    await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Escalate' })).toHaveCount(0);
    await expect(page.getByRole('button', { name: 'Override' })).toHaveCount(0);

    // Cap-reached surface and Pass 3 in-flight indicator are not mounted in idle.
    await expect(page.getByTestId('cap-reached-surface')).toHaveCount(0);
    await expect(page.getByTestId('pass-3-in-flight')).toHaveCount(0);
  });
});

test.describe('Composition layer — assembled page renders at functional-floor viewport (mobile, Decision 39)', () => {
  test('all composition landmarks render in idle state at 375×812 (iPhone 13 baseline)', async ({
    page,
  }) => {
    // Decision 39 three-tier hierarchy: functional floor is the mobile portrait
    // form. 375×812 matches the iPhone 13 / 14 logical viewport — within the
    // mobile-floor tier per the breakpoint mapping.
    await page.setViewportSize({ width: 375, height: 812 });
    await page.goto('/');

    // Same landmarks as desktop — the mobile reflow (Batch 10.4) preserved
    // visibility of every section, just stacks them single-column.
    await expect(page.getByTestId('page-header')).toBeVisible();
    await expect(page.getByText(PAGEHEADER_TAGLINE)).toBeVisible();

    await expect(page.getByTestId('page-footer')).toBeVisible();
    await expect(page.getByTestId('footer-regulatory-citations')).toBeVisible();

    await expect(page.getByTestId('architecture-strip')).toBeVisible();
    await expect(page.getByTestId('idle-prompt')).toBeVisible();
    await expect(page.getByTestId('idle-prompt')).toHaveText(IDLE_PROMPT);

    await expect(page.getByTestId('persona-selector')).toBeVisible();
    await expect(page.getByTestId('custom-input-section')).toBeVisible();

    // Same idle-state guarantees as 1280px.
    await expect(page.getByRole('button', { name: 'Approve' })).toHaveCount(0);
    await expect(page.getByTestId('cap-reached-surface')).toHaveCount(0);
  });
});
