// components/chrome/ReferencesSidebar.tsx
// Left-panel sidebar showing regulatory anchors + production architecture
// statements above the fold. Visible at lg+ (≥1024px); hidden at md and
// below where PageFooter at the bottom carries the same content.
//
// Anchors and statements imported from lib/chrome/regulatoryReferences.ts
// — same source PageFooter uses. Single source of truth.
//
// Visual treatment per visual_system.md §5.7:
//   - Regulatory citations: --font-mono --text-sm
//   - Architecture statements: --font-sans --text-sm --text-secondary
//   - Section headings: --font-sans --text-xs --text-tertiary uppercase

'use client';

import {
  REGULATORY_ANCHORS,
  ARCHITECTURE_STATEMENTS,
} from '@/lib/chrome/regulatoryReferences';

export function ReferencesSidebar() {
  return (
    <aside
      data-testid="references-sidebar"
      aria-label="Regulatory and architecture references"
      className="hidden w-72 shrink-0 border-r border-border-default bg-surface-base lg:block"
    >
      <div className="sticky top-0 flex flex-col gap-8 p-8">
        <section data-testid="sidebar-regulatory-citations" className="flex flex-col gap-3">
          <h3 className="font-sans text-xs uppercase tracking-wide text-text-tertiary">
            Regulatory anchors
          </h3>
          <ul className="ml-5 flex list-disc flex-col gap-2 marker:text-text-tertiary">
            {REGULATORY_ANCHORS.map((anchor) => (
              <li key={anchor} className="font-mono text-sm text-text-secondary">
                {anchor}
              </li>
            ))}
          </ul>
        </section>

        <section data-testid="sidebar-architecture-statements" className="flex flex-col gap-3">
          <h3 className="font-sans text-xs uppercase tracking-wide text-text-tertiary">
            Production architecture
          </h3>
          <ul className="ml-5 flex list-disc flex-col gap-2 marker:text-text-tertiary">
            {ARCHITECTURE_STATEMENTS.map((statement) => (
              <li key={statement} className="font-sans text-sm text-text-secondary">
                {statement}
              </li>
            ))}
          </ul>
        </section>
      </div>
    </aside>
  );
}
