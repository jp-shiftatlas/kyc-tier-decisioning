// components/chrome/PageFooter.tsx
// Page-level chrome — bottom attribution bar per visual_system.md §5.7.
//
// Batch 12 sidebar refactor: the regulatory anchors + architecture statements
// previously rendered here are now in ReferencesSidebar (visible at lg+).
// The bottom footer's job is reduced to the Shift Atlas attribution line so
// the same content doesn't duplicate above and below the fold.
//
// At md and below, ReferencesSidebar is hidden — for those viewports, the
// references would not be visible at all without an alternative surface.
// Decision deferred to a follow-up batch: either expand PageFooter to carry
// the full references at md-and-below only, or rely on the page-header
// drawer pattern. v1 demo audience is desktop per PRIMARY_PROMPT.md §7.6
// (primary design target ≥ 1280px), so this trade is acceptable.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   visual_system.md §5.7 — attribution: --text-tertiary --text-xs, right-aligned
//   Decision 38 — "Shift Atlas Consulting · kyc.shiftatlas.tech" inbound mechanism

'use client';

import { SHIFT_ATLAS_ATTRIBUTION } from '@/lib/chrome/regulatoryReferences';

export function PageFooter() {
  return (
    <footer
      role="contentinfo"
      data-testid="page-footer"
      className="mt-8 border-t border-border-default bg-surface-base"
    >
      <div className="mx-auto flex max-w-[1180px] flex-col px-12 py-4">
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
