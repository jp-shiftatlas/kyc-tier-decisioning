'use client';
// app/page.tsx — assembled page per Batch 10.2.
//
// At Batch 10.2 this page rewrites from the Task 5.3 token-verification
// harness (relocated to app/font-verification/page.tsx) into the assembled
// demo page. Page chrome (header + footer) lives in app/layout.tsx wrapping
// {children}; this file is decisioning-content-only.
//
// === LAYOUT SEQUENCE ===
//
//   1. PersonaSelector (10.1)            — case-selector affordance at the top
//                                          of the page; inert callback at 10.2,
//                                          wired to usePersonaPlayback at 10.3
//   2. Decisioning surface placeholder    — 10.2 placeholder marker; 10.3 fills
//                                          with orchestration-driven content
//                                          (RecommendationCard + AuditPanel +
//                                          conditional Pass 3 + AnalystControlPanel)
//   3. CustomInputForm (Batch 8.1)        — live custom-input affordance below
//                                          the persona path; inert callback at
//                                          10.2, wired to useLiveDecisioning's
//                                          startLiveRun at 10.3
//   4. ArchitectureStrip (Task 7.5)       — static positioning artifact per
//                                          Decision 42; lives near footer but
//                                          not in it per visual_system.md §6
//                                          (line 211)
//
// === DESKTOP BASELINE (Decision 39 / 10.2 SCOPE) ===
//
// Container max-w 1180px, mx-auto centers within viewport. At 1280px viewport
// (design target), gutters are implicit (1280 - 1180) / 2 = 50px each side.
// Internal padding px-6 (24px) applies at viewport < 1280px for safety; at
// viewport ≥ 1280px (xl breakpoint), padding is zero so the 50px gutter rule
// holds exactly. Section spacing gap-16 (64px) per visual_system.md vertical
// rhythm convention.
//
// Mobile reflow (< 768px functional floor) is 10.4 scope.
//
// === 10.2 INERT CALLBACK DISCIPLINE ===
//
// PersonaSelector and CustomInputForm are rendered with inert `() => {}`
// callbacks. The components fire on user interaction (click, submit) but the
// callbacks are no-ops; no state-machine activity results. 10.3 replaces these
// inert callbacks with orchestration-wired handlers.
//
// Anti-pattern guard: app/page.tsx imports zero orchestration-layer modules
// at 10.2. The source-read static-analysis guard at app/page.test.tsx asserts
// this structurally — eighth instance of the structural-enforcement-of-
// architectural-disciplines pattern. 10.3 will add orchestration imports
// (useDecisioningMachine, usePersonaPlayback, useLiveDecisioning) at the
// same time the inert callbacks become wired.

import { PersonaSelector } from '@/components/decisioning/PersonaSelector';
import { CustomInputForm } from '@/components/decisioning/CustomInputForm';
import { ArchitectureStrip } from '@/components/decisioning/ArchitectureStrip';

export default function HomePage() {
  return (
    <main
      data-testid="home-main"
      className="mx-auto flex max-w-[1180px] flex-col gap-16 px-6 py-12 xl:px-0"
    >
      <section data-testid="persona-section" aria-label="Case selector">
        <PersonaSelector
          activePersonaId={null}
          onPersonaChange={() => {
            /* inert at 10.2; wired to usePersonaPlayback.loadPersona at 10.3 */
          }}
        />
      </section>

      {/*
        Decisioning surface placeholder. 10.3 fills this with orchestration-
        driven content: RecommendationCard (Pass 1), AuditPanel (Pass 2),
        conditional Pass3CorrectionBanner / Pass3RaceBanner, and
        AnalystControlPanel positioned within or alongside per Batch 8.5.
        At 10.2 it's a marker section so the layout reserves the structural
        position without rendering decisioning content that has no source.
      */}
      <section
        data-testid="decisioning-surface-placeholder"
        aria-label="Decisioning surface"
      />

      <section data-testid="custom-input-section" aria-label="Live custom input">
        <CustomInputForm
          onValidatedSubmit={() => {
            /* inert at 10.2; wired to useLiveDecisioning.startLiveRun at 10.3 */
          }}
        />
      </section>

      <section data-testid="architecture-section" aria-label="Reference architecture">
        <ArchitectureStrip />
      </section>
    </main>
  );
}
