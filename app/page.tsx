/*
 * app/page.tsx — Task 5.3 token verification harness.
 *
 * Scope (per JP scope note): this page exists to prove tokens flow end-to-end
 * and the loader does what visual_system.md §3 specifies. Not the start of any
 * real component. Real page assembly lands in Batch 10. No decorative shells,
 * no proto-layout that anticipates Batch 7.
 *
 * Each utility application below is a verification surface, named via data-testid
 * for the Playwright assertions in tests/e2e/font-verification.spec.ts:
 *   - bg-surface-base, text-text-primary  → root surface + body text color
 *   - font-sans + text-lg                 → Inter rendering on heading
 *   - font-serif + text-md + leading-loose → Source Serif 4 rendering on prose (verification (a))
 *   - font-mono                           → JetBrains Mono rendering on rule-ID (verification (b))
 *   - text-accent-primary                 → accent color application
 *   - border-border-default               → border color emission
 */
export default function HomePage() {
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
        Token verification placeholder. Real page assembly lands in Batch 10.
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
