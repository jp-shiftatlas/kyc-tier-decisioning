// components/chrome/PageHeader.tsx
// Page-level chrome — site header per Decision 38 + Batch 12 product polish.
//
// Batch 12 changes from prior:
//   - Brand mark (slate-accent square with "SA" wordmark) added left of title
//   - Title bumped to text-2xl for hero-band presence
//   - Tagline preserved verbatim (Decision 47a canonical lock)
//   - "Methodology demo" pill in upper-right alongside the Shift Atlas link
//   - Subtle bottom border emphasized (border-strong on the bottom edge)
//
// All other Decision 38 / 47a / 47b commitments unchanged:
//   - Scrollable, not sticky
//   - Brand link href https://shiftatlas.tech (inbound mechanism)
//   - Pure presentation, zero state-machine knowledge

const TITLE = 'KYC Tier Decisioning';
const TAGLINE = 'Three-pass reasoning pipeline — Shift Atlas consulting methodology demonstration';
const BRAND_LINK_HREF = 'https://shiftatlas.tech';
const BRAND_LINK_LABEL = 'Shift Atlas';
const DEMO_BADGE = 'Methodology demo';

export function PageHeader() {
  return (
    <header
      role="banner"
      data-testid="page-header"
      className="border-b border-border-default bg-surface-base"
    >
      <div className="mx-auto flex max-w-[1180px] items-center justify-between gap-6 px-12 py-5">
        <div className="flex items-center gap-4">
          {/* Brand mark — slate-accent square with monogram. Spec-silent on
              header iconography; this is one of the Batch 12 product-polish
              additions. Square + mono wordmark stays editorial-register
              (no logo gradient, no rounded blob). */}
          <div
            data-testid="page-header-brand-mark"
            aria-hidden="true"
            className="flex h-10 w-10 shrink-0 items-center justify-center bg-accent-primary font-mono text-sm font-semibold text-text-inverse"
          >
            SA
          </div>
          <div className="flex flex-col gap-1">
            <h1 className="font-sans text-2xl font-semibold tracking-tight text-text-primary">
              {TITLE}
            </h1>
            <p className="font-sans text-sm text-text-secondary">{TAGLINE}</p>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-4">
          <span
            data-testid="page-header-demo-badge"
            className="inline-flex items-center bg-accent-subtle-bg px-3 py-1 font-sans text-xs font-medium text-accent-deep"
          >
            {DEMO_BADGE}
          </span>
          <a
            href={BRAND_LINK_HREF}
            target="_blank"
            rel="noopener noreferrer"
            className="font-sans text-xs text-text-tertiary hover:text-text-secondary"
          >
            {BRAND_LINK_LABEL} ↗
          </a>
        </div>
      </div>
    </header>
  );
}
