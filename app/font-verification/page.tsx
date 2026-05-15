/*
 * app/font-verification/page.tsx — Task 5.3 font + token verification harness.
 *
 * Originally lived at app/page.tsx as the build's initial verification surface
 * (Task 5.3). At Batch 10.2, app/page.tsx was rewritten into the assembled
 * page (PersonaSelector → decisioning surface → CustomInputForm →
 * ArchitectureStrip); the Task 5.3 harness relocated here to preserve the
 * Playwright e2e (tests/e2e/font-verification.spec.ts), which was retargeted
 * from `/` to `/font-verification` in the same commit.
 *
 * Scope unchanged from Task 5.3 (per JP scope note): this page exists to
 * prove tokens flow end-to-end and the loader does what visual_system.md §3
 * specifies. Not a real page; not consumed by any UI flow. The Playwright
 * e2e at tests/e2e/font-verification.spec.ts is the sole consumer.
 *
 * Each utility application below is a verification surface, named via
 * data-testid for the Playwright assertions:
 *   - bg-surface-base, text-text-primary  → root surface + body text color
 *   - font-sans + text-lg                 → Inter rendering on heading
 *   - font-serif + text-md + leading-loose → Source Serif 4 rendering on prose
 *   - font-mono                           → JetBrains Mono rendering on rule-ID
 *   - text-accent-primary                 → accent color application
 *   - border-border-default               → border color emission
 */
export default function FontVerificationPage() {
  return (
    <main
      className="bg-surface-base text-text-primary px-12 py-16"
      data-testid="root-main"
    >
      <h1
        className="text-lg font-sans"
        data-testid="sans-heading"
      >
        KYC Tier Decisioning
      </h1>

      <p
        className="mt-4 font-serif text-md leading-loose"
        data-testid="serif-prose"
      >
        Token verification harness. Relocated from / to /font-verification at
        Batch 10.2 to preserve the e2e while making room for the assembled
        page at the root route.
      </p>

      <p className="mt-4">
        <span className="font-mono" data-testid="mono-ruleid">DC-07</span>
        {' · '}
        <span className="text-accent-primary" data-testid="accent-label">
          accent application
        </span>
      </p>

      <div
        className="mt-4 border border-border-default p-4 text-sm text-text-secondary"
        data-testid="bordered-region"
      >
        Bordered region verifying border-border-default + text-text-secondary.
      </div>
    </main>
  );
}
