// app/page.tsx — assembled page; Batch 10.3 wires DecisioningOrchestrator into
// the 10.2 layout.
//
// At Batch 10.2 this page rewrote from the Task 5.3 token-verification harness
// (relocated to app/font-verification/page.tsx) into the assembled demo page
// with INERT callbacks: PersonaSelector + CustomInputForm rendered positionally
// with `() => {}` handlers; a decisioning-surface-placeholder section marked
// the layout slot for 10.3 to fill.
//
// At Batch 10.3 the inert wiring becomes live wiring. The PersonaSelector +
// decisioning surface + CustomInputForm sections are now rendered by
// DecisioningOrchestrator (the designated wiring layer between Batches 9.1–9.4
// orchestration hooks and Batches 8 + 10.1 component callbacks). The page-
// level layout structure from 10.2 is preserved exactly: ArchitectureStrip
// continues to sit as a sibling section between the decisioning region and
// the page footer (per visual_system.md §6 line 211).
//
// === LAYOUT SEQUENCE (children of <main>, top to bottom) ===
//
//   1. <persona-section>           — PersonaSelector (mounted by orchestrator)
//   2. <decisioning-surface>       — state-driven content (mounted by orchestrator)
//   3. <custom-input-section>      — CustomInputForm (mounted by orchestrator)
//   4. <architecture-section>      — ArchitectureStrip (Task 7.5)
//
// The four section landmarks remain direct children of <main>; the
// DecisioningOrchestrator returns a Fragment so its three sections nest at the
// same level as architecture-section. The 10.2 test's main-children-order
// assertion holds with the testid update (decisioning-surface-placeholder →
// decisioning-surface).
//
// === DESKTOP BASELINE (Decision 39 / 10.2 SCOPE PRESERVED) ===
//
// Container unchanged from 10.2: mx-auto max-w-[1180px] flex flex-col gap-16
// px-6 py-12 xl:px-0. Mobile reflow remains 10.4 scope.
//
// === ANTI-PATTERN GUARD AT 10.3 ===
//
// app/page.tsx imports DecisioningOrchestrator (lawful at 10.3 — it is the
// designated wiring layer). app/page.tsx does NOT directly import any
// orchestration hook (useDecisioningMachine / usePersonaPlayback /
// useLiveDecisioning). The page stays layout-only; orchestration concerns
// live one layer deeper in DecisioningOrchestrator. The source-read guard at
// app/page.test.tsx asserts this structurally — ninth instance of the
// structural-enforcement-of-architectural-disciplines pattern at the page
// layer (and continues to grow at deeper layers: orchestrator guards lawful
// imports; PersonaSelector + AnalystControlPanel + chrome guards forbid
// orchestration imports at their respective layers).

import { DecisioningOrchestrator } from '@/components/orchestration/DecisioningOrchestrator';
import { ArchitectureStrip } from '@/components/decisioning/ArchitectureStrip';

export default function HomePage() {
  return (
    <main
      data-testid="home-main"
      className="mx-auto flex max-w-[1180px] flex-col gap-16 px-6 py-12 xl:px-0"
    >
      <DecisioningOrchestrator />

      <section data-testid="architecture-section" aria-label="Reference architecture">
        <ArchitectureStrip />
      </section>
    </main>
  );
}
