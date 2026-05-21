# Batch 12 — Wizard Restructure (Multi-Screen Layout)

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development OR superpowers:executing-plans to implement task-by-task. Steps use checkbox (`- [ ]`) syntax.
>
> **Execution mode for this batch:** HYBRID — subagent-driven for mechanical batches (12.1, 12.4, 12.10), inline-with-checkpoints for discipline-heavy batches (12.2, 12.3, 12.5, 12.9) per the project's institutional-register discipline (see Plan Discipline §3). The default "subagent-driven (recommended)" handoff is questioned here because subagent isolation tends to default to mainstream tutorial idioms (Stripe-style microcopy, decorative iconography, mainstream wizard patterns) that contradict the project's editorial-financial-publication register. The discipline-heavy batches need inline review.

**Goal:** Restructure the demo's single-scroll layout into a 5-screen wizard whose flow tells the bank's integration story without narration. Screen 2 promotes the architecture strip from footer artifact to organizing axis: a vertical 5-stage pipeline with each stage's data clusters anchored as siblings to its row, and the Run Analysis CTA embedded inside the Reasoning Layer row.

**Architecture:** Wizard host (`WizardShell`) owns screen state and Back navigation. `StepIndicator` is a persistent stepper rendered above each screen. The five screens are: (1) `PersonaSelectScreen` — adapted PersonaSelector with auto-advance + "Use your own profile" tile; (2) `DataFlowScreen` — new vertical `DataFlowMap` with `PipelineStageRow` rows and `UpstreamDataSubgroup` cells, plus inline `RunAnalysisButton` in the Reasoning Layer row; (3) `AuditScreen` — wraps existing RecommendationCard + AuditPanelTicker + Pass3CorrectionBanner + cap-reached layout; (4) `ExaminerNotesScreen` — wraps existing ExaminerNotes; (5) `AnalystActionScreen` — wraps existing AnalystControlPanel. `DecisioningOrchestrator` is reshaped from a single-render component into a state provider whose state drives which screen the wizard advances to.

**Tech Stack:** Next.js App Router · React 18 · TypeScript · Tailwind CSS · React Hook Form + Zod · Vitest + React Testing Library · Playwright.

---

## Spec anchors

This restructure is grounded against the following locked-spec sections. Anchors are reference-only; locked artifacts (PRIMARY_PROMPT.md, visual_system.md, design-decisions.md, ruleset_v1.md, prompts/, personas.json, the numbered `0N_*.md` files) are not edited by this batch — JP commits any ratifications on his side.

- **PRIMARY_PROMPT.md §4.1** — three-pass reasoning pipeline framing (never "agents")
- **PRIMARY_PROMPT.md §4.2** — persona walkthrough does not exercise Pass 3; Pass 3 + cap-reached UI on live mode only
- **PRIMARY_PROMPT.md §4.11** — render-time canonical check ordering (preserved through DataFlowMap → AuditScreen handoff)
- **PRIMARY_PROMPT.md §5.1–5.4** — persona / live / failure data flows
- **PRIMARY_PROMPT.md §6.4** — architecture strip (Decision 42 — see Decision 48 ratification flag below)
- **PRIMARY_PROMPT.md §6.5** — analyst control panel
- **PRIMARY_PROMPT.md §6.6** — custom input form (4-group regulatory-function layout; composite sub-controls; regulatory tooltips)
- **PRIMARY_PROMPT.md §7.6** — three-tier viewport hierarchy (Decision 39)
- **visual_system.md §2, §3, §4, §5, §6, §8** — color tokens, type roles, grid, component constraints, anti-patterns, focus treatment
- **Decision 27** — persona walkthrough at PASS clean (preserved)
- **Decision 36** — analyst control panel framing (preserved)
- **Decision 37** — custom input form structure (field-section components extracted; composite sub-controls and regulatory tooltips preserved)
- **Decision 41** — symmetric ticker animation, elapsed-time threshold (preserved; AuditScreen reuses AuditPanelTicker)
- **Decision 42** — architecture strip as static positioning artifact (**evolves to organizing axis on Screen 2** — see ratification flag below)
- **Decision 47a / 47b / 47c** — PageHeader tagline locked; header scrollable not sticky; viewport gutter pattern (preserved)
- **Decision 47d** — AnalystControlPanel mid-flight mounting from `pass_2` onward (preserved through AuditScreen wiring; analyst panel mounts inside Screen 3 in mid-flight states, then Screen 5 hosts it as the primary surface at terminal states)

### Ratification flags for JP's parallel thread

Items below are the kind of durable-state edits that live on JP's surface (numbered `0N_*.md` files + design-decisions.md). The Code session does NOT edit those files. Drafted entries surfaced here for JP to commit verbatim:

1. **Decision 48 — Wizard restructure (Batch 12).** The single-scroll page layout is restructured into a 5-screen wizard. Screens: (1) Persona select, (2) Data flow trace, (3) Three-pass audit, (4) Examiner notes, (5) Analyst action. The wizard advances via user action (persona click on S1, Run Analysis click on S2, Next on S3/S4). Reset returns to S1. Mid-flight persona switch (Decision 46b) collapses to S1 with state cleared. This is a meaningful evolution from the prior single-scroll layout assembled in Batch 10.2 / 10.3.

2. **Decision 48a — Architecture strip evolution (subsumes static-artifact framing of Decision 42).** The 5-box architecture strip evolves from "static positioning artifact near the footer" to "organizing axis of Screen 2," rendered vertically (top-to-bottom pipeline progression on the left), with each stage's data clusters anchored to the right of its row. The strip's non-interactivity discipline from Decision 42 is preserved (no hover, no click on boxes; the data-cluster cells beside them are sibling surfaces, not interactive disclosure). The v1/Production annotation stays beneath the row stack on Screen 2. The original horizontal page-bottom placement is replaced; `ArchitectureStrip` component file becomes orphaned (kept in tree; flagged in code comments for follow-up cleanup decision).

3. **Decision 48b — Onboarding box rename.** "Identity Verification" box renamed to "Onboarding" — single-word, system-flavor parallel to AML Screening / Reasoning Layer / Case Management / Core Banking, and accurately encompasses the broadened data scope (Customer Identity + Account & Behavior + Relationship subgroups all originate from the onboarding intake phase, not just identity document verification).

4. **Decision 48c — Run Analysis CTA placement.** The Run Analysis CTA is positioned inside the Reasoning Layer row's right panel on Screen 2, not in the bottom navigation bar. This anchors the action semantically to the stage that performs it. Bottom navigation on Screen 2 carries only the Back affordance.

5. **Decision 48d — Field-to-upstream mapping.** Customer Identity + Account & Behavior + Relationship subgroups all map to the Onboarding upstream box (PH bank onboarding intake gathers all three at customer onboarding time). Risk Indicators (PEP / sanctions / jurisdiction / adverse media) maps to AML Screening. Reasoning Layer is this demo. Case Management is the analyst-decision sink. Core Banking is downstream.

JP commits these to `03_DESIGN_DECISIONS.md` on his side per the durable-state file ownership boundary (memory: `project_collaboration_pattern.md`).

---

## File structure

### New files

| Path | Responsibility |
|---|---|
| `components/wizard/WizardShell.tsx` | Wizard host — manages active screen, transitions, Back nav |
| `components/wizard/WizardShell.test.tsx` | Integration tests for screen transitions + state propagation |
| `components/wizard/StepIndicator.tsx` | Persistent stepper rendered above each screen |
| `components/wizard/StepIndicator.test.tsx` | Active / completed / upcoming state rendering |
| `components/wizard/useWizardState.ts` | Hook owning `(activeScreen, profile, mode)` wizard-level state |
| `components/wizard/useWizardState.test.ts` | State transitions, mid-flight persona switch resets to S1 |
| `lib/wizard/screenSequence.ts` | Canonical 5-screen sequence: ids, labels, advance/back rules |
| `lib/wizard/screenSequence.test.ts` | Sequence integrity, transition map |
| `components/screens/PersonaSelectScreen.tsx` | Screen 1 — wraps PersonaSelector + "Use your own" tile |
| `components/screens/PersonaSelectScreen.test.tsx` | Auto-advance on persona selection; live-mode tile selection |
| `components/screens/DataFlowScreen.tsx` | Screen 2 — wraps DataFlowMap; per-mode field rendering |
| `components/screens/DataFlowScreen.test.tsx` | Persona-mode display; live-mode form submission |
| `components/screens/AuditScreen.tsx` | Screen 3 — composes RecommendationCard + AuditPanelTicker + Pass3 surfaces |
| `components/screens/AuditScreen.test.tsx` | Pass progression rendering; failed/cap-reached layouts |
| `components/screens/ExaminerNotesScreen.tsx` | Screen 4 — wraps ExaminerNotes |
| `components/screens/ExaminerNotesScreen.test.tsx` | Read full memo expansion; mode-driven content selection |
| `components/screens/AnalystActionScreen.tsx` | Screen 5 — wraps AnalystControlPanel + Reset case affordance |
| `components/screens/AnalystActionScreen.test.tsx` | Reset returns to S1; mid-flight race banner mounting |
| `components/decisioning/DataFlowMap.tsx` | Vertical 5-row pipeline; composes PipelineStageRow ×5 |
| `components/decisioning/DataFlowMap.test.tsx` | Row order; Reasoning Layer slate accent; Onboarding label |
| `components/decisioning/PipelineStageRow.tsx` | One row: left stage-box + right panel container |
| `components/decisioning/PipelineStageRow.test.tsx` | Active accent treatment; right-panel children rendering |
| `components/decisioning/UpstreamDataSubgroup.tsx` | One data subgroup card (read-only or edit mode) |
| `components/decisioning/UpstreamDataSubgroup.test.tsx` | Field display vs. field-edit slot rendering |
| `components/decisioning/RunAnalysisButton.tsx` | Inline CTA inside Reasoning Layer row |
| `components/decisioning/RunAnalysisButton.test.tsx` | Disabled-when-invalid; loading state |
| `components/forms/CustomerIdentityFields.tsx` | RHF field section: customer_reference, identity_document_type, residency_status, customer_type |
| `components/forms/CustomerIdentityFields.test.tsx` | Field rendering + validation |
| `components/forms/AccountBehaviorFields.tsx` | RHF field section: occupation_type, source_of_funds, account_purpose, expected_monthly_volume_php |
| `components/forms/AccountBehaviorFields.test.tsx` | Composite sub-controls; numeric format-on-blur |
| `components/forms/RiskIndicatorFields.tsx` | RHF field section: pep_status, sanctions_screening, high_risk_jurisdiction_connection, adverse_media |
| `components/forms/RiskIndicatorFields.test.tsx` | Regulatory tooltips on the four flagged fields |
| `components/forms/RelationshipFields.tsx` | RHF field section: years_with_bank |
| `components/forms/RelationshipFields.test.tsx` | Numeric input rendering |

### Modified files

| Path | Change scope |
|---|---|
| `app/page.tsx` | Replace `<DecisioningOrchestrator />` + `<ArchitectureStrip />` sibling pattern with `<WizardShell />` mount |
| `app/page.test.tsx` | Update main-children-order assertion to `WizardShell`-only structure |
| `components/decisioning/PersonaSelector.tsx` | Add "Use your own profile" tile as a fifth selectable card; auto-advance signal via new `onSelectionConfirmed` callback (additive — existing `onPersonaChange` preserved) |
| `components/decisioning/PersonaSelector.test.tsx` | Add tests for the fifth tile + auto-advance signal |
| `components/decisioning/CustomInputForm.tsx` | Extract 4 field sections to `components/forms/*Fields.tsx`; CustomInputForm becomes thin wrapper composing the 4 sections (preserves standalone test surface) |
| `components/decisioning/CustomInputForm.test.tsx` | Tests pivot to assert composition, not field-level rendering (field-level tests move to forms/*.test.tsx) |
| `components/orchestration/DecisioningOrchestrator.tsx` | Becomes a state provider — exports a context/hook (`useDecisioningState`) consumed by the screens; no longer renders persona-selector + decisioning-surface + custom-input-form siblings |
| `components/orchestration/DecisioningOrchestrator.test.tsx` | Tests pivot to assert state contract, not DOM structure |
| `tests/e2e/composition.spec.ts` | Update structure assertions to wizard-step structure |
| `tests/e2e/persona-playback.spec.ts` | Walk all 4 personas through S1 → S2 → S3 → S4 → S5 |
| `tests/e2e/custom-input-live.spec.ts` | Walk live mode through S1 → S2 (live form) → S3 → S4 → S5 |
| `tests/e2e/custom-input-pass3-reaudit.spec.ts` | Pass 3 + re-audit inline on S3 |
| `tests/e2e/cap-reached.spec.ts` | Cap-reached inline on S3, then S4 / S5 reachable |

### Files NOT touched

- All `lib/schemas/*` (customer profile, pass1/2/3, persona adapters, API error)
- All `lib/orchestration/*` hooks (`usePersonaPlayback`, `useLiveDecisioning`, `passHeadlineMap`)
- `lib/anthropic/*`, `lib/api/*`, `lib/costprotection/*`, `lib/prompts/*`
- `app/api/decisioning/route.ts`
- All `components/primitives/*`
- All `components/decisioning/*` audit-internals: `AuditCheckRow`, `AuditPanel`, `AuditPanelTicker`, `DC07Indicator`, `ElapsedTimeIndicator`, `Pass3CorrectionBanner`, `Pass3RaceBanner`, `PassHeadline`, `RecommendationCard`, `SeverityStrip`, `ThresholdVerificationBlock`, `ExaminerNotes`, `ExaminerNotesSection`, `AnalystControlPanel`
- `components/decisioning/ArchitectureStrip.tsx` (orphaned by this batch; flagged in code comment for follow-up cleanup decision)
- `components/chrome/PageHeader.tsx`, `components/chrome/PageFooter.tsx`
- `data/personas.json`, `prompts/*`, `ruleset_v1.md`, `PRIMARY_PROMPT.md`, `visual_system.md`

---

## Plan Discipline (acquired from prior-batch failure modes)

Per the memory `feedback_code_plan_review_failure_modes.md`, these four discipline items are surfaced as standalone tasks rather than buried in callouts:

- **D1 — Trace test imports against task-creation order.** Within each batch, the test for Task N must not import from a module created in Task N+M. See per-batch ordering notes in 12.1–12.10 below; the WizardShell test in 12.1 Task 3 deliberately uses inline test fixtures rather than depending on the per-screen components built in 12.2–12.8.
- **D2 — No deterministic recipes for non-deterministic flows.** Live-mode Pass 3 fires only when Pass 2 catches material findings, which is by design non-deterministic against the model. The E2E test in 12.10 for Pass 3 + re-audit uses the existing mock-route fixtures (per Block 5 prior art at `tests/e2e/custom-input-pass3-reaudit.spec.ts`), NOT a "submit profile X to trigger Pass 3" recipe.
- **D3 — Search-before-asserting on external platform facts.** Task 12.1.1 includes an explicit verification step against current Next.js App Router conventions for client-component composition (the wizard host is `'use client'` but mounts in a server-component page). Verify via web search before asserting from training data.
- **D4 — Discipline-heavy execution mode.** This plan's execution-mode recommendation is HYBRID, not "subagent-driven (recommended)." Subagent-driven for mechanical batches (12.1 wizard shell, 12.4 field section extraction, 12.10 E2E test updates) where context isolation is acceptable; inline-with-checkpoints for discipline-heavy batches (12.2 PersonaSelector adaptation, 12.3 DataFlowMap primitives, 12.5 DataFlowMap composition, 12.9 page rewrite) where the institutional register matters and subagent isolation would risk drift to mainstream tutorial idioms.

---

## Batch 12.1 — Wizard foundation

**Scope:** `WizardShell`, `StepIndicator`, `useWizardState`, `screenSequence`. No screen components yet; wizard host renders inline test placeholders for each screen slot.

**Execution mode:** subagent-driven (mechanical).

### Task 12.1.1 — Verify Next.js App Router client-component composition pattern

**Files:** none modified; verification only.

- [ ] **Step 1: Web search to confirm App Router client-component nesting**

Run a web search for "Next.js 14 App Router client component mounting server component page". Confirm the pattern: `app/page.tsx` is a server component by default; mounting `<WizardShell />` (which carries `'use client'` directive) is the supported composition. The wizard owns its own state via React hooks; no special server-component boundary handling needed beyond the directive at the top of `WizardShell.tsx`.

Expected confirmation: client components can be freely composed inside server-component pages; the only constraint is that server components cannot be imported INTO client components without `dynamic` or boundary work — which is not required here.

- [ ] **Step 2: Record verification in plan comment**

Add a comment to `components/wizard/WizardShell.tsx` (in Task 12.1.3) noting the verification date and source.

### Task 12.1.2 — Define screen sequence

**Files:**
- Create: `lib/wizard/screenSequence.ts`
- Test: `lib/wizard/screenSequence.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// lib/wizard/screenSequence.test.ts
import { describe, it, expect } from 'vitest';
import {
  SCREEN_SEQUENCE,
  type ScreenId,
  nextScreen,
  previousScreen,
  isFirstScreen,
  isLastScreen,
} from './screenSequence';

describe('screenSequence', () => {
  it('defines five screens in canonical order', () => {
    expect(SCREEN_SEQUENCE.map((s) => s.id)).toEqual([
      'persona-select',
      'data-flow',
      'audit',
      'examiner-notes',
      'analyst-action',
    ]);
  });

  it('each screen carries a stepper label and a panel sub-headline', () => {
    SCREEN_SEQUENCE.forEach((s) => {
      expect(s.stepperLabel).toBeTruthy();
      expect(s.panelHeadline).toBeTruthy();
    });
  });

  it('nextScreen advances by one or returns null at end', () => {
    expect(nextScreen('persona-select')).toBe('data-flow');
    expect(nextScreen('analyst-action')).toBe(null);
  });

  it('previousScreen retreats by one or returns null at start', () => {
    expect(previousScreen('data-flow')).toBe('persona-select');
    expect(previousScreen('persona-select')).toBe(null);
  });

  it('isFirstScreen / isLastScreen identify boundary screens', () => {
    expect(isFirstScreen('persona-select')).toBe(true);
    expect(isFirstScreen('data-flow')).toBe(false);
    expect(isLastScreen('analyst-action')).toBe(true);
    expect(isLastScreen('data-flow')).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run lib/wizard/screenSequence.test.ts
```

Expected: FAIL with "Cannot find module './screenSequence'".

- [ ] **Step 3: Implement screenSequence**

```typescript
// lib/wizard/screenSequence.ts
// Canonical 5-screen wizard sequence for Batch 12. See docs/batch-12-wizard-restructure.md.
//
// Decision 48 — five screens, advance via user action.
// Decision 47a — page-level tagline locked; panel sub-headlines below are
//   screen-specific labels rendered inside each screen panel (not replacements
//   for the locked PageHeader tagline).

export type ScreenId =
  | 'persona-select'
  | 'data-flow'
  | 'audit'
  | 'examiner-notes'
  | 'analyst-action';

export interface ScreenDefinition {
  id: ScreenId;
  stepperLabel: string;
  panelHeadline: string;
}

export const SCREEN_SEQUENCE: readonly ScreenDefinition[] = [
  { id: 'persona-select', stepperLabel: 'Choose', panelHeadline: 'Choose a customer profile' },
  { id: 'data-flow', stepperLabel: 'Flow', panelHeadline: 'Trace the data flow' },
  { id: 'audit', stepperLabel: 'Audit', panelHeadline: 'Three-pass audit' },
  { id: 'examiner-notes', stepperLabel: 'Memo', panelHeadline: 'Examiner notes' },
  { id: 'analyst-action', stepperLabel: 'Action', panelHeadline: 'Analyst action' },
] as const;

function indexOf(id: ScreenId): number {
  return SCREEN_SEQUENCE.findIndex((s) => s.id === id);
}

export function nextScreen(id: ScreenId): ScreenId | null {
  const idx = indexOf(id);
  if (idx === -1 || idx === SCREEN_SEQUENCE.length - 1) return null;
  return SCREEN_SEQUENCE[idx + 1].id;
}

export function previousScreen(id: ScreenId): ScreenId | null {
  const idx = indexOf(id);
  if (idx <= 0) return null;
  return SCREEN_SEQUENCE[idx - 1].id;
}

export function isFirstScreen(id: ScreenId): boolean {
  return indexOf(id) === 0;
}

export function isLastScreen(id: ScreenId): boolean {
  return indexOf(id) === SCREEN_SEQUENCE.length - 1;
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run lib/wizard/screenSequence.test.ts
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add lib/wizard/screenSequence.ts lib/wizard/screenSequence.test.ts
git commit -m "feat(wizard): land Batch 12.1.2 — screen sequence canonical order

5-screen wizard sequence defined: persona-select → data-flow → audit →
examiner-notes → analyst-action. nextScreen / previousScreen / boundary
predicates for use by WizardShell. See docs/batch-12-wizard-restructure.md."
```

### Task 12.1.3 — Build useWizardState hook

**Files:**
- Create: `components/wizard/useWizardState.ts`
- Test: `components/wizard/useWizardState.test.ts`

- [ ] **Step 1: Write the failing test**

```typescript
// components/wizard/useWizardState.test.ts
import { describe, it, expect } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useWizardState } from './useWizardState';

describe('useWizardState', () => {
  it('initializes at persona-select with mode=idle', () => {
    const { result } = renderHook(() => useWizardState());
    expect(result.current.activeScreen).toBe('persona-select');
    expect(result.current.mode).toBe('idle');
  });

  it('advance() moves to the next screen', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => result.current.advance());
    expect(result.current.activeScreen).toBe('data-flow');
  });

  it('back() returns to the previous screen', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => result.current.advance());
    act(() => result.current.back());
    expect(result.current.activeScreen).toBe('persona-select');
  });

  it('setMode tracks persona vs live vs idle', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => result.current.setMode('persona'));
    expect(result.current.mode).toBe('persona');
    act(() => result.current.setMode('live'));
    expect(result.current.mode).toBe('live');
  });

  it('reset returns to persona-select and idle mode', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => result.current.advance());
    act(() => result.current.advance());
    act(() => result.current.setMode('persona'));
    act(() => result.current.reset());
    expect(result.current.activeScreen).toBe('persona-select');
    expect(result.current.mode).toBe('idle');
  });

  it('advance() at last screen is a no-op', () => {
    const { result } = renderHook(() => useWizardState());
    for (let i = 0; i < 10; i++) act(() => result.current.advance());
    expect(result.current.activeScreen).toBe('analyst-action');
  });

  it('back() at first screen is a no-op', () => {
    const { result } = renderHook(() => useWizardState());
    act(() => result.current.back());
    expect(result.current.activeScreen).toBe('persona-select');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run components/wizard/useWizardState.test.ts
```

Expected: FAIL with "Cannot find module './useWizardState'".

- [ ] **Step 3: Implement useWizardState**

```typescript
// components/wizard/useWizardState.ts
// Wizard-level state: which screen is active, what mode the user is in.
//
// Mode is the persona/live/idle distinction inherited from
// DecisioningOrchestrator's prior contract; this hook owns the wizard
// transitions but defers the decisioning state machine to the existing
// orchestration hooks (usePersonaPlayback, useLiveDecisioning) accessed via
// DecisioningOrchestrator's state provider in Batch 12.7.

'use client';

import { useState, useCallback } from 'react';
import {
  type ScreenId,
  nextScreen,
  previousScreen,
} from '@/lib/wizard/screenSequence';

export type WizardMode = 'idle' | 'persona' | 'live';

export interface WizardState {
  activeScreen: ScreenId;
  mode: WizardMode;
  advance: () => void;
  back: () => void;
  jumpTo: (screen: ScreenId) => void;
  setMode: (mode: WizardMode) => void;
  reset: () => void;
}

export function useWizardState(): WizardState {
  const [activeScreen, setActiveScreen] = useState<ScreenId>('persona-select');
  const [mode, setMode] = useState<WizardMode>('idle');

  const advance = useCallback(() => {
    setActiveScreen((current) => nextScreen(current) ?? current);
  }, []);

  const back = useCallback(() => {
    setActiveScreen((current) => previousScreen(current) ?? current);
  }, []);

  const jumpTo = useCallback((screen: ScreenId) => {
    setActiveScreen(screen);
  }, []);

  const reset = useCallback(() => {
    setActiveScreen('persona-select');
    setMode('idle');
  }, []);

  return { activeScreen, mode, advance, back, jumpTo, setMode, reset };
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run components/wizard/useWizardState.test.ts
```

Expected: PASS, 7 tests.

- [ ] **Step 5: Commit**

```bash
git add components/wizard/useWizardState.ts components/wizard/useWizardState.test.ts
git commit -m "feat(wizard): land Batch 12.1.3 — useWizardState hook

Wizard-level state owns (activeScreen, mode, advance, back, jumpTo, setMode,
reset). Decisioning state machine remains in usePersonaPlayback /
useLiveDecisioning; this hook coordinates only the screen transitions and
the mode tracking inherited from DecisioningOrchestrator's prior surface."
```

### Task 12.1.4 — Build StepIndicator component

**Files:**
- Create: `components/wizard/StepIndicator.tsx`
- Test: `components/wizard/StepIndicator.test.tsx`

- [ ] **Step 1: Write the failing test**

```typescript
// components/wizard/StepIndicator.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { StepIndicator } from './StepIndicator';

describe('StepIndicator', () => {
  it('renders all 5 step labels', () => {
    render(<StepIndicator activeScreen="data-flow" />);
    expect(screen.getByText('Choose')).toBeInTheDocument();
    expect(screen.getByText('Flow')).toBeInTheDocument();
    expect(screen.getByText('Audit')).toBeInTheDocument();
    expect(screen.getByText('Memo')).toBeInTheDocument();
    expect(screen.getByText('Action')).toBeInTheDocument();
  });

  it('marks the active step with aria-current="step"', () => {
    render(<StepIndicator activeScreen="audit" />);
    const active = screen.getByText('Audit').closest('[aria-current]');
    expect(active).toHaveAttribute('aria-current', 'step');
  });

  it('renders chevron separators between steps', () => {
    const { container } = render(<StepIndicator activeScreen="persona-select" />);
    const chevrons = container.querySelectorAll('[data-testid="step-chevron"]');
    expect(chevrons.length).toBe(4); // 5 steps, 4 chevrons
  });

  it('applies completed treatment to steps before the active one', () => {
    render(<StepIndicator activeScreen="audit" />);
    const choose = screen.getByText('Choose').closest('[data-step-status]');
    const flow = screen.getByText('Flow').closest('[data-step-status]');
    expect(choose).toHaveAttribute('data-step-status', 'completed');
    expect(flow).toHaveAttribute('data-step-status', 'completed');
  });

  it('applies upcoming treatment to steps after the active one', () => {
    render(<StepIndicator activeScreen="audit" />);
    const memo = screen.getByText('Memo').closest('[data-step-status]');
    const action = screen.getByText('Action').closest('[data-step-status]');
    expect(memo).toHaveAttribute('data-step-status', 'upcoming');
    expect(action).toHaveAttribute('data-step-status', 'upcoming');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run components/wizard/StepIndicator.test.tsx
```

Expected: FAIL with "Cannot find module './StepIndicator'".

- [ ] **Step 3: Implement StepIndicator**

```tsx
// components/wizard/StepIndicator.tsx
// Persistent step indicator rendered above each screen panel.
//
// Decision 48 / visual_system.md §6 — institutional register: no decorative
// icons, no animation beyond the active-state accent. Active step in
// --accent-primary; completed in --text-secondary; upcoming in --text-tertiary.

'use client';

import {
  SCREEN_SEQUENCE,
  type ScreenId,
} from '@/lib/wizard/screenSequence';
import { cx } from '@/lib/ui/classnames';

interface StepIndicatorProps {
  activeScreen: ScreenId;
}

type StepStatus = 'completed' | 'active' | 'upcoming';

function statusFor(stepId: ScreenId, activeId: ScreenId): StepStatus {
  const activeIdx = SCREEN_SEQUENCE.findIndex((s) => s.id === activeId);
  const stepIdx = SCREEN_SEQUENCE.findIndex((s) => s.id === stepId);
  if (stepIdx < activeIdx) return 'completed';
  if (stepIdx === activeIdx) return 'active';
  return 'upcoming';
}

const STATUS_CLASSES: Record<StepStatus, string> = {
  completed: 'text-text-secondary',
  active: 'text-accent-primary font-semibold',
  upcoming: 'text-text-tertiary',
};

export function StepIndicator({ activeScreen }: StepIndicatorProps) {
  return (
    <nav
      data-testid="step-indicator"
      aria-label="Wizard progress"
      className="flex flex-row items-center justify-center gap-3 py-4"
    >
      {SCREEN_SEQUENCE.map((step, idx) => {
        const status = statusFor(step.id, activeScreen);
        const isLast = idx === SCREEN_SEQUENCE.length - 1;
        return (
          <div key={step.id} className="flex flex-row items-center gap-3">
            <span
              data-step-status={status}
              aria-current={status === 'active' ? 'step' : undefined}
              className={cx('font-sans text-xs', STATUS_CLASSES[status])}
            >
              {step.stepperLabel}
            </span>
            {!isLast && (
              <span
                data-testid="step-chevron"
                aria-hidden="true"
                className="font-sans text-xs text-text-tertiary"
              >
                ›
              </span>
            )}
          </div>
        );
      })}
    </nav>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run components/wizard/StepIndicator.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add components/wizard/StepIndicator.tsx components/wizard/StepIndicator.test.tsx
git commit -m "feat(wizard): land Batch 12.1.4 — StepIndicator

Persistent stepper rendered above each screen panel. Five labeled steps
with chevron separators; active step in accent-primary, completed in
text-secondary, upcoming in text-tertiary. ARIA: aria-current=step on the
active label, aria-hidden=true on chevrons."
```

### Task 12.1.5 — Build WizardShell host

**Files:**
- Create: `components/wizard/WizardShell.tsx`
- Test: `components/wizard/WizardShell.test.tsx`

- [ ] **Step 1: Write the failing test**

The test uses inline placeholder screen components (NOT importing from `@/components/screens/*` — those land in later batches; this test must be self-contained per Plan Discipline §D1).

```tsx
// components/wizard/WizardShell.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WizardShell } from './WizardShell';

// Inline placeholder screens — kept local to this test to avoid D1 circular
// imports against the per-screen components that land in Batches 12.2–12.8.
function PlaceholderScreens() {
  return {
    'persona-select': () => <div data-testid="screen-persona">persona</div>,
    'data-flow': () => <div data-testid="screen-flow">flow</div>,
    'audit': () => <div data-testid="screen-audit">audit</div>,
    'examiner-notes': () => <div data-testid="screen-memo">memo</div>,
    'analyst-action': () => <div data-testid="screen-action">action</div>,
  };
}

describe('WizardShell', () => {
  it('renders the active screen and the step indicator', () => {
    render(<WizardShell screens={PlaceholderScreens()} />);
    expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('screen-persona')).toBeInTheDocument();
    expect(screen.queryByTestId('screen-flow')).not.toBeInTheDocument();
  });

  it('does NOT render a forward Next button on persona-select (auto-advance)', () => {
    render(<WizardShell screens={PlaceholderScreens()} />);
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('does NOT render a forward Next button on data-flow (Run Analysis is inline)', () => {
    // jumpTo data-flow via advance — but advance is internal; expose for test via
    // the `initialScreen` prop. The prop is test-only documented in the source.
    render(<WizardShell screens={PlaceholderScreens()} initialScreen="data-flow" />);
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('renders a Back button on screens 2-5', () => {
    render(<WizardShell screens={PlaceholderScreens()} initialScreen="data-flow" />);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('does NOT render Back on persona-select (first screen)', () => {
    render(<WizardShell screens={PlaceholderScreens()} />);
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });

  it('Back button returns to the previous screen', () => {
    render(<WizardShell screens={PlaceholderScreens()} initialScreen="audit" />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByTestId('screen-flow')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run components/wizard/WizardShell.test.tsx
```

Expected: FAIL with "Cannot find module './WizardShell'".

- [ ] **Step 3: Implement WizardShell**

```tsx
// components/wizard/WizardShell.tsx
// Wizard host — owns active-screen state, renders the StepIndicator + active
// screen panel + Back navigation. Forward navigation is screen-specific:
//   - persona-select: auto-advance on selection (no Next button)
//   - data-flow: Run Analysis is inline in Reasoning Layer row (no Next button)
//   - audit / examiner-notes: per-screen Next button rendered by the screen
//   - analyst-action: terminal (no forward; Reset returns to S1)
//
// Verified 2026-05-21 against Next.js App Router 14.x docs: 'use client' here
// is the supported pattern for state-owning client components composed inside
// a server-component page.tsx.

'use client';

import { useWizardState } from './useWizardState';
import { StepIndicator } from './StepIndicator';
import { SCREEN_SEQUENCE, type ScreenId } from '@/lib/wizard/screenSequence';
import { Button } from '@/components/primitives/Button';

type ScreenComponent = React.ComponentType;
export type ScreenMap = Record<ScreenId, ScreenComponent>;

interface WizardShellProps {
  screens: ScreenMap;
  /** Test-only: bootstrap at a specific screen. Production callers omit this. */
  initialScreen?: ScreenId;
}

export function WizardShell({ screens, initialScreen }: WizardShellProps) {
  const wizard = useWizardState();
  // Test-only initial screen bootstrap. Production renders persona-select.
  if (initialScreen && wizard.activeScreen !== initialScreen) {
    wizard.jumpTo(initialScreen);
  }

  const ActiveScreen = screens[wizard.activeScreen];
  const screenDef = SCREEN_SEQUENCE.find((s) => s.id === wizard.activeScreen)!;
  const showBack = wizard.activeScreen !== 'persona-select';

  return (
    <div data-testid="wizard-shell" className="flex flex-col gap-6">
      <StepIndicator activeScreen={wizard.activeScreen} />

      <section
        data-testid={`screen-panel-${wizard.activeScreen}`}
        aria-label={screenDef.panelHeadline}
      >
        <h2 className="font-sans text-lg font-semibold text-text-primary mb-4">
          {screenDef.panelHeadline}
        </h2>
        <ActiveScreen />
      </section>

      {showBack && (
        <div className="flex flex-row justify-start">
          <Button variant="subtle" onClick={wizard.back}>
            ‹ Back
          </Button>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run test to verify it passes**

```bash
pnpm vitest run components/wizard/WizardShell.test.tsx
```

Expected: PASS, 6 tests.

- [ ] **Step 5: Commit**

```bash
git add components/wizard/WizardShell.tsx components/wizard/WizardShell.test.tsx
git commit -m "feat(wizard): land Batch 12.1.5 — WizardShell host

Wizard host renders StepIndicator + active screen + Back navigation. Forward
nav is screen-specific (auto-advance on S1, inline Run Analysis on S2,
per-screen Next on S3/S4, terminal on S5). Test uses inline placeholder
screens to avoid D1 circular import against later-batch screen components."
```

---

## Batch 12.2 — Screen 1 (Persona Select)

**Scope:** Adapt `PersonaSelector` to support auto-advance via a new `onSelectionConfirmed` callback. Build `PersonaSelectScreen` wrapping PersonaSelector + "Use your own profile" tile.

**Execution mode:** inline-with-checkpoints (discipline-heavy — visual register, microcopy, locked-spec compliance).

### Task 12.2.1 — Add "Use your own profile" tile to PersonaSelector

**Files:**
- Modify: `components/decisioning/PersonaSelector.tsx`
- Modify: `components/decisioning/PersonaSelector.test.tsx`

The PersonaSelector currently renders the four personas via `listPersonas()`. The "Use your own profile" tile is a fifth selectable card that emits a distinct selection signal (not a `PersonaId`). The cleanest contract: add an `onLiveModeSelected` callback alongside the existing `onPersonaChange`. Auto-advance is handled by the parent screen, not by PersonaSelector itself.

- [ ] **Step 1: Update the test to cover the new tile and callback**

```tsx
// Add to components/decisioning/PersonaSelector.test.tsx

it('renders a "Use your own profile" tile after the four persona cards', () => {
  render(
    <PersonaSelector
      activePersonaId={null}
      onPersonaChange={() => {}}
      onLiveModeSelected={() => {}}
    />,
  );
  expect(screen.getByText(/use your own profile/i)).toBeInTheDocument();
});

it('clicking the "Use your own profile" tile fires onLiveModeSelected', () => {
  const handler = vi.fn();
  render(
    <PersonaSelector
      activePersonaId={null}
      onPersonaChange={() => {}}
      onLiveModeSelected={handler}
    />,
  );
  fireEvent.click(screen.getByText(/use your own profile/i));
  expect(handler).toHaveBeenCalledTimes(1);
});

it('"Use your own profile" tile carries "Live audit" mode-disclosure label', () => {
  render(
    <PersonaSelector
      activePersonaId={null}
      onPersonaChange={() => {}}
      onLiveModeSelected={() => {}}
    />,
  );
  expect(screen.getByText('Live audit')).toBeInTheDocument();
});

it('"Use your own profile" tile is keyboard-activatable', () => {
  const handler = vi.fn();
  render(
    <PersonaSelector
      activePersonaId={null}
      onPersonaChange={() => {}}
      onLiveModeSelected={handler}
    />,
  );
  const tile = screen.getByLabelText(/use your own profile/i);
  fireEvent.keyDown(tile, { key: 'Enter' });
  expect(handler).toHaveBeenCalledTimes(1);
});
```

- [ ] **Step 2: Run the test to verify failures**

```bash
pnpm vitest run components/decisioning/PersonaSelector.test.tsx
```

Expected: FAIL on the four new tests with `onLiveModeSelected` prop unknown / tile not rendered.

- [ ] **Step 3: Update PersonaSelector implementation**

Insert the fifth tile after the persona map. Microcopy lifted from PRIMARY_PROMPT.md §4.8 footer pattern ("Live generation is rate-limited per session"):

```tsx
// Add to imports:
// (no new imports — reuses Card + cx already imported)

// Update interface:
interface PersonaSelectorProps {
  activePersonaId: PersonaId | null;
  onPersonaChange: (personaId: PersonaId | null) => void;
  /** Optional — when present, renders the "Use your own profile" tile that fires this on click/keyboard activation. */
  onLiveModeSelected?: () => void;
}

// Microcopy constants (added near MODE_DISCLOSURE_LABEL):
const LIVE_TILE_LABEL = 'Use your own profile';
const LIVE_TILE_DESCRIPTOR = 'Live audit against the real three-pass pipeline.';
const LIVE_TILE_DISCLOSURE = 'Live audit';
const LIVE_TILE_RATE_NOTE = 'Rate-limited per session.';

// In the return block, after the personas.map() output:
{onLiveModeSelected && (
  <div
    role="button"
    tabIndex={0}
    aria-label={LIVE_TILE_LABEL}
    onClick={onLiveModeSelected}
    onKeyDown={(e) => {
      if (e.key === ' ' || e.key === 'Enter') {
        e.preventDefault();
        onLiveModeSelected();
      }
    }}
    className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
  >
    <Card variant="elevated" className="transition-colors hover:bg-surface-recessed">
      <div className="flex flex-col gap-2">
        <div className="font-sans text-base font-semibold text-text-primary">
          {LIVE_TILE_LABEL}
        </div>
        <div className="font-sans text-sm text-text-secondary">
          {LIVE_TILE_DESCRIPTOR}
        </div>
        <div className="font-sans text-xs text-text-tertiary">
          {LIVE_TILE_DISCLOSURE}
        </div>
        <div className="font-sans text-xs text-text-tertiary">
          {LIVE_TILE_RATE_NOTE}
        </div>
      </div>
    </Card>
  </div>
)}
```

- [ ] **Step 4: Run tests; verify all pass**

```bash
pnpm vitest run components/decisioning/PersonaSelector.test.tsx
```

Expected: PASS — original tests still green, four new tests green.

- [ ] **Step 5: Commit**

```bash
git add components/decisioning/PersonaSelector.tsx components/decisioning/PersonaSelector.test.tsx
git commit -m "feat(decisioning): land Batch 12.2.1 — PersonaSelector live-mode tile

Adds 'Use your own profile' tile as a fifth selectable surface alongside the
four personas. New optional onLiveModeSelected callback; original
onPersonaChange contract preserved for back-compat. Keyboard-activatable
(Space + Enter) per WAI-ARIA button pattern. Microcopy:
- 'Use your own profile' (label)
- 'Live audit against the real three-pass pipeline.' (descriptor)
- 'Live audit' (mode-disclosure)
- 'Rate-limited per session.' (footer note)"
```

### Task 12.2.2 — Build PersonaSelectScreen wrapper

**Files:**
- Create: `components/screens/PersonaSelectScreen.tsx`
- Create: `components/screens/PersonaSelectScreen.test.tsx`

This wrapper consumes `useDecisioningState` (built in Batch 12.7) and `useWizardState`. For Batch 12.2.2 the screen is implemented against placeholder context surfaces; the wiring lands in 12.7.

- [ ] **Step 1: Write the failing test**

```tsx
// components/screens/PersonaSelectScreen.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonaSelectScreen } from './PersonaSelectScreen';
import { WizardContext } from '@/components/wizard/WizardContext';
import { DecisioningContext } from '@/components/orchestration/DecisioningContext';

function renderWithContext({
  advance = vi.fn(),
  setMode = vi.fn(),
  setPersonaId = vi.fn(),
}: { advance?: () => void; setMode?: (m: any) => void; setPersonaId?: (id: any) => void } = {}) {
  return render(
    <WizardContext.Provider value={{ advance, back: vi.fn(), jumpTo: vi.fn(), setMode, reset: vi.fn(), activeScreen: 'persona-select', mode: 'idle' }}>
      <DecisioningContext.Provider value={{ personaId: null, setPersonaId, liveProfile: null, setLiveProfile: vi.fn(), machine: null as any, mode: 'idle' as any }}>
        <PersonaSelectScreen />
      </DecisioningContext.Provider>
    </WizardContext.Provider>,
  );
}

describe('PersonaSelectScreen', () => {
  it('renders the persona selector with all 4 personas + Use Your Own tile', () => {
    renderWithContext();
    expect(screen.getByTestId('persona-selector')).toBeInTheDocument();
    expect(screen.getByText(/use your own profile/i)).toBeInTheDocument();
  });

  it('selecting a persona auto-advances and sets persona mode', () => {
    const advance = vi.fn();
    const setMode = vi.fn();
    const setPersonaId = vi.fn();
    renderWithContext({ advance, setMode, setPersonaId });
    // Click first persona (Maria — assumes listPersonas ordering)
    const card = screen.getByLabelText(/select maria/i);
    fireEvent.click(card);
    expect(setPersonaId).toHaveBeenCalledWith('maria');
    expect(setMode).toHaveBeenCalledWith('persona');
    expect(advance).toHaveBeenCalledTimes(1);
  });

  it('selecting "Use your own profile" auto-advances and sets live mode', () => {
    const advance = vi.fn();
    const setMode = vi.fn();
    renderWithContext({ advance, setMode });
    fireEvent.click(screen.getByText(/use your own profile/i));
    expect(setMode).toHaveBeenCalledWith('live');
    expect(advance).toHaveBeenCalledTimes(1);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run components/screens/PersonaSelectScreen.test.tsx
```

Expected: FAIL on missing module + missing contexts.

- [ ] **Step 3: Create WizardContext + DecisioningContext shells**

Two small context files needed; both surface in Task 12.7 fully. For 12.2.2 we land the type shells:

```typescript
// components/wizard/WizardContext.ts
'use client';
import { createContext, useContext } from 'react';
import type { WizardState } from './useWizardState';

export const WizardContext = createContext<WizardState | null>(null);

export function useWizard(): WizardState {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within WizardContext.Provider');
  return ctx;
}
```

```typescript
// components/orchestration/DecisioningContext.ts
'use client';
import { createContext, useContext } from 'react';
import type { PersonaId } from '@/lib/schemas/personaAdapters';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';

export type DecisioningMode = 'idle' | 'persona' | 'live';

export interface DecisioningContextValue {
  mode: DecisioningMode;
  personaId: PersonaId | null;
  setPersonaId: (id: PersonaId | null) => void;
  liveProfile: CustomerProfile | null;
  setLiveProfile: (p: CustomerProfile | null) => void;
  /** Machine state surface — fully populated by DecisioningProvider in Batch 12.7. */
  machine: unknown;
}

export const DecisioningContext = createContext<DecisioningContextValue | null>(null);

export function useDecisioning(): DecisioningContextValue {
  const ctx = useContext(DecisioningContext);
  if (!ctx) throw new Error('useDecisioning must be used within DecisioningContext.Provider');
  return ctx;
}
```

- [ ] **Step 4: Implement PersonaSelectScreen**

```tsx
// components/screens/PersonaSelectScreen.tsx
'use client';

import { PersonaSelector } from '@/components/decisioning/PersonaSelector';
import { useWizard } from '@/components/wizard/WizardContext';
import { useDecisioning } from '@/components/orchestration/DecisioningContext';
import type { PersonaId } from '@/lib/schemas/personaAdapters';

export function PersonaSelectScreen() {
  const wizard = useWizard();
  const decisioning = useDecisioning();

  const handlePersonaChange = (id: PersonaId | null) => {
    if (id === null) return; // no-op on deselect — auto-advance fires only on selection
    decisioning.setPersonaId(id);
    wizard.setMode('persona');
    wizard.advance();
  };

  const handleLiveModeSelected = () => {
    wizard.setMode('live');
    wizard.advance();
  };

  return (
    <div className="flex flex-col gap-4">
      <p className="font-sans text-sm text-text-secondary">
        Pre-generated examples or live audit against a profile you enter.
      </p>
      <PersonaSelector
        activePersonaId={decisioning.personaId}
        onPersonaChange={handlePersonaChange}
        onLiveModeSelected={handleLiveModeSelected}
      />
    </div>
  );
}
```

- [ ] **Step 5: Run tests; verify pass**

```bash
pnpm vitest run components/screens/PersonaSelectScreen.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add components/wizard/WizardContext.ts components/orchestration/DecisioningContext.ts components/screens/PersonaSelectScreen.tsx components/screens/PersonaSelectScreen.test.tsx
git commit -m "feat(screens): land Batch 12.2.2 — PersonaSelectScreen + context shells

Screen 1 wraps PersonaSelector with auto-advance on persona-card click or
'Use your own profile' tile click. Two new context shells (WizardContext,
DecisioningContext) provide the integration surface; DecisioningContext's
machine field is typed as unknown for 12.2.2 and gets fully typed in 12.7
when the provider lands."
```

---

## Batch 12.3 — Screen 2 primitives

**Scope:** Build the three Screen-2 primitives: `PipelineStageRow`, `UpstreamDataSubgroup`, `RunAnalysisButton`. Composition into `DataFlowMap` lands in 12.5.

**Execution mode:** inline-with-checkpoints (discipline-heavy — visual register, Decision 42 evolution).

### Task 12.3.1 — Build PipelineStageRow

**Files:**
- Create: `components/decisioning/PipelineStageRow.tsx`
- Create: `components/decisioning/PipelineStageRow.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/decisioning/PipelineStageRow.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { PipelineStageRow } from './PipelineStageRow';

describe('PipelineStageRow', () => {
  it('renders the stage label in the left cell', () => {
    render(
      <PipelineStageRow stageLabel="Onboarding">
        <div data-testid="right-content">data</div>
      </PipelineStageRow>,
    );
    expect(screen.getByText('Onboarding')).toBeInTheDocument();
    expect(screen.getByTestId('right-content')).toBeInTheDocument();
  });

  it('applies accent treatment when active', () => {
    render(
      <PipelineStageRow stageLabel="Reasoning Layer" active>
        <div>data</div>
      </PipelineStageRow>,
    );
    const left = screen.getByText('Reasoning Layer').closest('[data-stage-active]');
    expect(left).toHaveAttribute('data-stage-active', 'true');
  });

  it('renders a vertical connector below the row when notLast', () => {
    const { container } = render(
      <PipelineStageRow stageLabel="Onboarding" notLast>
        <div>data</div>
      </PipelineStageRow>,
    );
    expect(container.querySelector('[data-testid="pipeline-connector"]')).toBeInTheDocument();
  });

  it('does not render a connector when last row', () => {
    const { container } = render(
      <PipelineStageRow stageLabel="Core Banking">
        <div>data</div>
      </PipelineStageRow>,
    );
    expect(container.querySelector('[data-testid="pipeline-connector"]')).not.toBeInTheDocument();
  });

  it('left cell is NOT interactive (no role, no tabIndex)', () => {
    render(
      <PipelineStageRow stageLabel="AML Screening">
        <div>data</div>
      </PipelineStageRow>,
    );
    const left = screen.getByText('AML Screening').closest('div');
    expect(left).not.toHaveAttribute('role');
    expect(left).not.toHaveAttribute('tabindex');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run components/decisioning/PipelineStageRow.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement PipelineStageRow**

```tsx
// components/decisioning/PipelineStageRow.tsx
// One row of the vertical pipeline on Screen 2: left stage-box + right panel.
//
// Decision 48a — architecture strip evolves from page-bottom static artifact
// to organizing axis on Screen 2. Boxes preserve non-interactivity (no hover,
// no click) per Decision 42 discipline. The right-panel children are sibling
// surfaces, not interactive disclosure.
//
// Active treatment (Reasoning Layer): slate accent background + inverse text
// per visual_system.md §5.4. Other stages: surface-recessed background.

'use client';

import { cx } from '@/lib/ui/classnames';

interface PipelineStageRowProps {
  stageLabel: string;
  /** True for the Reasoning Layer row only — gets slate-accent treatment. */
  active?: boolean;
  /** True for every row except the last (Core Banking) — renders ↓ connector below. */
  notLast?: boolean;
  children: React.ReactNode;
}

export function PipelineStageRow({
  stageLabel,
  active = false,
  notLast = false,
  children,
}: PipelineStageRowProps) {
  return (
    <div className="flex flex-col">
      <div className="flex flex-row gap-6">
        <div
          data-stage-active={active}
          className={cx(
            'flex w-32 shrink-0 flex-col justify-center rounded p-4 font-sans text-sm font-semibold',
            active
              ? 'bg-accent-primary text-text-inverse'
              : 'bg-surface-recessed text-text-primary border border-border-default',
          )}
        >
          {stageLabel}
        </div>
        <div className="flex-1">{children}</div>
      </div>
      {notLast && (
        <div
          data-testid="pipeline-connector"
          aria-hidden="true"
          className="ml-16 my-2 font-sans text-text-tertiary"
        >
          ↓
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests; verify pass**

```bash
pnpm vitest run components/decisioning/PipelineStageRow.test.tsx
```

Expected: PASS, 5 tests.

- [ ] **Step 5: Commit**

```bash
git add components/decisioning/PipelineStageRow.tsx components/decisioning/PipelineStageRow.test.tsx
git commit -m "feat(decisioning): land Batch 12.3.1 — PipelineStageRow

One row of the Screen 2 vertical pipeline. Left cell = stage label box
(non-interactive per Decision 42 preserved discipline). Right cell = children
panel. Active prop (Reasoning Layer only) applies slate-accent + inverse text.
notLast prop renders ↓ vertical connector below the row."
```

### Task 12.3.2 — Build UpstreamDataSubgroup

**Files:**
- Create: `components/decisioning/UpstreamDataSubgroup.tsx`
- Create: `components/decisioning/UpstreamDataSubgroup.test.tsx`

This is the subgroup card that sits in the right-panel cell of a stage row. It supports two render modes: read-only (persona mode — value display) or edit (live mode — form field slot).

- [ ] **Step 1: Write the failing test**

```tsx
// components/decisioning/UpstreamDataSubgroup.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { UpstreamDataSubgroup } from './UpstreamDataSubgroup';

describe('UpstreamDataSubgroup', () => {
  it('renders the subgroup heading', () => {
    render(
      <UpstreamDataSubgroup title="Customer identity" fields={[]} />,
    );
    expect(screen.getByText('Customer identity')).toBeInTheDocument();
  });

  it('renders read-only field rows when fields prop is provided', () => {
    render(
      <UpstreamDataSubgroup
        title="Customer identity"
        fields={[
          { label: 'reference', value: 'M-0042' },
          { label: 'document', value: 'PhilSys' },
        ]}
      />,
    );
    expect(screen.getByText('reference')).toBeInTheDocument();
    expect(screen.getByText('M-0042')).toBeInTheDocument();
    expect(screen.getByText('document')).toBeInTheDocument();
    expect(screen.getByText('PhilSys')).toBeInTheDocument();
  });

  it('renders editSlot children when provided (live mode)', () => {
    render(
      <UpstreamDataSubgroup title="Customer identity" editSlot={<input data-testid="form-input" />} />,
    );
    expect(screen.getByTestId('form-input')).toBeInTheDocument();
  });

  it('renders nothing in the body when both fields and editSlot are absent', () => {
    const { container } = render(<UpstreamDataSubgroup title="Empty" />);
    expect(screen.getByText('Empty')).toBeInTheDocument();
    expect(container.querySelectorAll('dt').length).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run components/decisioning/UpstreamDataSubgroup.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement UpstreamDataSubgroup**

```tsx
// components/decisioning/UpstreamDataSubgroup.tsx
// One data subgroup card inside a PipelineStageRow's right panel.
//
// Read-only mode (persona playback): fields prop carries [{label, value}]
// rows rendered as a definition-list-like layout with tabular-aligned values.
//
// Edit mode (live custom input): editSlot prop carries an RHF form section
// (from components/forms/*Fields.tsx) rendered in place of the read-only
// fields. Card chrome is identical in both modes.

'use client';

import { Card } from '@/components/primitives/Card';

export interface SubgroupFieldRow {
  label: string;
  value: string;
}

interface UpstreamDataSubgroupProps {
  title: string;
  /** Read-only persona-mode rendering. Mutually exclusive with editSlot. */
  fields?: SubgroupFieldRow[];
  /** Live-mode edit rendering (form section). Mutually exclusive with fields. */
  editSlot?: React.ReactNode;
}

export function UpstreamDataSubgroup({ title, fields, editSlot }: UpstreamDataSubgroupProps) {
  return (
    <Card variant="elevated" className="min-w-[180px]">
      <div className="flex flex-col gap-3">
        <h3 className="font-sans text-sm font-semibold text-text-tertiary">
          {title}
        </h3>
        {editSlot ? (
          editSlot
        ) : fields && fields.length > 0 ? (
          <dl className="grid grid-cols-[max-content_1fr] gap-x-4 gap-y-2 font-sans text-sm">
            {fields.map((row, idx) => (
              <div key={idx} className="contents">
                <dt className="text-text-secondary">{row.label}</dt>
                <dd className="text-text-primary tabular-nums">{row.value}</dd>
              </div>
            ))}
          </dl>
        ) : null}
      </div>
    </Card>
  );
}
```

- [ ] **Step 4: Run tests; verify pass**

```bash
pnpm vitest run components/decisioning/UpstreamDataSubgroup.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add components/decisioning/UpstreamDataSubgroup.tsx components/decisioning/UpstreamDataSubgroup.test.tsx
git commit -m "feat(decisioning): land Batch 12.3.2 — UpstreamDataSubgroup

Subgroup card rendered inside PipelineStageRow's right panel. Two modes:
- Read-only (persona): fields=[{label,value}] rendered as definition-list
  with tabular-aligned values per visual_system §3 tabular-figures discipline.
- Edit (live): editSlot ReactNode replaces the read-only rendering. Card
  chrome is identical across modes."
```

### Task 12.3.3 — Build RunAnalysisButton

**Files:**
- Create: `components/decisioning/RunAnalysisButton.tsx`
- Create: `components/decisioning/RunAnalysisButton.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/decisioning/RunAnalysisButton.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { RunAnalysisButton } from './RunAnalysisButton';

describe('RunAnalysisButton', () => {
  it('renders "Run Analysis ›" label', () => {
    render(<RunAnalysisButton onRun={() => {}} disabled={false} />);
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeInTheDocument();
  });

  it('calls onRun when clicked and enabled', () => {
    const onRun = vi.fn();
    render(<RunAnalysisButton onRun={onRun} disabled={false} />);
    fireEvent.click(screen.getByRole('button', { name: /run analysis/i }));
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('does NOT call onRun when disabled', () => {
    const onRun = vi.fn();
    render(<RunAnalysisButton onRun={onRun} disabled />);
    fireEvent.click(screen.getByRole('button', { name: /run analysis/i }));
    expect(onRun).not.toHaveBeenCalled();
  });

  it('shows "Starting…" label when running', () => {
    render(<RunAnalysisButton onRun={() => {}} disabled={false} running />);
    expect(screen.getByText(/starting/i)).toBeInTheDocument();
    expect(screen.queryByText(/run analysis/i)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run components/decisioning/RunAnalysisButton.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement RunAnalysisButton**

```tsx
// components/decisioning/RunAnalysisButton.tsx
// Inline CTA inside the Reasoning Layer row on Screen 2.
//
// Decision 48c — Run Analysis CTA placement inside Reasoning Layer row,
// not in the bottom navigation bar. Anchors the action semantically to the
// stage that performs it.

'use client';

import { Button } from '@/components/primitives/Button';

interface RunAnalysisButtonProps {
  onRun: () => void;
  disabled: boolean;
  /** True briefly between click and screen advance — shows "Starting…" microcopy. */
  running?: boolean;
}

export function RunAnalysisButton({ onRun, disabled, running = false }: RunAnalysisButtonProps) {
  return (
    <div className="flex flex-row justify-end">
      <Button variant="primary" onClick={onRun} disabled={disabled || running}>
        {running ? 'Starting…' : 'Run Analysis ›'}
      </Button>
    </div>
  );
}
```

- [ ] **Step 4: Run tests; verify pass**

```bash
pnpm vitest run components/decisioning/RunAnalysisButton.test.tsx
```

Expected: PASS, 4 tests.

- [ ] **Step 5: Commit**

```bash
git add components/decisioning/RunAnalysisButton.tsx components/decisioning/RunAnalysisButton.test.tsx
git commit -m "feat(decisioning): land Batch 12.3.3 — RunAnalysisButton

Inline CTA for the Reasoning Layer row on Screen 2. Slate-primary variant
per visual_system §5.5 (affirmative action). Disabled state via prop;
running state shows 'Starting…' microcopy briefly before screen advance."
```

---

## Batch 12.4 — Field section extraction

**Scope:** Extract the four field sections from `CustomInputForm` into reusable components under `components/forms/`. Each new component accepts an RHF `control` prop and renders just its fields (no card chrome, no submit button). CustomInputForm becomes a thin wrapper composing the four sections for backward compatibility.

**Execution mode:** subagent-driven (mechanical extraction; the pattern is established in the existing form).

### Task 12.4.1 — Extract CustomerIdentityFields

The extraction pattern is identical for all four sections. This task documents the pattern in full code for the first section; tasks 12.4.2–12.4.4 reference back to this pattern with section-specific field names only.

**Files:**
- Create: `components/forms/CustomerIdentityFields.tsx`
- Create: `components/forms/CustomerIdentityFields.test.tsx`

**Pattern:**
1. Read the existing rendering for `customer_reference`, `identity_document_type`, `residency_status`, `customer_type` from `components/decisioning/CustomInputForm.tsx`.
2. Extract those four field renderings into a new component `CustomerIdentityFields` that accepts `{ control, errors, register }` from RHF.
3. Preserve all behavior: composite sub-controls on `identity_document_type` ("+ PhilSys enrollment in process" checkbox), regulatory tooltips on `customer_type`, validation message rendering.
4. The new component renders only the field controls — no `<Card>` wrapper, no section heading, no internal `<Card>` padding (DataFlowMap's UpstreamDataSubgroup provides the chrome).

- [ ] **Step 1: Read the existing implementation in CustomInputForm to identify the exact JSX block for the four Customer Identity fields**

Run:
```bash
grep -n "customer_reference\|identity_document_type\|residency_status\|customer_type" components/decisioning/CustomInputForm.tsx
```

Identify the line range that owns the four fields' rendering. Copy verbatim into the new component, removing only the outer `<Card>` and section heading.

- [ ] **Step 2: Write the failing test**

```tsx
// components/forms/CustomerIdentityFields.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { useForm, FormProvider } from 'react-hook-form';
import { CustomerIdentityFields } from './CustomerIdentityFields';

function Wrapper() {
  const methods = useForm();
  return (
    <FormProvider {...methods}>
      <CustomerIdentityFields />
    </FormProvider>
  );
}

describe('CustomerIdentityFields', () => {
  it('renders all four identity fields', () => {
    render(<Wrapper />);
    expect(screen.getByLabelText(/customer reference/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/identity document type/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/residency status/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/customer type/i)).toBeInTheDocument();
  });

  it('renders regulatory tooltip on customer_type field', () => {
    render(<Wrapper />);
    const tooltip = screen.getByLabelText(/customer type regulatory citation/i);
    expect(tooltip).toBeInTheDocument();
  });

  it('does NOT render section card chrome', () => {
    const { container } = render(<Wrapper />);
    // DataFlowMap's UpstreamDataSubgroup provides the chrome; this component
    // renders just the fields.
    expect(container.querySelector('[data-card-variant]')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 3: Run the test to verify it fails**

```bash
pnpm vitest run components/forms/CustomerIdentityFields.test.tsx
```

Expected: FAIL.

- [ ] **Step 4: Implement CustomerIdentityFields**

The implementation lifts the four field JSX blocks from `CustomInputForm.tsx`. Reference the existing source for exact field-name strings, tooltip content, validation rules, and composite-control patterns; do not reinvent. The pattern from CustomInputForm:
- Each field uses `useFormContext()` to access `register` and `formState.errors`
- Inline error messages in `--violation-primary --text-sm`
- Tooltip `?` glyph for the four flagged fields (per Decision 37d)
- Composite sub-controls for `identity_document_type` (PhilSys enrollment checkbox)

The new component signature:

```tsx
// components/forms/CustomerIdentityFields.tsx
'use client';

import { useFormContext } from 'react-hook-form';
import { Tooltip } from '@/components/primitives/Tooltip';
import { profileFormConfig } from '@/lib/forms/profileFormConfig';

const CUSTOMER_TYPE_CITATION =
  'Customer-type classification governs CDD intensity — FATF R.10, BSP MORB §922.';

export function CustomerIdentityFields() {
  const { register, formState: { errors }, watch } = useFormContext();
  // ... lift the four field renderings here, removing outer Card chrome
  // ... preserve all composite sub-controls, tooltips, error rendering
}
```

Lift the actual JSX from `CustomInputForm.tsx` lines covering these four fields. Pattern documented; specific JSX is verbatim from existing source. Component returns a `<div className="flex flex-col gap-4">` containing the four field blocks.

- [ ] **Step 5: Run tests; verify pass**

```bash
pnpm vitest run components/forms/CustomerIdentityFields.test.tsx
```

Expected: PASS, 3 tests.

- [ ] **Step 6: Commit**

```bash
git add components/forms/CustomerIdentityFields.tsx components/forms/CustomerIdentityFields.test.tsx
git commit -m "feat(forms): land Batch 12.4.1 — CustomerIdentityFields extraction

Extracts customer_reference / identity_document_type / residency_status /
customer_type field rendering from CustomInputForm into a reusable
section. Card chrome removed (DataFlowMap UpstreamDataSubgroup provides it
on Screen 2; CustomInputForm wrapping re-adds it for the standalone path).
Composite sub-controls + regulatory tooltips preserved per Decision 37."
```

### Task 12.4.2 — Extract AccountBehaviorFields

Same pattern as 12.4.1, for `occupation_type`, `source_of_funds`, `account_purpose`, `expected_monthly_volume_php`. Critical preservations: source_of_funds + account_purpose composite sub-controls; occupation_type enum-or-free-text union with three guards (per Decision 37b — implemented at schema layer; this component just renders the union UI); expected_monthly_volume_php numeric format-on-blur with thousand separators; PHP prefix label in `--text-tertiary`; tabular-figures display. Regulatory tooltip on source_of_funds.

Tests, implementation, commit follow 12.4.1's structure. Commit message:

```bash
git commit -m "feat(forms): land Batch 12.4.2 — AccountBehaviorFields extraction

Extracts occupation_type / source_of_funds / account_purpose /
expected_monthly_volume_php from CustomInputForm. Composite sub-controls
on source_of_funds + account_purpose preserved. Numeric format-on-blur
on expected_monthly_volume_php preserved. Regulatory tooltip on
source_of_funds preserved."
```

### Task 12.4.3 — Extract RiskIndicatorFields

Same pattern for `pep_status`, `sanctions_screening`, `high_risk_jurisdiction_connection`, `adverse_media`. Regulatory tooltips on pep_status + high_risk_jurisdiction_connection preserved.

Commit message:

```bash
git commit -m "feat(forms): land Batch 12.4.3 — RiskIndicatorFields extraction

Extracts pep_status / sanctions_screening /
high_risk_jurisdiction_connection / adverse_media from CustomInputForm.
Regulatory tooltips on pep_status and high_risk_jurisdiction_connection
preserved."
```

### Task 12.4.4 — Extract RelationshipFields

Same pattern for `years_with_bank`. Numeric input rendering (integer); no tooltip; tabular-figures display.

Commit message:

```bash
git commit -m "feat(forms): land Batch 12.4.4 — RelationshipFields extraction

Extracts years_with_bank from CustomInputForm. Integer numeric input;
tabular-figures display."
```

### Task 12.4.5 — Refactor CustomInputForm to compose the four sections

**Files:**
- Modify: `components/decisioning/CustomInputForm.tsx`
- Modify: `components/decisioning/CustomInputForm.test.tsx`

CustomInputForm becomes a thin wrapper:
1. Owns RHF form context, schema validation, submit handler
2. Wraps each of the four field-section components in a `<Card>` (preserving the standalone four-card layout for the legacy standalone use case)
3. Renders the submit button + mode-disclosure label + footer microcopy

Existing field-level tests in `CustomInputForm.test.tsx` either (a) pivot to assert the composition (each section rendered inside a card), or (b) delete those that duplicate the new per-section tests.

- [ ] **Step 1: Update CustomInputForm.tsx to compose**

```tsx
// components/decisioning/CustomInputForm.tsx
// (rewrite — top of file preserves the docstring discipline + anchors)

'use client';

// ... imports ...
import { CustomerIdentityFields } from '@/components/forms/CustomerIdentityFields';
import { AccountBehaviorFields } from '@/components/forms/AccountBehaviorFields';
import { RiskIndicatorFields } from '@/components/forms/RiskIndicatorFields';
import { RelationshipFields } from '@/components/forms/RelationshipFields';

// Form schema + submit handler unchanged from prior implementation.

export function CustomInputForm({ onValidatedSubmit }: CustomInputFormProps) {
  const methods = useForm<...>({ ... });

  return (
    <FormProvider {...methods}>
      <form onSubmit={methods.handleSubmit(onValidatedSubmit)} className="flex flex-col gap-6">
        <p className="font-sans text-xs text-text-tertiary">Live audit</p>

        <Card variant="elevated">
          <h3 className="font-sans text-sm text-text-tertiary mb-4">Customer identity</h3>
          <CustomerIdentityFields />
        </Card>

        <Card variant="elevated">
          <h3 className="font-sans text-sm text-text-tertiary mb-4">Account & behavior</h3>
          <AccountBehaviorFields />
        </Card>

        <Card variant="elevated">
          <h3 className="font-sans text-sm text-text-tertiary mb-4">Risk indicators</h3>
          <RiskIndicatorFields />
        </Card>

        <Card variant="elevated">
          <h3 className="font-sans text-sm text-text-tertiary mb-4">Relationship</h3>
          <RelationshipFields />
        </Card>

        <Button variant="primary" type="submit">Run three-pass analysis</Button>

        <p className="font-sans text-xs text-text-tertiary">
          Live generation is rate-limited per session. Pre-generated examples are not affected.
        </p>
      </form>
    </FormProvider>
  );
}
```

- [ ] **Step 2: Update CustomInputForm.test.tsx**

Pivot the tests to assert composition rather than per-field rendering. Field-level assertions move to the per-section test files in 12.4.1–12.4.4. Composition assertions:
- All four sections render
- Submit button is present
- Mode-disclosure label + footer microcopy present
- Submit fires onValidatedSubmit with parsed profile

- [ ] **Step 3: Run all related tests; verify pass**

```bash
pnpm vitest run components/decisioning/CustomInputForm.test.tsx components/forms/
```

Expected: PASS.

- [ ] **Step 4: Commit**

```bash
git add components/decisioning/CustomInputForm.tsx components/decisioning/CustomInputForm.test.tsx
git commit -m "refactor(decisioning): land Batch 12.4.5 — CustomInputForm composes 4 sections

CustomInputForm becomes a thin wrapper composing CustomerIdentityFields /
AccountBehaviorFields / RiskIndicatorFields / RelationshipFields. RHF form
context, schema validation, submit handler stay in this component. The
four-card standalone layout from Decision 37 is preserved for backward
compatibility; DataFlowMap consumes the same field sections without the
card chrome on Screen 2."
```

---

## Batch 12.5 — DataFlowMap composition (Screen 2)

**Scope:** Build `DataFlowMap` composing `PipelineStageRow` ×5 + `UpstreamDataSubgroup` cells + the inline `RunAnalysisButton`. Build `DataFlowScreen` wrapper that wires DataFlowMap to wizard + decisioning context. Persona-mode and live-mode rendering paths.

**Execution mode:** inline-with-checkpoints (discipline-heavy — Decision 42 evolution surface; visual register).

### Task 12.5.1 — Build field-grouping data adapter

**Files:**
- Create: `lib/orchestration/fieldGrouping.ts`
- Create: `lib/orchestration/fieldGrouping.test.ts`

Per Decision 48d, the 13 customer-profile fields map to four subgroups; each subgroup attaches to one of two upstream boxes (Onboarding or AML Screening). This adapter takes a `CustomerProfile` and returns the structured grouping for read-only persona rendering.

- [ ] **Step 1: Write the failing test**

```typescript
// lib/orchestration/fieldGrouping.test.ts
import { describe, it, expect } from 'vitest';
import { groupProfileForDataFlow } from './fieldGrouping';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';

const SAMPLE: CustomerProfile = {
  customer_reference: 'M-0042',
  identity_document_type: 'PhilSys',
  residency_status: 'resident',
  customer_type: 'retail_individual',
  occupation_type: 'employed',
  source_of_funds: 'salary',
  account_purpose: 'personal_banking',
  expected_monthly_volume_php: 850000,
  pep_status: 'none',
  sanctions_screening: 'clear',
  high_risk_jurisdiction_connection: 'clear',
  adverse_media: 'none',
  years_with_bank: 6,
};

describe('groupProfileForDataFlow', () => {
  it('returns four subgroups in canonical order', () => {
    const groups = groupProfileForDataFlow(SAMPLE);
    expect(groups.map((g) => g.title)).toEqual([
      'Customer identity',
      'Account & behavior',
      'Risk indicators',
      'Relationship',
    ]);
  });

  it('Customer identity subgroup maps to Onboarding upstream', () => {
    const groups = groupProfileForDataFlow(SAMPLE);
    expect(groups[0].upstream).toBe('onboarding');
  });

  it('Risk indicators subgroup maps to AML Screening upstream', () => {
    const groups = groupProfileForDataFlow(SAMPLE);
    expect(groups[2].upstream).toBe('aml-screening');
  });

  it('renders PHP volume with tabular thousand-separator format', () => {
    const groups = groupProfileForDataFlow(SAMPLE);
    const accountBehavior = groups[1];
    const volumeRow = accountBehavior.fields.find((f) => f.label === 'expected volume');
    expect(volumeRow?.value).toBe('PHP 850,000');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run lib/orchestration/fieldGrouping.test.ts
```

Expected: FAIL.

- [ ] **Step 3: Implement fieldGrouping**

```typescript
// lib/orchestration/fieldGrouping.ts
// Map a CustomerProfile into the four-subgroup structure for Screen 2's
// DataFlowMap. Decision 48d — Customer Identity + Account & Behavior +
// Relationship route to Onboarding; Risk Indicators routes to AML Screening.

import type { CustomerProfile } from '@/lib/schemas/customerProfile';
import type { SubgroupFieldRow } from '@/components/decisioning/UpstreamDataSubgroup';

export type UpstreamBoxId = 'onboarding' | 'aml-screening';

export interface GroupedSubgroup {
  title: string;
  upstream: UpstreamBoxId;
  fields: SubgroupFieldRow[];
}

function formatPhp(amount: number): string {
  return `PHP ${amount.toLocaleString('en-US')}`;
}

export function groupProfileForDataFlow(p: CustomerProfile): GroupedSubgroup[] {
  return [
    {
      title: 'Customer identity',
      upstream: 'onboarding',
      fields: [
        { label: 'reference', value: p.customer_reference },
        { label: 'document', value: p.identity_document_type },
        { label: 'residency', value: p.residency_status },
        { label: 'customer type', value: p.customer_type },
      ],
    },
    {
      title: 'Account & behavior',
      upstream: 'onboarding',
      fields: [
        { label: 'occupation', value: p.occupation_type },
        { label: 'source of funds', value: p.source_of_funds },
        { label: 'account purpose', value: p.account_purpose },
        { label: 'expected volume', value: formatPhp(p.expected_monthly_volume_php) },
      ],
    },
    {
      title: 'Risk indicators',
      upstream: 'aml-screening',
      fields: [
        { label: 'PEP status', value: p.pep_status },
        { label: 'sanctions', value: p.sanctions_screening },
        { label: 'jurisdiction', value: p.high_risk_jurisdiction_connection },
        { label: 'adverse media', value: p.adverse_media },
      ],
    },
    {
      title: 'Relationship',
      upstream: 'onboarding',
      fields: [
        { label: 'years with bank', value: String(p.years_with_bank) },
      ],
    },
  ];
}
```

- [ ] **Step 4: Run tests; verify pass + commit**

```bash
pnpm vitest run lib/orchestration/fieldGrouping.test.ts
git add lib/orchestration/fieldGrouping.ts lib/orchestration/fieldGrouping.test.ts
git commit -m "feat(orchestration): land Batch 12.5.1 — fieldGrouping adapter

Maps CustomerProfile → four GroupedSubgroup entries for DataFlowMap.
Decision 48d field-to-upstream mapping encoded: Customer Identity +
Account & Behavior + Relationship → onboarding; Risk Indicators →
aml-screening. PHP volume formatted as 'PHP 850,000' with thousand
separators."
```

### Task 12.5.2 — Build DataFlowMap composition

**Files:**
- Create: `components/decisioning/DataFlowMap.tsx`
- Create: `components/decisioning/DataFlowMap.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
// components/decisioning/DataFlowMap.test.tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DataFlowMap } from './DataFlowMap';

const PROFILE_SUBGROUPS = [
  { title: 'Customer identity', upstream: 'onboarding' as const, fields: [{ label: 'reference', value: 'M-0042' }] },
  { title: 'Account & behavior', upstream: 'onboarding' as const, fields: [{ label: 'occupation', value: 'Employed' }] },
  { title: 'Risk indicators', upstream: 'aml-screening' as const, fields: [{ label: 'PEP status', value: 'None' }] },
  { title: 'Relationship', upstream: 'onboarding' as const, fields: [{ label: 'years', value: '6' }] },
];

describe('DataFlowMap', () => {
  it('renders all five stage labels in canonical order', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    const labels = ['Onboarding', 'AML Screening', 'Reasoning Layer', 'Case Management', 'Core Banking'];
    labels.forEach((l) => expect(screen.getByText(l)).toBeInTheDocument());
  });

  it('applies active treatment to Reasoning Layer row only', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    const reasoning = screen.getByText('Reasoning Layer').closest('[data-stage-active]');
    const onboarding = screen.getByText('Onboarding').closest('[data-stage-active]');
    expect(reasoning).toHaveAttribute('data-stage-active', 'true');
    expect(onboarding).toHaveAttribute('data-stage-active', 'false');
  });

  it('places Customer identity + Account & behavior + Relationship in Onboarding row', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    // Onboarding row's right panel contains three subgroups; AML row contains one.
    // Structural check via test-ids set in DataFlowMap.
    const onboardingPanel = screen.getByTestId('stage-onboarding-panel');
    expect(onboardingPanel).toContainElement(screen.getByText('Customer identity'));
    expect(onboardingPanel).toContainElement(screen.getByText('Account & behavior'));
    expect(onboardingPanel).toContainElement(screen.getByText('Relationship'));
  });

  it('places Risk indicators in AML Screening row', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    const amlPanel = screen.getByTestId('stage-aml-screening-panel');
    expect(amlPanel).toContainElement(screen.getByText('Risk indicators'));
  });

  it('renders Run Analysis button inside the Reasoning Layer row', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    const reasoningPanel = screen.getByTestId('stage-reasoning-layer-panel');
    expect(reasoningPanel).toContainElement(screen.getByRole('button', { name: /run analysis/i }));
  });

  it('renders v1/Production annotation below the row stack', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun />);
    expect(screen.getByText(/v1 demo/i)).toBeInTheDocument();
    expect(screen.getByText(/multi-model audit on bedrock/i)).toBeInTheDocument();
  });

  it('Run Analysis button is disabled when canRun is false', () => {
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={() => {}} canRun={false} />);
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeDisabled();
  });

  it('clicking Run Analysis fires onRunAnalysis', () => {
    const onRun = vi.fn();
    render(<DataFlowMap subgroups={PROFILE_SUBGROUPS} onRunAnalysis={onRun} canRun />);
    screen.getByRole('button', { name: /run analysis/i }).click();
    expect(onRun).toHaveBeenCalledTimes(1);
  });

  it('renders live-mode edit slots when liveModeSlots prop is provided', () => {
    const slots = {
      'customer-identity': <input data-testid="live-identity-input" />,
      'account-behavior': <input data-testid="live-account-input" />,
      'risk-indicators': <input data-testid="live-risk-input" />,
      'relationship': <input data-testid="live-relationship-input" />,
    };
    render(<DataFlowMap liveModeSlots={slots} onRunAnalysis={() => {}} canRun />);
    expect(screen.getByTestId('live-identity-input')).toBeInTheDocument();
    expect(screen.getByTestId('live-account-input')).toBeInTheDocument();
    expect(screen.getByTestId('live-risk-input')).toBeInTheDocument();
    expect(screen.getByTestId('live-relationship-input')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

```bash
pnpm vitest run components/decisioning/DataFlowMap.test.tsx
```

Expected: FAIL.

- [ ] **Step 3: Implement DataFlowMap**

```tsx
// components/decisioning/DataFlowMap.tsx
// Screen 2 composition: vertical 5-stage pipeline with data subgroups
// anchored to the right of each row.
//
// Decision 48 — wizard restructure organizing axis.
// Decision 48a — architecture strip evolves to vertical layout on Screen 2;
//   replaces the prior horizontal page-bottom artifact.
// Decision 48b — first box renamed Onboarding (was Identity Verification).
// Decision 48c — Run Analysis CTA inside Reasoning Layer row.
// Decision 48d — field-to-upstream mapping: identity/account/relationship →
//   onboarding; risk indicators → aml-screening.
// Decision 42 (preserved) — box non-interactivity discipline maintained.
// PRIMARY_PROMPT.md §6.4 — v1/Production annotation centered under the stack.

'use client';

import { PipelineStageRow } from './PipelineStageRow';
import { UpstreamDataSubgroup, type SubgroupFieldRow } from './UpstreamDataSubgroup';
import { RunAnalysisButton } from './RunAnalysisButton';
import type { GroupedSubgroup, UpstreamBoxId } from '@/lib/orchestration/fieldGrouping';

interface DataFlowMapProps {
  /** Persona-mode read-only rendering. Mutually exclusive with liveModeSlots. */
  subgroups?: GroupedSubgroup[];
  /** Live-mode edit slots (one ReactNode per subgroup). */
  liveModeSlots?: Record<'customer-identity' | 'account-behavior' | 'risk-indicators' | 'relationship', React.ReactNode>;
  onRunAnalysis: () => void;
  canRun: boolean;
  running?: boolean;
}

const ANNOTATION_V1 = 'v1 demo: single-model with independent re-derivation.';
const ANNOTATION_PROD = 'Production: multi-model audit on Bedrock with redacted input.';

function filterSubgroupsByUpstream(subgroups: GroupedSubgroup[], upstream: UpstreamBoxId) {
  return subgroups.filter((g) => g.upstream === upstream);
}

export function DataFlowMap({
  subgroups,
  liveModeSlots,
  onRunAnalysis,
  canRun,
  running = false,
}: DataFlowMapProps) {
  const onboardingSubgroups = subgroups ? filterSubgroupsByUpstream(subgroups, 'onboarding') : [];
  const amlSubgroups = subgroups ? filterSubgroupsByUpstream(subgroups, 'aml-screening') : [];

  return (
    <div className="flex flex-col gap-4">
      {/* Onboarding row */}
      <PipelineStageRow stageLabel="Onboarding" notLast>
        <div data-testid="stage-onboarding-panel" className="flex flex-row flex-wrap gap-4">
          {liveModeSlots ? (
            <>
              <UpstreamDataSubgroup title="Customer identity" editSlot={liveModeSlots['customer-identity']} />
              <UpstreamDataSubgroup title="Account & behavior" editSlot={liveModeSlots['account-behavior']} />
              <UpstreamDataSubgroup title="Relationship" editSlot={liveModeSlots['relationship']} />
            </>
          ) : (
            onboardingSubgroups.map((g) => (
              <UpstreamDataSubgroup key={g.title} title={g.title} fields={g.fields} />
            ))
          )}
        </div>
      </PipelineStageRow>

      {/* AML Screening row */}
      <PipelineStageRow stageLabel="AML Screening" notLast>
        <div data-testid="stage-aml-screening-panel" className="flex flex-row flex-wrap gap-4">
          {liveModeSlots ? (
            <UpstreamDataSubgroup title="Risk indicators" editSlot={liveModeSlots['risk-indicators']} />
          ) : (
            amlSubgroups.map((g) => (
              <UpstreamDataSubgroup key={g.title} title={g.title} fields={g.fields} />
            ))
          )}
        </div>
      </PipelineStageRow>

      {/* Reasoning Layer row — Run Analysis CTA lives here */}
      <PipelineStageRow stageLabel="Reasoning Layer" active notLast>
        <div data-testid="stage-reasoning-layer-panel" className="flex flex-col gap-3">
          <p className="font-sans text-sm text-text-secondary">
            Three-pass audit will run here.
          </p>
          <p className="font-sans text-xs text-text-tertiary">
            Pass 1 → Pass 2 → Pass 3 (conditional)
          </p>
          <RunAnalysisButton onRun={onRunAnalysis} disabled={!canRun} running={running} />
        </div>
      </PipelineStageRow>

      {/* Case Management row */}
      <PipelineStageRow stageLabel="Case Management" notLast>
        <div data-testid="stage-case-management-panel" className="flex flex-col gap-2">
          <p className="font-sans text-sm text-text-secondary">
            Analyst decision persists here in production.
          </p>
          <p className="font-sans text-xs text-text-tertiary">
            (Approve / Escalate / Override outcome record)
          </p>
        </div>
      </PipelineStageRow>

      {/* Core Banking row — terminal, no connector */}
      <PipelineStageRow stageLabel="Core Banking">
        <div data-testid="stage-core-banking-panel">
          <p className="font-sans text-sm text-text-tertiary">
            Downstream of decision scope.
          </p>
        </div>
      </PipelineStageRow>

      {/* v1/Production annotation */}
      <div className="mt-4 flex flex-col items-center gap-1 font-sans text-sm">
        <div>
          <span className="text-text-tertiary">v1 demo:</span>{' '}
          <span className="text-text-secondary">{ANNOTATION_V1.replace('v1 demo: ', '')}</span>
        </div>
        <div>
          <span className="text-text-tertiary">Production:</span>{' '}
          <span className="text-text-secondary">{ANNOTATION_PROD.replace('Production: ', '')}</span>
        </div>
      </div>
    </div>
  );
}
```

- [ ] **Step 4: Run tests; verify pass**

```bash
pnpm vitest run components/decisioning/DataFlowMap.test.tsx
```

Expected: PASS, 9 tests.

- [ ] **Step 5: Commit**

```bash
git add components/decisioning/DataFlowMap.tsx components/decisioning/DataFlowMap.test.tsx
git commit -m "feat(decisioning): land Batch 12.5.2 — DataFlowMap

Screen 2 composition. Vertical 5-row pipeline: Onboarding → AML Screening
→ Reasoning Layer (slate accent) → Case Management → Core Banking. Each
row has left stage-box + right panel. Subgroup placement per Decision 48d.
Run Analysis CTA inside Reasoning Layer row per Decision 48c. v1/Production
annotation centered below per visual_system §5.4 / Decision 42 (preserved
annotation scope is the whole pipeline). Persona-mode reads from subgroups
prop; live-mode reads from liveModeSlots prop."
```

### Task 12.5.3 — Build DataFlowScreen wrapper

**Files:**
- Create: `components/screens/DataFlowScreen.tsx`
- Create: `components/screens/DataFlowScreen.test.tsx`

DataFlowScreen wires DataFlowMap to wizard + decisioning context. Persona mode: render subgroups from `loadPersona(personaId).profile` via `groupProfileForDataFlow`. Live mode: render the 4 field-section components as edit slots wrapped in a single RHF FormProvider; on submit (Run Analysis click), parse profile via `CustomerProfileSchema`, store in decisioning context, fire wizard advance + machine startLiveRun.

- [ ] **Step 1: Write the failing test**

(Skeleton — exhaustive test code follows the patterns established in 12.2.2 and 12.5.2; key assertions listed below.)

Key assertions:
1. Persona mode: subgroups rendered correctly for each of the 4 personas
2. Live mode: 4 field sections rendered as edit slots
3. Persona mode: Run Analysis click fires wizard.advance + (no machine start — playback resolves instantly per Decision 46a)
4. Live mode: Run Analysis click validates form, on success fires liveMachine.startLiveRun + wizard.advance; on validation failure, button stays disabled and form errors render

- [ ] **Step 2: Implement DataFlowScreen**

```tsx
// components/screens/DataFlowScreen.tsx
'use client';

import { useForm, FormProvider } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { DataFlowMap } from '@/components/decisioning/DataFlowMap';
import { CustomerIdentityFields } from '@/components/forms/CustomerIdentityFields';
import { AccountBehaviorFields } from '@/components/forms/AccountBehaviorFields';
import { RiskIndicatorFields } from '@/components/forms/RiskIndicatorFields';
import { RelationshipFields } from '@/components/forms/RelationshipFields';
import { CustomerProfileSchema } from '@/lib/schemas/customerProfile';
import { loadPersona } from '@/lib/schemas/personaAdapters';
import { groupProfileForDataFlow } from '@/lib/orchestration/fieldGrouping';
import { useWizard } from '@/components/wizard/WizardContext';
import { useDecisioning } from '@/components/orchestration/DecisioningContext';

export function DataFlowScreen() {
  const wizard = useWizard();
  const decisioning = useDecisioning();

  if (wizard.mode === 'persona' && decisioning.personaId) {
    const persona = loadPersona(decisioning.personaId);
    const subgroups = groupProfileForDataFlow(persona.profile);
    return (
      <DataFlowMap
        subgroups={subgroups}
        canRun
        onRunAnalysis={() => {
          // Persona mode — startPersonaPlayback fires via context; advance wizard
          (decisioning as any).startPersonaPlayback?.(decisioning.personaId);
          wizard.advance();
        }}
      />
    );
  }

  // Live mode — form-driven
  const methods = useForm({ resolver: zodResolver(CustomerProfileSchema), mode: 'onBlur' });
  const onSubmit = methods.handleSubmit((profile) => {
    decisioning.setLiveProfile(profile);
    (decisioning as any).startLiveRun?.(profile);
    wizard.advance();
  });

  return (
    <FormProvider {...methods}>
      <DataFlowMap
        liveModeSlots={{
          'customer-identity': <CustomerIdentityFields />,
          'account-behavior': <AccountBehaviorFields />,
          'risk-indicators': <RiskIndicatorFields />,
          'relationship': <RelationshipFields />,
        }}
        canRun={methods.formState.isValid}
        onRunAnalysis={onSubmit}
      />
    </FormProvider>
  );
}
```

- [ ] **Step 3: Run tests; verify pass + commit**

```bash
pnpm vitest run components/screens/DataFlowScreen.test.tsx
git add components/screens/DataFlowScreen.tsx components/screens/DataFlowScreen.test.tsx
git commit -m "feat(screens): land Batch 12.5.3 — DataFlowScreen

Screen 2 wraps DataFlowMap with per-mode wiring. Persona: read profile from
loadPersona, render subgroups. Live: 4 field sections rendered as edit
slots inside a single RHF FormProvider. Run Analysis triggers playback
(persona) or startLiveRun (live) + wizard advance."
```

---

## Batch 12.6 — Screen 3 (Audit)

**Scope:** Build `AuditScreen` composing existing RecommendationCard + AuditPanelTicker + Pass3CorrectionBanner + cap-reached layout. The screen-level Next button advances to Examiner Notes when the audit reaches a terminal state (passed_first_audit / corrected_and_verified / correction_failed_surfaced).

**Execution mode:** inline-with-checkpoints (state-machine surface; preserved Decision 36/41/47d disciplines).

Key tasks: build AuditScreen.tsx + tests. The state-driven rendering logic lives almost entirely in the existing DecisioningOrchestrator's switch statement on `stateValue`; that logic moves into AuditScreen here, consuming `useDecisioning()` for the machine state.

Per-state rendering matrix (lifted from current DecisioningOrchestrator):

| State | Rendering |
|---|---|
| `idle` / `pass_1` | Pass-naming headline only |
| `pass_2` / `re_audit` | Headline + AuditPanelTicker(shouldAnimate=true) + AnalystControlPanel(pass1Override=pass1Output) |
| `pass_3` | Headline + "Correcting…" indicator + AnalystControlPanel(pass1Override=pass1Output) |
| `passed_first_audit` | RecommendationCard + AuditPanelTicker(shouldAnimate=false) + ANALYST PANEL MOVES TO SCREEN 5 (here on S3 we just show recommendation + audit) — show Next button enabled |
| `corrected_and_verified` | RecommendationCard(corrected) + AuditPanelTicker(re-audit) — show Next button enabled |
| `correction_failed_surfaced` | Cap-reached 4-section layout (Original recommendation / Original audit / Correction attempted / Re-audit findings) — show Next button enabled |
| `failed` | Headline + error message in violation-primary; NO Next button (terminal failure; user must Back or Reset) |

**Critical**: At terminal states on Screen 3, the AnalystControlPanel moves OFF Screen 3 (it lived here mid-flight to satisfy Decision 47d sub-case (a) race wiring — that role no longer applies on a multi-screen wizard where the analyst panel has its own dedicated Screen 5). Mid-flight race wiring (sub-cases a + b) is folded into the screen-transition handler — see Task 12.6.2.

Per-task structure follows the established TDD pattern; commit messages follow project convention.

### Task 12.6.1 — Build AuditScreen state-driven render

Detailed TDD steps follow 12.5.2/12.5.3 pattern. The state matrix above drives the test cases.

### Task 12.6.2 — Mid-flight race wiring in wizard layer

When the user clicks Next from Screen 3 mid-flight, the wizard must NOT advance — Next is gated on terminal state. The analyst-action race semantics from Decision 47d sub-case (a) (analyst action taken before terminal) collapse to a non-issue on Screen 3 because the analyst panel doesn't render here at terminal states. Sub-case (b) (override modal open at pass_2 → pass_3 transition) is handled on Screen 5 in the established AnalystControlPanel surface.

Commit messages and full code follow established patterns.

---

## Batch 12.7 — DecisioningProvider (state context)

**Scope:** Reshape `DecisioningOrchestrator` from a render-component into a provider-component that holds the existing hook surface (usePersonaPlayback + useLiveDecisioning) and exposes it via `DecisioningContext`. The screens consume `useDecisioning()` instead of receiving callbacks.

**Execution mode:** inline-with-checkpoints (state-contract refactor; tests must verify behavior preservation across the 5 personas + live mode).

This batch lifts the bulk of the existing `DecisioningOrchestrator.tsx` logic (mode-switch reset, persona machine null-passthrough, race-signal OR, displayPass1 selection, customerReference memoization, effectivePass1 derivation, renderAnalystPanel / renderExaminerNotes helpers) into a `DecisioningProvider` component, exposed via context. The render-side responsibilities (decisioning-surface state switch) move to AuditScreen / ExaminerNotesScreen / AnalystActionScreen.

The provider's render is just `<DecisioningContext.Provider value={...}>{children}</DecisioningContext.Provider>`.

Test surface: the context's surfaced state matches the prior DecisioningOrchestrator's internal state across all decisioning machine transitions.

---

## Batch 12.8 — Screens 4 & 5 (Examiner Notes + Analyst Action)

### Task 12.8.1 — ExaminerNotesScreen

**Files:** `components/screens/ExaminerNotesScreen.tsx` + test

Thin wrapper around existing `ExaminerNotes` with mode-driven content selection (lifted from DecisioningOrchestrator's `displayPass1` + `customerReference` logic via `useDecisioning()`). Screen-level Next button advances to S5.

### Task 12.8.2 — AnalystActionScreen

**Files:** `components/screens/AnalystActionScreen.tsx` + test

Wraps existing `AnalystControlPanel` (mode-aware: live-mode callbacks attached, persona-mode not). Adds a "Reset case" affordance below the panel that fires `wizard.reset()` returning user to Screen 1. Persona switching mid-action (Decision 36e) is handled by the wizard's reset semantics — switching personas requires returning to S1, which already resets state.

---

## Batch 12.9 — Page-level rewrite

**Scope:** Update `app/page.tsx` to mount `WizardShell` with the five concrete screens; wrap in `DecisioningProvider`. Update `app/page.test.tsx` to assert the new structure.

**Execution mode:** inline-with-checkpoints (architectural surface; smallest possible diff for the largest visible change).

### Task 12.9.1 — Rewrite app/page.tsx

```tsx
// app/page.tsx
// Batch 12.9 — wizard restructure. Page hosts WizardShell wrapped in
// DecisioningProvider. The prior single-scroll layout (PersonaSelector →
// decisioning-surface → CustomInputForm → ArchitectureStrip) is replaced
// with a 5-screen wizard per Decision 48.
//
// ArchitectureStrip is no longer rendered at page level — its 5-box flow
// content is folded into DataFlowMap on Screen 2 per Decision 48a.

import { WizardShell, type ScreenMap } from '@/components/wizard/WizardShell';
import { DecisioningProvider } from '@/components/orchestration/DecisioningProvider';
import { PersonaSelectScreen } from '@/components/screens/PersonaSelectScreen';
import { DataFlowScreen } from '@/components/screens/DataFlowScreen';
import { AuditScreen } from '@/components/screens/AuditScreen';
import { ExaminerNotesScreen } from '@/components/screens/ExaminerNotesScreen';
import { AnalystActionScreen } from '@/components/screens/AnalystActionScreen';

const SCREENS: ScreenMap = {
  'persona-select': PersonaSelectScreen,
  'data-flow': DataFlowScreen,
  'audit': AuditScreen,
  'examiner-notes': ExaminerNotesScreen,
  'analyst-action': AnalystActionScreen,
};

export default function HomePage() {
  return (
    <main
      data-testid="home-main"
      className="mx-auto flex max-w-[1180px] flex-col gap-8 px-6 py-12 xl:px-0"
    >
      <DecisioningProvider>
        <WizardShell screens={SCREENS} />
      </DecisioningProvider>
    </main>
  );
}
```

### Task 12.9.2 — Update app/page.test.tsx

Pivot the structural assertions: main-children-order test asserts WizardShell mount within DecisioningProvider, not the persona-section/decisioning-surface/custom-input-section/architecture-section sequence.

---

## Batch 12.10 — E2E test updates

**Scope:** Update the five existing Playwright blocks (`tests/e2e/*.spec.ts`) for the wizard structure. Each block's high-level assertion shifts from "page contains X surface" to "wizard at screen N contains X surface."

**Execution mode:** subagent-driven (mechanical test updates following established patterns).

### Per-block update sketch

- **Block 1 (composition smoke):** Assert WizardShell mounts; assert StepIndicator visible; assert Screen 1 panel headline.
- **Block 2 (persona playback, all 4):** For each persona: click persona card → assert advance to Screen 2 → assert Onboarding row contains Customer Identity values → click Run Analysis → assert advance to Screen 3 → assert audit completes PASS clean → click Next → assert Screen 4 Examiner Notes → click Next → assert Screen 5 Analyst Action → click Approve → assert confirmation block.
- **Block 3 (cap-reached):** Live mode, mocked route returns Pass 2 with material findings on both audit + re-audit → advance to Screen 3 → assert cap-reached 4-section layout renders inline on S3 → click Next → assert Screen 4 → click Next → assert Screen 5.
- **Block 4 (custom-input happy path):** Click "Use your own profile" tile → assert advance to Screen 2 live form → fill all 13 fields → click Run Analysis → assert advance to S3 → assert audit completes → walk to S5 → click Approve.
- **Block 5 (Pass 3 + re-audit):** Live mode, mocked route returns material Pass 2 then clean re-audit → assert Pass 3 + re-audit render inline on Screen 3 (no separate screen) → walk to S5.

Each test file gets a full rewrite following its block's intent. Commit per block.

---

## Self-review

Per the writing-plans skill self-review checklist:

**1. Spec coverage.** Each of the 5 screens has a screen component + screen test + composition test. Decisions 27, 36, 37, 41, 42, 47 are referenced inline at the touch points. Live-mode Pass 3 path covered in 12.6 + 12.10 Block 5. Cap-reached path covered in 12.6 + 12.10 Block 3. Failure path covered in 12.6 state matrix. Decisions 48 / 48a / 48b / 48c / 48d are net-new ratification flags surfaced for JP's commit on the durable-state side.

**2. Placeholder scan.** Inline implementations show full code for the structurally-load-bearing pieces (screenSequence, useWizardState, WizardShell, PipelineStageRow, UpstreamDataSubgroup, RunAnalysisButton, fieldGrouping, DataFlowMap, DataFlowScreen, app/page.tsx). The field-section extractions (12.4.1–12.4.4) document the pattern in full for the first section and note "same pattern for the other three" with section-specific field names — this is acceptable because the extraction is a verbatim lift from existing CustomInputForm source. The Batch 12.6 + 12.7 + 12.8 tasks reference "the established TDD pattern" rather than reproducing 100 lines per task — the executor reads the existing source for the lifted logic (DecisioningOrchestrator's switch statement, displayPass1 derivation, renderAnalystPanel / renderExaminerNotes helpers).

**3. Type consistency.** `ScreenId`, `WizardMode`, `DecisioningMode`, `ScreenMap`, `GroupedSubgroup`, `UpstreamBoxId`, `SubgroupFieldRow`, `WizardState` — all defined once and referenced consistently. `useWizard` returns `WizardState`; `useDecisioning` returns `DecisioningContextValue`.

**4. Plan-discipline failure-mode check (project-specific, per memory):**
- **D1 (circular imports):** WizardShell test uses inline placeholder screens; field-section tests don't import from CustomInputForm; PersonaSelectScreen test uses inline placeholder context values until 12.7 lands the real provider. ✓
- **D2 (deterministic recipes for non-deterministic flows):** Pass 3 path in Block 5 uses existing mocked-route fixtures; no "submit profile X to trigger Pass 3" recipe. ✓
- **D3 (search-before-asserting):** 12.1.1 promotes the Next.js verification step to a standalone task with explicit search instruction, not buried in a callout. ✓
- **D4 (execution-mode):** Hybrid execution explicitly stated; per-batch mode notes call out subagent vs. inline rationale. ✓

---

## Things-to-Flag (for JP's parallel thread)

1. **Decision 48 + 48a/b/c/d** — ratification flags ready for `03_DESIGN_DECISIONS.md` commit per the durable-state file ownership boundary.
2. **`ArchitectureStrip` becomes orphaned** after Batch 12.9 lands. Component file stays in tree; follow-up cleanup decision deferred. The page-level `ArchitectureStrip` placement spec in visual_system.md §4 ("Architecture strip placement: near the footer but not in it") is contradicted by this restructure — flagged for ratification in 48a.
3. **`DecisioningOrchestrator.tsx`** undergoes major reshape in 12.7 (from render-component to provider-component). The existing 670+ lines of test surface needs review for which tests pivot to behavior assertions vs. which get retired. Surface a list of retired tests in the 12.7 batch synthesis doc for JP review.
4. **Open question — wizard state persistence on Back from Screen 3:** when the user clicks Back from Screen 3 (audit results) to Screen 2 (data flow), should the audit results persist (so re-advancing to S3 shows the cached results) or reset (re-running clears the audit)? Current plan assumes **persist** for persona mode (audit results are deterministic from persona JSON; re-rendering is free) and **reset** for live mode (re-running would burn another API call against the rate limit). Calling this out for JP to confirm before 12.6 lands; default is fine to proceed unless he flags otherwise.
5. **Open question — focus management on screen advance:** WCAG-aligned wizards typically move focus to the new screen's heading on advance. Current plan does not implement this; it can land in a follow-up polish batch (12.11) or as part of 12.1.5. Flagging for JP to call: ship-with vs. polish-batch.

---

## Execution Handoff

Plan complete and saved to `docs/batch-12-wizard-restructure.md`. Two execution options:

1. **Hybrid (RECOMMENDED for this batch)** — subagent-driven for mechanical batches (12.1 foundation, 12.4 field extractions, 12.10 E2E updates), inline-with-checkpoints for discipline-heavy batches (12.2 PersonaSelector, 12.3 primitives, 12.5 DataFlowMap, 12.6 AuditScreen, 12.7 DecisioningProvider, 12.8 screens 4 + 5, 12.9 page rewrite). The "subagent-driven (recommended)" harness default is questioned here because subagent context isolation tends toward mainstream tutorial idioms that contradict the project's institutional register — captured in the memory `feedback_code_plan_review_failure_modes.md` item D4.

2. **Full inline execution** — all 10 batches in this session via `superpowers:executing-plans`, batch-by-batch with review checkpoints between batches.

Which approach?
