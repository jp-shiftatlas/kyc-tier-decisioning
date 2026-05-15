// components/chrome/PageFooter.tsx
// Page-level chrome — site footer per PRIMARY_PROMPT.md §6.7 +
// visual_system.md §5.7. Carries the regulatory citation block + three
// production-grounded architecture statements + Shift Atlas attribution.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   PRIMARY_PROMPT.md §6.7 (lines 481–489) — Footer content scope:
//     - Regulatory citation block (pulled from ruleset_v1.md)
//     - Three architecture statements (locked verbatim)
//     - Shift Atlas attribution
//     "The DPA / data residency objection-handling is encoded in the footer
//      language plus the architecture strip's production annotation.
//      Together they answer the buyer's #1 anxiety without prompting."
//   visual_system.md §5.7 (lines 424–428) — Footer typography:
//     - Regulatory citations: --font-mono --text-sm, two-column on desktop
//     - Architecture statements: --font-sans --text-sm --text-secondary
//     - Shift Atlas attribution: --text-tertiary --text-xs, right-aligned
//   PRIMARY_PROMPT.md §11 success criterion #2 (line 728 region) — "the
//     architecture footer answers their DPA/data-residency objection without
//     prompting." The three architecture statements are the load-bearing
//     content; the footer's #1 job is encoding that objection-handling.
//
// === 10.2 DISPATCH-PREP FINDING B SCOPE-REFRAMING ===
//
// The 10.2 dispatch directive originally framed PageFooter as carrying
// Decision 33's rate-limit microcopy ("Live generation is rate-limited
// per session. Pre-generated examples are not affected."). Five-surface
// spec walk caught that Decision 33's microcopy lives at the FORM footer,
// not the PAGE footer:
//   - PRIMARY_PROMPT.md:188 — "Footer microcopy on live custom input panel"
//     (§4.8, cost protection — not §6.7 footer)
//   - visual_system.md:419 — "Footer microcopy below the form"
//     (§5.6 CustomInputForm — not §5.7 Footer)
//   - components/decisioning/CustomInputForm.tsx:609 — ALREADY renders the
//     verbatim microcopy at the form level (Batch 8.1)
//
// PageFooter binds to corpus-actual §6.7 + §5.7 scope: regulatory citations
// + three architecture statements + Shift Atlas attribution. The Decision 33
// microcopy is form-level disclosure and does NOT appear in this component;
// PageFooter.test.tsx includes a negative regression-guard against future
// drift where someone "tidies" the form-footer microcopy up to the page
// footer.
//
// New methodology sub-class recorded for the directive-prep workflow:
// section-anchored-citation discipline — when a Decision references corpus
// content, verify which corpus SECTION the Decision's content lives in.
// Decision 33 is structured under §4.8 (cost protection) and §5.6
// (CustomInputForm), not §6.7 (Footer) or §5.7 (Footer). Cited by Decision
// number alone, the placement is ambiguous; spec walk must locate the
// section to bind the content correctly.
//
// === REGULATORY ANCHOR STACK ===
//
// Citation list is the short-form Regulatory Anchor Stack from
// ruleset_v1.md lines 23–37 (12 entries). Rendering format follows
// institutional-register citation convention: anchor identifier only, no
// role/status column. Two-column CSS layout at md breakpoint and above
// (Tailwind `md:columns-2`); single column at mobile.
//
// COUPLING NOTE: regulatory citations are hardcoded here. If ruleset_v1.md
// adds/removes anchors (Batch 11+ regulatory updates), PageFooter must be
// kept in sync. The duplication is acceptable for v1 (citations are stable
// for the demo timeline) but should be revisited if the ruleset's anchor
// list churns.
//
// === COMPOSITION DISCIPLINE ===
//
// PageFooter is pure presentation. Imports zero state-machine modules,
// zero persona data, zero decisioning components. Sibling to PageHeader
// + PersonaSelector composition disciplines from 10.1 / 10.2.

const REGULATORY_ANCHORS: readonly string[] = [
  'MORB §921 / MORNBFI §921Q',
  'MORB §923 / MORNBFI §923Q',
  'BSP Circular 1170 (Mar 2023)',
  'BSP Circular 1218 (Sept 2025)',
  'BSP Memorandum M-2023-029',
  'BSP Memorandum M-2026-005',
  'BSP Circular 1230 (Feb 27, 2026)',
  'AMLA / RA 9160',
  'DPA / RA 10173',
  'NPC Advisory 2024-04',
  'FATF Recommendations 10–12',
  'RA 11055 (PhilSys Act)',
];

// Locked verbatim per PRIMARY_PROMPT.md §6.7. The three statements answer
// (in order): production stack, data residency, decision accountability.
// These collectively encode the DPA / data-residency objection-handling
// per success criterion #2.
const ARCHITECTURE_STATEMENTS: readonly string[] = [
  'Reference architecture: deployed via Amazon Bedrock in client AWS environment',
  'Customer data never leaves client infrastructure',
  'Final decision authority rests with the compliance analyst',
];

const SHIFT_ATLAS_ATTRIBUTION = 'Shift Atlas Consulting · kyc.shiftatlas.tech';

export function PageFooter() {
  return (
    <footer
      role="contentinfo"
      data-testid="page-footer"
      className="mt-16 border-t border-border-default bg-surface-base"
    >
      <div className="mx-auto flex max-w-[1180px] flex-col gap-6 px-12 py-8">
        {/* Regulatory citation block — two-column on desktop per §5.7 */}
        <div data-testid="footer-regulatory-citations" className="md:columns-2">
          {REGULATORY_ANCHORS.map((anchor) => (
            <div
              key={anchor}
              className="font-mono text-sm text-text-secondary"
            >
              {anchor}
            </div>
          ))}
        </div>

        {/* Three architecture statements — locked verbatim per §6.7 */}
        <div
          data-testid="footer-architecture-statements"
          className="flex flex-col gap-1"
        >
          {ARCHITECTURE_STATEMENTS.map((statement) => (
            <p
              key={statement}
              className="font-sans text-sm text-text-secondary"
            >
              {statement}
            </p>
          ))}
        </div>

        {/* Shift Atlas attribution — right-aligned per §5.7 */}
        <p
          data-testid="footer-attribution"
          className="text-right font-sans text-xs text-text-tertiary"
        >
          {SHIFT_ATLAS_ATTRIBUTION}
        </p>
      </div>
    </footer>
  );
}
