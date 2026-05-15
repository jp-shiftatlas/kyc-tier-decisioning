/*
 * tests/e2e/font-verification.spec.ts — Task 5.3 verification standard.
 *
 * Validates per Clarification 1 + 2:
 *   (a) font-serif utility on prose actually renders Source Serif 4 — first-position
 *       in the computed font-family chain, not fallback-shadowed by the @theme
 *       inline default ('Source Serif Pro').
 *   (b) font-mono utility on rule-ID actually renders JetBrains Mono — same standard.
 *   plus font-sans → Inter on heading, plus computed color resolution for token
 *   utilities (bg-surface-base, text-text-primary, text-accent-primary, border-border-default).
 *
 * Dual-assertion pattern (per Task 5.2 amendment thread):
 *   1. First-position parse: split fontFamily on comma, trim quotes, assert first token
 *      matches the target. Fails if the bridge variable is undefined and the @theme
 *      inline fallback ('Source Serif Pro' etc.) is doing the work instead of the
 *      next/font-loaded family.
 *   2. Chain-contains "<Family> Fallback": next/font generates a metric-adjusted
 *      fallback family (e.g., "Source Serif 4 Fallback") and emits it in the bridge
 *      variable. If next/font's CSS Modules class is not applied to <html>, this
 *      fallback name is absent — distinguishes loaded vs inline-fallback shadowing
 *      even when the loaded name and inline fallback name coincide (Inter, JetBrains
 *      Mono — both names appear in both positions).
 */
import { test, expect } from '@playwright/test';

function parseFontFamily(computed: string): string[] {
  return computed.split(',').map((tok) => tok.trim().replace(/^['"]|['"]$/g, '').trim());
}

test.describe('Task 5.3 — font-family resolution (next/font bridge → @theme stack → element)', () => {
  test('font-serif on prose: Source Serif 4 is first; Source Serif 4 Fallback present', async ({ page }) => {
    await page.goto('/font-verification');
    const fontFamily = await page
      .locator('[data-testid="serif-prose"]')
      .evaluate((el) => getComputedStyle(el).fontFamily);
    const tokens = parseFontFamily(fontFamily);
    expect(tokens[0]).toBe('Source Serif 4');
    expect(tokens).toContain('Source Serif 4 Fallback');
  });

  test('font-mono on rule-ID: JetBrains Mono is first; JetBrains Mono Fallback present', async ({ page }) => {
    await page.goto('/font-verification');
    const fontFamily = await page
      .locator('[data-testid="mono-ruleid"]')
      .evaluate((el) => getComputedStyle(el).fontFamily);
    const tokens = parseFontFamily(fontFamily);
    expect(tokens[0]).toBe('JetBrains Mono');
    expect(tokens).toContain('JetBrains Mono Fallback');
  });

  test('font-sans on heading: Inter is first; Inter Fallback present', async ({ page }) => {
    await page.goto('/font-verification');
    const fontFamily = await page
      .locator('[data-testid="sans-heading"]')
      .evaluate((el) => getComputedStyle(el).fontFamily);
    const tokens = parseFontFamily(fontFamily);
    expect(tokens[0]).toBe('Inter');
    expect(tokens).toContain('Inter Fallback');
  });

  test('body inherits Inter as first sans family via globals.css var(--font-sans)', async ({ page }) => {
    await page.goto('/font-verification');
    const fontFamily = await page
      .locator('body')
      .evaluate((el) => getComputedStyle(el).fontFamily);
    const tokens = parseFontFamily(fontFamily);
    expect(tokens[0]).toBe('Inter');
    expect(tokens).toContain('Inter Fallback');
  });
});

test.describe('Task 5.3 — token color resolution (Tailwind v4 @theme → utility classes)', () => {
  test('bg-surface-base resolves to visual_system.md §2 off-white #FAF8F4', async ({ page }) => {
    await page.goto('/font-verification');
    const bg = await page
      .locator('[data-testid="root-main"]')
      .evaluate((el) => getComputedStyle(el).backgroundColor);
    // CSS color computed values are returned as rgb(r, g, b); #FAF8F4 = rgb(250, 248, 244)
    expect(bg).toBe('rgb(250, 248, 244)');
  });

  test('text-text-primary resolves to visual_system.md §2 charcoal #1F2933', async ({ page }) => {
    await page.goto('/font-verification');
    const color = await page
      .locator('[data-testid="root-main"]')
      .evaluate((el) => getComputedStyle(el).color);
    // #1F2933 = rgb(31, 41, 51)
    expect(color).toBe('rgb(31, 41, 51)');
  });

  test('text-accent-primary resolves to visual_system.md §2 slate-blue #4A6B8A', async ({ page }) => {
    await page.goto('/font-verification');
    const color = await page
      .locator('[data-testid="accent-label"]')
      .evaluate((el) => getComputedStyle(el).color);
    // #4A6B8A = rgb(74, 107, 138)
    expect(color).toBe('rgb(74, 107, 138)');
  });

  test('border-border-default resolves to visual_system.md §2 warm-grey #D9D2C5', async ({ page }) => {
    await page.goto('/font-verification');
    const borderColor = await page
      .locator('[data-testid="bordered-region"]')
      .evaluate((el) => getComputedStyle(el).borderTopColor);
    // #D9D2C5 = rgb(217, 210, 197)
    expect(borderColor).toBe('rgb(217, 210, 197)');
  });
});
