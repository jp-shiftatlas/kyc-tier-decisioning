// components/chrome/PageHeader.tsx
// Page-level chrome — site header per Decision 38 (URL/branding linkage) +
// PRIMARY_PROMPT.md §1 (Shift Atlas portfolio-asset framing).
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   Decision 38 (PRIMARY_PROMPT.md §7.3 line 516) — Production URL
//     kyc.shiftatlas.tech as a subdomain of the established Shift Atlas
//     consulting brand. The header makes the brand linkage visually explicit
//     so every URL impression ladders into the consulting practice.
//   PRIMARY_PROMPT.md §1 line 16 — "Framing throughout the build (microcopy,
//     footer language, component naming) should reflect [portfolio-asset
//     framing]. The pitch is 'this is the pattern we'd build for your bank,
//     on your AWS, using your actual policy' — never 'this is software you
//     can buy.'" The tagline encodes the consulting-methodology-demonstration
//     framing, not consumer-product framing.
//   PRIMARY_PROMPT.md §6 — institutional register requirements.
//   visual_system.md §5.7 (line 428) — Shift Atlas attribution treatment
//     convention: --text-tertiary --text-xs. PageHeader brand link follows
//     the same typographic register.
//
// === SPEC-SILENCE-AS-GAP ===
//
// Decision 38 specifies the URL; the corpus does not explicitly spec the
// header's content. Content choices were ratified at the 10.2 dispatch-prep
// spec walk per Finding D disposition:
//   - Title: "KYC Tier Decisioning" — matches metadata.title in app/layout.tsx
//   - Tagline (Option (b) Contextual with "preview" → "demonstration" swap):
//     "Three-pass reasoning pipeline — Shift Atlas consulting methodology
//      demonstration"
//     The "demonstration" framing matches the brief's "this is the pattern
//     we'd deploy for your bank" framing more directly than "preview"
//     (which would suggest beta/unfinished work).
//   - Brand link: "Shift Atlas →" upper-right, --text-tertiary --text-xs,
//     href https://shiftatlas.tech (the inbound mechanism per Decision 38
//     rationale).
//
// All three are Things-to-Flag for Batch 11 ratification — institutional-
// register content choices that the corpus is structurally silent on.
//
// === SCROLLABLE (NOT STICKY) ===
//
// Header is scrollable, not sticky. Spec-silence-as-gap; sticky headers
// read as consumer-app convention and would conflict with institutional-
// register positioning. Batch 11 ratification per Finding E.
//
// === COMPOSITION DISCIPLINE ===
//
// PageHeader is pure presentation. Imports zero state-machine modules,
// zero persona data, zero decisioning components. Sibling to the
// PersonaSelector / AnalystControlPanel callback surface composition
// disciplines from 10.1.

const TITLE = 'KYC Tier Decisioning';
const TAGLINE = 'Three-pass reasoning pipeline — Shift Atlas consulting methodology demonstration';
const BRAND_LINK_HREF = 'https://shiftatlas.tech';
const BRAND_LINK_LABEL = 'Shift Atlas →';

export function PageHeader() {
  return (
    <header
      role="banner"
      data-testid="page-header"
      className="border-b border-border-default bg-surface-base"
    >
      <div className="mx-auto flex max-w-[1180px] items-start justify-between px-12 py-6">
        <div className="flex flex-col gap-1">
          <h1 className="font-sans text-xl font-semibold text-text-primary">
            {TITLE}
          </h1>
          <p className="font-sans text-sm text-text-secondary">{TAGLINE}</p>
        </div>
        <a
          href={BRAND_LINK_HREF}
          target="_blank"
          rel="noopener noreferrer"
          className="font-sans text-xs text-text-tertiary hover:text-text-secondary"
        >
          {BRAND_LINK_LABEL}
        </a>
      </div>
    </header>
  );
}
