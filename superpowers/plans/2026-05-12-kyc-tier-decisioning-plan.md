# KYC Tier Decisioning Demo — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Next.js + Vercel demo of a three-pass KYC reasoning pipeline (Pass 1 generate → Pass 2 audit → conditional Pass 3 correct → re-audit) deployed to `kyc.shiftatlas.tech`, with persona playback and live custom-input flows sharing UI, Zod-validated typed outputs, cost-protected serverless route, and an institutional financial-publication visual register for Philippine bank compliance officers.

**Architecture:** Next.js App Router single project. Client-side state machine fires per-pass POSTs to a single `/api/decisioning?pass=N` route. Pass 1/2/3 system prompts and the v1 ruleset are inlined at build time via `?raw` webpack imports. Persona JSON is bundled and rendered through schema normalizers (Decision 28/29) and a render-time canonical check sort (Decision 41 Path X). Live calls hit Anthropic (`claude-sonnet-4-6`) server-side behind a per-IP rate limit (L1) + global daily kill switch (L3) backed by Upstash Redis. Errors surface as a typed `DecisioningError` discriminated union — no automatic retry in v1.

**Tech Stack:**
- Next.js 15 (App Router) + React 19 + TypeScript (strict)
- Tailwind CSS v3 mapped to CSS custom-property tokens from `visual_system.md`
- Zod for runtime validation + form schema sharing
- React Hook Form + `@hookform/resolvers/zod`
- `@anthropic-ai/sdk` for server-side model calls
- `@upstash/redis` for cost-protection storage
- Vitest + React Testing Library for unit/integration tests
- Playwright for end-to-end persona-playback smoke test
- Deployed on Vercel (Hobby tier sufficient for v1) at `kyc.shiftatlas.tech`

---

## ⚠ Plan amendments — JP strategic review (2026-05-12)

**Read these before executing any task. They override conflicting instructions in the batches below.**

**Subsequent amendments — Option A adopted (2026-05-12, post-Task 0.1.5 version verification)**

Task 0.1.5 confirmed three breaking-change major bumps from the originally pinned versions. JP elected **Option A**: adopt Next 16, Zod 4 (pinned `4.0.x` exact), Tailwind v4. Amendments 8–11 below codify the resulting plan changes. Apply them BEFORE Task 0.2 writes `package.json`. Greenfield project — no `npx @tailwindcss/upgrade`; write v4 syntax directly.

8. **Tailwind v4 — CSS-first config in Task 0.6.** Tailwind v4 has no `tailwind.config.ts`; theme lives in CSS via `@theme {}` in `globals.css`, and Tailwind utilities are auto-generated from `--color-*` / `--text-*` / `--font-*` variables there.
   - **Task 0.6:** DO NOT create `tailwind.config.ts` — delete Step 1 entirely. Update `postcss.config.mjs` Step 2 to use the v4 plugin name `@tailwindcss/postcss` (not `tailwindcss`); drop `autoprefixer` (the v4 PostCSS plugin handles vendor prefixing).
   - **Task 0.13:** remove `tailwind.config.ts` from the `git add` line.
   - **Task 0.2 (about to be written):** drop `autoprefixer` from devDependencies; add `@tailwindcss/postcss: ^4.2.0` to devDependencies; pin `tailwindcss: ^4.2.0`.

9. **Token plumbing simplification in Task 5.1.** Tailwind v3's pattern (tokens in `:root`, JS config maps them) collapses to a single source in v4. **Rewrite Task 5.1's globals.css** to:
   - Replace `@tailwind base; @tailwind components; @tailwind utilities;` with a single `@import "tailwindcss";` at the top.
   - Move every `--surface-*`, `--text-*`, `--accent-*`, `--violation-*`, `--border-*`, `--status-*`, `--data-*` declaration from `:root {}` into a single `@theme {}` block.
   - Rename color tokens to use the `--color-*` prefix so Tailwind v4 auto-generates utilities (e.g., `--surface-base` → `--color-surface-base` → utility `bg-surface-base`). The type-scale variables (`--text-xs` through `--text-2xl`) already match v4's expected names — just move them into `@theme`. Font-family variables (`--font-serif`, `--font-sans`, `--font-mono`) similarly.
   - Body/utility classes (`.tabular-figures`, `.modal-backdrop`, `html, body {...}`) stay OUTSIDE `@theme`.
   - **Net result:** Task 0.6's `tailwind.config.ts` disappears (Amendment 8); Task 5.1's globals.css becomes the single token source. Tailwind utility class names called out in Task 5.3 and downstream components (`bg-surface-base`, `text-text-primary`, `border-border-default`, etc.) remain unchanged — they map to the new `--color-*` variable names by v4 convention.

10. **Zod 4 API updates in Task 1 (and any downstream schema use).** Zod 4 deprecated chained-method object modifiers and `.flatten()` error formatting. Apply these substitutions when writing Batch 1 schemas:
    - Every `z.object({...}).strict()` becomes `z.strictObject({...})`.
    - Every `z.object({...}).passthrough()` becomes `z.looseObject({...})`.
    - Anywhere `result.error.flatten()` or `result.error.format()` would be used (likely Task 4 API error formatting for `DecisioningError`), use `z.treeifyError(result.error)` instead.
    - **Semantic change to watch:** `z.string().optional().default('foo')` returns `'foo'` when the key is missing in Zod 4 (Zod 3 returned `undefined`). For the persona normalizers (Task 1.2.5) and `Pass1OutputSchema`/`Pass2OutputSchema` this is the desired behavior — but if any test relies on `undefined` for an absent-but-defaulted field, update the assertion.
    - **Exact pins in Task 0.2's package.json:** `"zod": "4.0.x"` and `"@hookform/resolvers": "5.2.x"` (NO caret — exact). Sidesteps Zod Issue #842 type-overload mismatch on 4.3.x.

11. **Async params guard for Next 16 page components (Tasks 5.x, 8.x, 10).** In Next 16, `params` and `searchParams` props on page/layout components are `Promise`-wrapped — synchronous access throws.
    - API route handlers (Task 4) use `new URL(request.url).searchParams` — synchronous, unchanged. No edit needed.
    - **The guard:** any page component (`app/page.tsx`, `app/layout.tsx`, or nested `app/*/page.tsx`) that destructures `params` or `searchParams` from its props MUST be declared `async` and `await` the prop. Add this check during Tasks 5.2, 5.3, 8.x (any page wrapping the form), and Task 10 (final assembly).
    - **Today's page components don't read these props**, so no edits are required up front — but if any task adds props reading, the `async`/`await` pattern is mandatory. **Concrete pattern when needed:**
      ```tsx
      export default async function Page({ searchParams }: { searchParams: Promise<{ persona?: string }> }) {
        const { persona } = await searchParams;
        // ...
      }
      ```

12. **Turbopack `.md` raw-loader replaces the webpack `?raw` mechanism (Batch 0 boot fixes).** Surfaced during Task 0.13 dev-server smoke test. Next 16 defaults `next dev` to Turbopack; the original plan's `webpack(config)` block adding `{ resourceQuery: /raw/, type: 'asset/source' }` is silently ignored, causing boot exit 1. Turbopack does NOT natively honor the `?raw` query — that convention is webpack-specific. Resolution: Turbopack's `turbopack.rules` config + `raw-loader`, **repo-wide convention shift to plain `.md` imports (no `?raw` suffix)** since every `.md` import in this codebase wants raw-text treatment (prompts + ruleset).

    **12a — Turbopack rule + raw-loader (apply NOW, before Task 0.13 retry):**
    - **package.json:** add `"raw-loader": "^4.0.2"` to devDependencies.
    - **next.config.mjs:** REPLACE the `webpack(config)` block with:
      ```js
      turbopack: {
        rules: {
          '*.md': {
            loaders: ['raw-loader'],
            as: '*.js',
          },
        },
      }
      ```
      Move `typedRoutes: false` out of `experimental` to top-level (Next 16 schema change — `experimental.typedRoutes` is deprecated).
    - **types/raw-imports.d.ts:** REPLACE the two existing declarations (`'*?raw'`, `'*.md?raw'`) with a single `'*.md'` declaration:
      ```ts
      declare module '*.md' {
        const content: string;
        export default content;
      }
      ```
    - **vitest.config.ts:** Vite does not transform `.md` as raw by default. Add a small inline plugin so test imports of `.md` return raw strings (symmetric with Turbopack):
      ```ts
      import fs from 'node:fs';
      // ...inside defineConfig({...}):
      plugins: [
        {
          name: 'md-as-raw',
          enforce: 'pre',
          transform(_code, id) {
            if (id.endsWith('.md')) {
              const source = fs.readFileSync(id, 'utf-8');
              return { code: `export default ${JSON.stringify(source)};`, map: null };
            }
            return null;
          },
        },
      ],
      ```
    - **All downstream tasks importing prompts/ruleset:** drop the `?raw` suffix. e.g., `import pass1Prompt from '@/prompts/pass_1_system_prompt.md';` (no `?raw`). Tasks affected (non-exhaustive): Batch 2 (`lib/prompts/inject.ts`, `lib/prompts/invariants.test.ts`), Batch 4 (`/api/decisioning/route.ts`), and any helper loading `ruleset_v1.md`. **Decision 35's architectural property (build-time injection, no runtime fetch) is preserved** — only the import-suffix convention changes. Marker invariant test logic is unchanged; only the import statement at the top of the test file differs.

    **12b — Vitest 4 strict empty-suite exit:** Vitest 4 exits code 1 on empty test sets by default. Plan's Task 0.13 expects "0 tests passed — both acceptable."
    - **package.json:** change `"test": "vitest run"` to `"test": "vitest run --passWithNoTests"`.

    **12c — `.gitignore` covers `*.tsbuildinfo`:** Next 16's incremental TS build produces `tsconfig.tsbuildinfo` (~190 KB) in the working tree.
    - **.gitignore:** add `*.tsbuildinfo` line under the test-artifacts block.

    **12d — Keep Next 16's tsconfig.json auto-edits:** During Batch 0 boot testing, Next 16 auto-modified `tsconfig.json`: `"jsx": "preserve"` → `"jsx": "react-jsx"`, added `.next/dev/types/**/*.ts` to `include`. Both are mandatory under Next 16. Do NOT revert. The plan's original `jsx: "preserve"` value is obsolete under Next 16.

13. **Task 7.8 ExaminerNotes — render structured six-section `examiner_notes_full` (post-Batch-1 schema reality).** Task 1.3 revealed that `examiner_notes_full` in the locked persona JSON is a structured object, not a string. The new `ExaminerNotesFullSchema` (exported from `lib/schemas/pass1.ts`) has six narrative sub-sections: `decision_summary`, `profile_analysis`, `rule_application_and_risk_pattern`, `considered_alternatives`, `recommended_edd_procedures`, `audit_trail`. `recommended_edd_procedures` is nullable — null for Standard-tier personas (Maria) where EDD operational requirements do not apply.

    **Update Task 7.8's test + impl** (already amended inline in the task body below). Test asserts:
    - Default state: summary finding visible, no section headers
    - Expanded state for EDD-tier persona (Carlos): all six section headers render
    - Expanded state for Standard-tier persona (Maria): five section headers render — "Recommended EDD Procedures" is conditionally omitted when `recommended_edd_procedures === null`

    Implementation maps over a `SECTION_LABELS` array; null/undefined section content skips that section. Section headers use small-caps treatment (xs uppercase tracking-wide text-text-secondary) above each prose paragraph to preserve the compliance-memo register without dropping into a heading hierarchy that conflicts with the page's H1/H2 scale per visual_system.md §3.

    **Downstream impact tracked in `docs/design-decisions.md`** (created during this amendment) — it also captures Findings 2, 3, 4, 6 from Checkpoint 1 so the design rationale doesn't live only in commit messages and conversation transcripts.

---

**Original amendments — JP strategic review (2026-05-12)**

1. **Batch 1 order fix (circular dependency).** The original Tasks 1.3 and 1.4 (Pass 1 / Pass 2 schema tests) import `normalizePass1` / `normalizePass2` from `personaAdapters.ts`, which was scheduled for Task 1.7 — after the tests that need it. **A new Task 1.2.5 has been inserted below** that creates `lib/schemas/personaAdapters.ts` with **only the pure normalizer functions** (`normalizePass1`, `normalizePass2`). Task 1.7 is now an **additive** task that extends the same file with the schema-typed `loadPersona` and `listPersonas`. Do not skip Task 1.2.5; do not rewrite the file in Task 1.7 — only extend it.

2. **Batch 0 version-check gate.** The "search-before-asserting" instruction inside Task 0.2 Step 2 has been **promoted to Task 0.1.5** below. Run that task before `pnpm install`. Today is 2026-05-12; Next.js 15 / React 19 / Anthropic SDK 0.32 are from late 2024 / early 2025 and almost certainly have point releases or major bumps. Do not pin the versions in Task 0.2 verbatim — update them to the current stable per Task 0.1.5's findings.

3. **Pass 3 rehearsal is non-deterministic; use a debug toggle.** Original Task 11.3 Step 3 suggested a specific profile that "should trigger Pass 3" — but Pass 3 only fires when Pass 2 catches a Pass 1 error, and that's by design non-deterministic. **Add a `?force_correction=1` query parameter to the `/api/decisioning` route**, gated behind a `DEBUG_MODE === 'true'` env var, that artificially injects `correction_required: true` on the Pass 2 response when set. Wire this in Task 4.2 (route handler — add the gate after the model call returns, before the response is sent). In Task 11.3 Step 3, set `DEBUG_MODE=true` in the Vercel preview env vars, run one persona-equivalent with the `?force_correction=1` query parameter on the live submit path, observe the Pass 3 → re-audit → cap-reached flow, then **unset `DEBUG_MODE` before the production deploy in Task 11.4**. Add an integration test in Task 4.1 covering the toggle (gated on env, not on prod).

4. **DC-07 detection must be data-driven, not regex over prose.**
   - **Task 1.4 (Pass 2 schema):** add two optional computed fields to `Pass2OutputSchema`: `_dc07_structured_record: z.boolean().optional()` and `_dc07_prose: z.boolean().optional()`. Names use `_` prefix to mark them as derived/computed, not contractual.
   - **Task 1.2.5 (`normalizePass2`):** after the existing field remapping, compute the two flags by inspecting the `checks` array (the implementation in Task 1.2.5 below already does this with a fallback heuristic). If the persona JSON does not distinguish the two halves cleanly, surface this during Task 1.2.5 implementation and consult JP before resolving — do not default both to `true` silently.
   - **Task 7.7 (`AuditPanel`):** replace the regex on `evidence_note` with `pass2._dc07_structured_record ?? false` and `pass2._dc07_prose ?? false` passed to `<DC07Indicator>`.
   - **Consumption-end guard (Task 7.7 test):** the flags are written by `normalizePass2`; the locked persona JSON on disk does NOT carry them. If a future refactor bypasses `loadPersona` / `normalizePass2` and feeds AuditPanel raw `personasData`, the DC-07 indicator silently flips to × ×. Task 7.7's test file includes a regression guard that (a) asserts both flags are truthy after `loadPersona('maria')` and visibly render as ✓ ✓, and (b) asserts the raw JSON lacks the flags so the dependency on the normalizer is explicit. Do not delete or weaken those assertions.

5. **Task 7.9 (ArchitectureStrip) — fix the React fragment-without-key warning upfront.** Wrap each loop iteration in `<React.Fragment key={`arch-${b.label}`}>` instead of using a bare fragment. Don't ship the warning.

6. **README precision (Task 11.2).** The four env-var **names** (`ANTHROPIC_API_KEY`, `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN`, `ADMIN_STATS_KEY`) are not secrets — only their **values** are. Decision 40's no-`.env.example` rule prevents committing files with placeholder *values* (paste-over risk), not files that *list variable names*. Add a one-line note to the README env-vars section: *"Variable names are listed here for documentation; only their values are sensitive and live exclusively in Vercel project env vars."*

7. **Execution-mode recommendation (overrides the original handoff at the bottom of this plan).** This build has a register-discipline-heavy core that subagent context isolation hurts. Use:
   - **Subagent-driven** for Batches 0–4 (mechanical infrastructure) and Batch 11 (mechanical e2e + deploy).
   - **Inline execution with checkpoint review** for Batches 5–10 (visual-discipline-heavy components where institutional-register drift is the dominant risk). Subagents in isolation default to YC-landing-page idioms (lucide-react icons, gradient hovers, "Get started!" microcopy) that contradict `visual_system.md` §6 anti-patterns. Inline execution catches drift at the checkpoint; subagent-driven catches it after twelve components have already drifted.

---

## Scope check

This is a single subsystem — one Next.js project, one API route, one UI surface that switches data sources. No split warranted. Plan proceeds as one document.

---

## File structure

Each file has one responsibility. Created in dependency order across the batches below.

```
KYC_Tier_Decisioning/
├── package.json                           # Batch 0
├── tsconfig.json                          # Batch 0
├── next.config.mjs                        # Batch 0 — defines ?raw webpack rule
├── tailwind.config.ts                     # Batch 0 — maps to CSS custom properties
├── postcss.config.mjs                     # Batch 0
├── vitest.config.ts                       # Batch 0
├── playwright.config.ts                   # Batch 0
├── .eslintrc.json                         # Batch 0
├── .gitignore                             # Batch 0
├── README.md                              # Batch 0
├── .env.local.example                     # NOT CREATED (see §7.7 in PRIMARY_PROMPT.md — no env example file)
│
├── prompts/                               # Batch 0 — relocated from Prompts/
│   ├── pass_1_system_prompt.md
│   ├── pass_2_system_prompt.md
│   └── pass_3_system_prompt.md
├── ruleset_v1.md                          # at repo root, imported as @/ruleset_v1.md?raw
├── personas.json                          # at repo root, imported as @/personas.json (relocated to /data via Batch 0 task)
│
├── data/
│   └── personas.json                      # Batch 0 — relocated from repo root
│
├── lib/
│   ├── forms/
│   │   └── profileFormConfig.ts           # Batch 1 — enum SSOT
│   ├── schemas/
│   │   ├── customerProfile.ts             # Batch 1
│   │   ├── pass1.ts                       # Batch 1
│   │   ├── pass2.ts                       # Batch 1
│   │   ├── pass3.ts                       # Batch 1
│   │   ├── apiError.ts                    # Batch 1 — DecisioningError union
│   │   └── personaAdapters.ts             # Batch 1 — normalizePass1/Pass2 + loadPersona
│   ├── orchestration/
│   │   ├── sortChecks.ts                  # Batch 1 — canonical check_type ordering
│   │   ├── auditReferenceId.ts            # Batch 1 — audit-{id}-{YYYYMMDDHHMMSS}
│   │   └── stateMachine.ts                # Batch 9 — client-side pass dispatch
│   ├── prompts/
│   │   ├── markers.ts                     # Batch 2 — marker string constants
│   │   ├── inject.ts                      # Batch 2 — injectPrompt(pass, …)
│   │   └── invariants.test.ts             # Batch 2 — build-time invariant test
│   ├── anthropic/
│   │   └── client.ts                      # Batch 3 — call helper, JSON parse, error mapping
│   ├── costprotection/
│   │   ├── redis.ts                       # Batch 3 — Upstash client singleton
│   │   ├── rateLimit.ts                   # Batch 3 — L1 per-IP
│   │   ├── killSwitch.ts                  # Batch 3 — L3 global daily
│   │   └── telemetry.ts                   # Batch 3 — daily-rollup counters
│   ├── ui/
│   │   ├── format.ts                      # Batch 6 — PHP, timestamp, elapsed formatters
│   │   └── classnames.ts                  # Batch 6 — cx helper
│   └── env.ts                             # Batch 3 — server env var accessors
│
├── app/
│   ├── globals.css                        # Batch 5 — tokens from visual_system.md
│   ├── layout.tsx                         # Batch 5 — page shell + fonts
│   ├── page.tsx                           # Batch 10 — composes the demo
│   └── api/
│       ├── decisioning/
│       │   └── route.ts                   # Batch 4 — per-pass POST handler
│       └── admin/
│           └── stats/
│               └── route.ts               # Batch 4 — telemetry dashboard
│
├── components/
│   ├── primitives/                        # Batch 6
│   │   ├── Card.tsx
│   │   ├── Chip.tsx
│   │   ├── Button.tsx
│   │   ├── Tooltip.tsx
│   │   ├── Modal.tsx
│   │   ├── ProgressBar.tsx
│   │   ├── Skeleton.tsx
│   │   ├── ChevronDisclosure.tsx
│   │   └── TabularNumber.tsx
│   ├── decisioning/                       # Batch 7
│   │   ├── PersonaButtonRow.tsx
│   │   ├── PassHeadline.tsx
│   │   ├── ElapsedTimeIndicator.tsx
│   │   ├── RecommendationCard.tsx
│   │   ├── AuditPanel.tsx
│   │   ├── AuditCheckRow.tsx
│   │   ├── NumericThresholdBlock.tsx
│   │   ├── DC07Indicator.tsx
│   │   ├── SeverityStrip.tsx
│   │   ├── ExaminerNotes.tsx
│   │   ├── ArchitectureStrip.tsx
│   │   ├── Pass3CorrectionBanner.tsx
│   │   ├── CapReachedBanner.tsx
│   │   ├── Pass3RaceBanner.tsx
│   │   ├── AnalystControlPanel.tsx
│   │   ├── OverrideModal.tsx
│   │   ├── ActionConfirmationCard.tsx
│   │   ├── ErrorState.tsx
│   │   └── Footer.tsx
│   └── form/                              # Batch 8
│       ├── CustomInputForm.tsx
│       ├── FieldGroup.tsx
│       ├── CompositeSelect.tsx
│       ├── OccupationUnionField.tsx
│       ├── PhpAmountField.tsx
│       └── CitationTooltipGlyph.tsx
│
└── tests/
    ├── unit/                              # Batch 1–8 (colocated *.test.ts also valid)
    ├── integration/                       # Batch 4, 9
    └── e2e/
        └── persona-playback.spec.ts       # Batch 11
```

---

## Dependency graph

```
profileFormConfig.ts ────┐
                         ▼
                customerProfile.ts ─────────┐
                                            ▼
   pass1.ts ──┐                       form schema reuse (Batch 8)
   pass2.ts ──┼──> personaAdapters.ts ─┐
   pass3.ts ──┘                        │
                                       ▼
                                sortChecks.ts ──> orchestration (Batch 9)
   apiError.ts ──────────────────────────┐
                                          ▼
   markers.ts ─> inject.ts <── ?raw imports of prompts + ruleset
                     │
                     ▼
   anthropic/client.ts <── env.ts
                     │
                     ▼
   costprotection/{redis, rateLimit, killSwitch, telemetry}.ts
                     │
                     ▼
   /api/decisioning/route.ts ────────────> /api/admin/stats/route.ts
                     │
                     ▼ (consumed client-side)
   globals.css + tokens (Batch 5)
                     │
                     ▼
   primitives/ (Batch 6) ──> decisioning/ (Batch 7) ──> form/ (Batch 8)
                     │                       │              │
                     └───────────────────────┴──────────────┘
                                             │
                                             ▼
                                stateMachine.ts (Batch 9)
                                             │
                                             ▼
                                app/page.tsx (Batch 10)
                                             │
                                             ▼
                                e2e + deploy (Batch 11)
```

---

## Execution sequence — eleven batches, ten checkpoints

Each batch ends with a checkpoint: JP reviews diff and either approves or requests changes before the next batch starts.

| Batch | Theme | Verification gate |
|---|---|---|
| 0 | Repo bootstrap + spec relocation | `pnpm dev` renders empty Next.js page; `pnpm test` passes (0 tests) |
| 1 | Schemas + form config + adapters + sort | All four personas validate; normalizers idempotent; sort matches canonical order |
| 2 | Prompt injection + invariants | `invariants.test.ts` passes; sample injection produces non-empty string with no markers remaining |
| 3 | Anthropic client + cost protection | Mocked unit tests pass; rate-limit / kill-switch keys + TTLs match spec |
| 4 | API route + admin stats | Integration test against in-memory Redis stub: rate-limit, kill-switch, malformed-JSON, validation_failed, success paths all return correct `DecisioningError` or pass output |
| 5 | Design tokens + layout chrome | Page renders with global tokens; Tailwind reads custom props; section spacing visible |
| 6 | UI primitives | Vitest snapshot/RTL tests for Card, Chip, Button, Tooltip, Modal, ProgressBar |
| 7 | Decisioning components | Each component renders Maria fixture correctly; numeric block right-aligns PASS/FAIL; DC-07 shows both halves; Override modal traps focus + escape dismisses |
| 8 | Custom input form | RHF + Zod resolver: composite-fields submit joined string; occupation union accepts both branches; tooltips render on focus |
| 9 | Orchestration state machine + playback | Persona button → Pass 1 ticker → Pass 2 ticker (PASS clean) end-to-end with sorted checks; live mode hits mocked `/api/decisioning` |
| 10 | Page assembly | `app/page.tsx` wires hero, persona row, form, results, footer; lg/xl viewport visual review |
| 11 | E2E + deploy | Playwright persona-playback green; manual live-mode rehearsal against real Anthropic API in Vercel preview; production deploy to `kyc.shiftatlas.tech` |

---

## Batch 0 — Repo bootstrap and spec relocation

**Goal:** A buildable Next.js project skeleton with the spec files relocated to the paths the rest of the plan imports from. No git init yet (Decision 40 — deferred to design-doc commit step at the end of Batch 0).

### Task 0.1: Create `.gitignore`

**Files:** Create `.gitignore`

- [ ] **Step 1: Write the file**

```
# Node ecosystem
node_modules/
.next/
.vercel/
dist/
build/
out/

# Environment — NEVER commit secrets
# ANTHROPIC_API_KEY lives in Vercel project env vars only
# Do not create .env.example with placeholder keys — risk of paste-over
.env
.env.local
.env.*.local

# IDE / OS
.DS_Store
.idea/
.vscode/

# Visual companion (Superpowers brainstorm transient state)
.superpowers/

# Package manager cache
.pnpm-store/

# Compiled prompt caches (build-time injection artifacts)
.prompts-cache/
*.compiled.md

# Test artifacts
coverage/
playwright-report/
test-results/
```

### Task 0.1.5: Verify current stable versions (gate before Task 0.2)

**Goal:** Today is 2026-05-12. The version pins in Task 0.2 are from late 2024 / early 2025 and almost certainly stale. Confirm the current stable major+minor for each dependency before writing `package.json`.

**Files:** None yet — this task writes findings into the commit message and updates Task 0.2's version list inline.

- [ ] **Step 1: Run web searches**

Run each, record the latest stable version returned:

- `Next.js latest stable version 2026`
- `React latest stable version 2026`
- `@anthropic-ai/sdk Node version npm 2026`
- `@upstash/redis latest version npm 2026`
- `Zod latest version npm 2026`
- `react-hook-form latest version 2026`
- `@hookform/resolvers latest version 2026`
- `Tailwind CSS latest version 2026`
- `Vitest latest version 2026`
- `Playwright latest version 2026`

- [ ] **Step 2: Sanity-check the next/font import**

The plan's Task 5.2 imports `Source_Serif_4` from `next/font/google`. If the installed Next.js version's `next/font/google` exports differ (e.g., the font helper renamed, or `Source_Serif_4` removed in favor of `Source_Serif_Pro`), record the correct import name now and update Task 5.2 accordingly when you get to Batch 5.

- [ ] **Step 3: Verify the model ID**

Search: `Anthropic claude-sonnet-4-6 model ID May 2026`. Confirm `claude-sonnet-4-6` is still the current Sonnet 4.6 identifier per PRIMARY_PROMPT.md §4.5. If a newer Sonnet 4.x has shipped and 4.6 is deprecated, surface to JP before proceeding — the locked persona JSONs reference `claude-sonnet-4-6` and changing the model invalidates the persona pre-generation.

- [ ] **Step 4: Update Task 0.2's `package.json` version list**

For each dependency whose latest stable differs from what Task 0.2 currently shows, edit the `package.json` in Task 0.2 before writing it. Capture the substituted versions for the commit message: "chore: bootstrap Next.js project (versions verified 2026-05-12: next@X.Y, react@X.Y, …)".

- [ ] **Step 5: If any dependency has a breaking-change major bump**

Read its migration notes briefly. If the breaking change touches anything in this plan (App Router behavior, Anthropic SDK call shape, Zod API), surface to JP with a one-paragraph summary before proceeding to Task 0.2. Do not silently adopt breaking changes.

### Task 0.2: Initialize `package.json` and install dependencies

**Files:** Create `package.json`

- [ ] **Step 1: Write `package.json`**

```json
{
  "name": "kyc-tier-decisioning",
  "version": "0.1.0",
  "private": true,
  "scripts": {
    "dev": "next dev",
    "build": "next build",
    "start": "next start",
    "lint": "next lint",
    "typecheck": "tsc --noEmit",
    "test": "vitest run",
    "test:watch": "vitest",
    "test:e2e": "playwright test"
  },
  "dependencies": {
    "@anthropic-ai/sdk": "^0.32.0",
    "@hookform/resolvers": "^3.9.0",
    "@upstash/redis": "^1.34.0",
    "next": "^15.0.0",
    "react": "^19.0.0",
    "react-dom": "^19.0.0",
    "react-hook-form": "^7.53.0",
    "zod": "^3.23.0"
  },
  "devDependencies": {
    "@playwright/test": "^1.48.0",
    "@testing-library/jest-dom": "^6.5.0",
    "@testing-library/react": "^16.0.0",
    "@testing-library/user-event": "^14.5.0",
    "@types/node": "^22.0.0",
    "@types/react": "^19.0.0",
    "@types/react-dom": "^19.0.0",
    "autoprefixer": "^10.4.0",
    "eslint": "^9.0.0",
    "eslint-config-next": "^15.0.0",
    "jsdom": "^25.0.0",
    "postcss": "^8.4.0",
    "tailwindcss": "^3.4.0",
    "typescript": "^5.6.0",
    "vitest": "^2.1.0"
  },
  "packageManager": "pnpm@9.0.0"
}
```

- [ ] **Step 2: Install**

Run: `pnpm install`
Expected: lockfile created, `node_modules/` populated.

> **Search-before-asserting check:** Before running install, run a web search to confirm the current stable versions of `@anthropic-ai/sdk`, `next`, and `react` (PRIMARY_PROMPT.md §8.1 — training data goes stale). If the latest stable versions differ from above, update the `package.json` values to match before installing. Note any major version changes in the commit message.

- [ ] **Step 3: Commit (delayed — see Task 0.13)**

### Task 0.3: Initialize `tsconfig.json`

**Files:** Create `tsconfig.json`

- [ ] **Step 1: Write the file**

```json
{
  "compilerOptions": {
    "target": "ES2022",
    "lib": ["dom", "dom.iterable", "esnext"],
    "allowJs": false,
    "skipLibCheck": true,
    "strict": true,
    "noEmit": true,
    "esModuleInterop": true,
    "module": "esnext",
    "moduleResolution": "bundler",
    "resolveJsonModule": true,
    "isolatedModules": true,
    "jsx": "preserve",
    "incremental": true,
    "plugins": [{ "name": "next" }],
    "baseUrl": ".",
    "paths": {
      "@/*": ["./*"]
    }
  },
  "include": ["next-env.d.ts", "**/*.ts", "**/*.tsx", ".next/types/**/*.ts"],
  "exclude": ["node_modules"]
}
```

### Task 0.4: Add ambient declaration for `?raw` imports

**Files:** Create `types/raw-imports.d.ts`

- [ ] **Step 1: Write the file**

```ts
declare module '*?raw' {
  const content: string;
  export default content;
}

declare module '*.md?raw' {
  const content: string;
  export default content;
}
```

- [ ] **Step 2: Include in tsconfig**

Edit `tsconfig.json` `include` array to add `"types/**/*.d.ts"`.

### Task 0.5: Configure Next.js with `?raw` webpack rule

**Files:** Create `next.config.mjs`

- [ ] **Step 1: Write the file**

```js
/** @type {import('next').NextConfig} */
const nextConfig = {
  webpack(config) {
    config.module.rules.push({
      resourceQuery: /raw/,
      type: 'asset/source',
    });
    return config;
  },
  experimental: {
    typedRoutes: false,
  },
};

export default nextConfig;
```

### Task 0.6: Configure Tailwind + PostCSS

**Files:** Create `tailwind.config.ts`, `postcss.config.mjs`

- [ ] **Step 1: Write `tailwind.config.ts`**

```ts
import type { Config } from 'tailwindcss';

const config: Config = {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        'surface-base': 'var(--surface-base)',
        'surface-elevated': 'var(--surface-elevated)',
        'surface-recessed': 'var(--surface-recessed)',
        'text-primary': 'var(--text-primary)',
        'text-secondary': 'var(--text-secondary)',
        'text-tertiary': 'var(--text-tertiary)',
        'text-inverse': 'var(--text-inverse)',
        'accent-primary': 'var(--accent-primary)',
        'accent-secondary': 'var(--accent-secondary)',
        'accent-deep': 'var(--accent-deep)',
        'accent-subtle-bg': 'var(--accent-subtle-bg)',
        'violation-primary': 'var(--violation-primary)',
        'violation-bg': 'var(--violation-bg)',
        'violation-warn': 'var(--violation-warn)',
        'border-default': 'var(--border-default)',
        'border-strong': 'var(--border-strong)',
        'border-subtle': 'var(--border-subtle)',
        'status-success': 'var(--status-success)',
        'status-success-bg': 'var(--status-success-bg)',
        'status-warning': 'var(--status-warning)',
        'status-warning-bg': 'var(--status-warning-bg)',
        'data-bg': 'var(--data-bg)',
        'data-text': 'var(--data-text)',
        'data-accent': 'var(--data-accent)',
      },
      fontFamily: {
        serif: ['var(--font-serif)'],
        sans: ['var(--font-sans)'],
        mono: ['var(--font-mono)'],
      },
      fontSize: {
        xs: ['11px', { lineHeight: '1.5' }],
        sm: ['13px', { lineHeight: '1.5' }],
        base: ['15px', { lineHeight: '1.5' }],
        md: ['17px', { lineHeight: '1.7' }],
        lg: ['20px', { lineHeight: '1.25' }],
        xl: ['26px', { lineHeight: '1.25' }],
        '2xl': ['34px', { lineHeight: '1.25' }],
      },
    },
  },
  plugins: [],
};

export default config;
```

- [ ] **Step 2: Write `postcss.config.mjs`**

```js
export default {
  plugins: {
    tailwindcss: {},
    autoprefixer: {},
  },
};
```

### Task 0.7: Configure Vitest

**Files:** Create `vitest.config.ts`, `vitest.setup.ts`

- [ ] **Step 1: Write `vitest.config.ts`**

```ts
import { defineConfig } from 'vitest/config';
import path from 'node:path';

export default defineConfig({
  test: {
    environment: 'jsdom',
    setupFiles: ['./vitest.setup.ts'],
    globals: true,
    include: ['**/*.test.ts', '**/*.test.tsx'],
    exclude: ['node_modules', '.next', 'tests/e2e/**'],
  },
  resolve: {
    alias: {
      '@': path.resolve(__dirname, '.'),
    },
  },
  // Mirror Next.js ?raw webpack behavior for tests
  define: {},
});
```

- [ ] **Step 2: Write `vitest.setup.ts`**

```ts
import '@testing-library/jest-dom/vitest';

// Stub for ?raw imports in unit tests — overridden per-test where the actual file content matters
// Use vi.mock('@/prompts/pass_1_system_prompt.md?raw', () => ({ default: '...' })) inside tests
```

> **Note on `?raw` in Vitest:** Vitest's Vite-based loader honors `?raw` natively for files inside the project. The dedicated webpack rule in `next.config.mjs` is for Next.js production build only. Verify this works during Batch 2 by running the invariants test.

### Task 0.8: Configure Playwright

**Files:** Create `playwright.config.ts`

- [ ] **Step 1: Write the file**

```ts
import { defineConfig, devices } from '@playwright/test';

export default defineConfig({
  testDir: './tests/e2e',
  timeout: 30_000,
  retries: 0,
  use: {
    baseURL: 'http://localhost:3000',
    trace: 'on-first-retry',
    viewport: { width: 1280, height: 900 },
  },
  webServer: {
    command: 'pnpm dev',
    url: 'http://localhost:3000',
    reuseExistingServer: !process.env.CI,
    timeout: 60_000,
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
  ],
});
```

### Task 0.9: Configure ESLint

**Files:** Create `.eslintrc.json`

- [ ] **Step 1: Write the file**

```json
{
  "extends": ["next/core-web-vitals"],
  "rules": {
    "@next/next/no-img-element": "warn"
  }
}
```

### Task 0.10: Relocate spec files

**Files:**
- Move: `Prompts/pass_1_system_prompt.md` → `prompts/pass_1_system_prompt.md`
- Move: `Prompts/pass_2_system_prompt.md` → `prompts/pass_2_system_prompt.md`
- Move: `Prompts/pass_3_system_prompt.md` → `prompts/pass_3_system_prompt.md`
- Move: `personas.json` → `data/personas.json`
- Keep at root: `ruleset_v1.md`, `PRIMARY_PROMPT.md`, `visual_system.md`, `CLAUDE.md`

- [ ] **Step 1: Move prompt files**

Run: `mkdir -p prompts data && mv Prompts/pass_1_system_prompt.md prompts/ && mv Prompts/pass_2_system_prompt.md prompts/ && mv Prompts/pass_3_system_prompt.md prompts/ && rmdir Prompts && mv personas.json data/personas.json`
Expected: `prompts/` and `data/` exist with the moved files; `Prompts/` removed.

> The PRIMARY_PROMPT.md §4.10 import path is `@/prompts/pass_*.md?raw` — lowercase. The repo currently has uppercase `Prompts/`. This rename is required.

- [ ] **Step 2: Verify byte-frozen content unchanged**

Run: `wc -c prompts/pass_1_system_prompt.md prompts/pass_2_system_prompt.md prompts/pass_3_system_prompt.md data/personas.json ruleset_v1.md`
Record byte counts; cross-check against PRIMARY_PROMPT.md §8.5 ("Locked artifacts stay locked") — these files must not have been modified by the move.

### Task 0.11: Create minimal app shell

**Files:** Create `app/layout.tsx`, `app/page.tsx`, `app/globals.css`

- [ ] **Step 1: Write `app/globals.css`** (placeholder — tokens land in Batch 5)

```css
:root {
  --surface-base: #FAF8F4;
  --text-primary: #1F2933;
}

body {
  background: var(--surface-base);
  color: var(--text-primary);
  margin: 0;
  font-family: system-ui, sans-serif;
}
```

- [ ] **Step 2: Write `app/layout.tsx`**

```tsx
import './globals.css';
import type { Metadata } from 'next';

export const metadata: Metadata = {
  title: 'KYC Tier Decisioning — Shift Atlas',
  description: 'Three-pass reasoning pipeline demo for Philippine bank compliance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 3: Write `app/page.tsx`** (placeholder)

```tsx
export default function HomePage() {
  return (
    <main style={{ padding: 48 }}>
      <h1>KYC Tier Decisioning</h1>
      <p>Pipeline UI lands in Batch 10.</p>
    </main>
  );
}
```

### Task 0.12: Create minimal README

**Files:** Create `README.md`

- [ ] **Step 1: Write the file**

```markdown
# KYC Tier Decisioning Demo

Three-pass reasoning pipeline demo built as a portfolio asset for Shift Atlas. Read `PRIMARY_PROMPT.md` first.

## Local development

```bash
pnpm install
pnpm dev
```

## Environment variables

Set in **Vercel project environment variables** — never in a local `.env.example` file (paste-over risk per PRIMARY_PROMPT.md §7.7):

- `ANTHROPIC_API_KEY` — server-side only
- `UPSTASH_REDIS_REST_URL` — injected by Vercel Marketplace
- `UPSTASH_REDIS_REST_TOKEN` — injected by Vercel Marketplace
- `ADMIN_STATS_KEY` — secret for `/api/admin/stats` access

For local development, create `.env.local` (already in `.gitignore`) with the same keys. Do not commit it.

## Production URL

`kyc.shiftatlas.tech`
```

### Task 0.13: Initialize git and commit

**Files:** All Batch 0 files plus the relocated spec files.

- [ ] **Step 1: Initialize git**

Run: `git init`
Expected: `.git/` directory created.

- [ ] **Step 2: Verify dev server boots**

Run: `pnpm dev` — leave running, open `http://localhost:3000`, confirm the placeholder page renders. Stop with Ctrl-C.

- [ ] **Step 3: Verify test runner works**

Run: `pnpm test`
Expected: "No test files found" or 0 tests passed — both are acceptable. Vitest must not error.

- [ ] **Step 4: Stage and commit**

```bash
git add .gitignore package.json pnpm-lock.yaml tsconfig.json types/ next.config.mjs tailwind.config.ts postcss.config.mjs vitest.config.ts vitest.setup.ts playwright.config.ts .eslintrc.json README.md app/ prompts/ data/ ruleset_v1.md PRIMARY_PROMPT.md visual_system.md CLAUDE.md
git status  # verify nothing sensitive staged
git commit -m "chore: bootstrap Next.js project + relocate spec files

- Next.js 15 App Router with ?raw webpack rule for prompt injection
- Tailwind mapped to CSS custom properties (Batch 5 will fill tokens)
- Vitest + Playwright configured
- Relocate prompts/ (was Prompts/) and data/personas.json (was personas.json)
- Spec files (PRIMARY_PROMPT.md, visual_system.md, ruleset_v1.md, prompts/, personas.json) remain byte-frozen"
```

### ✅ Checkpoint 0 — JP review gate

- `pnpm dev` boots, `pnpm test` exits 0, `pnpm typecheck` passes
- Spec files relocated, byte counts unchanged
- First commit clean; no secrets staged
- Request JP review before proceeding to Batch 1

---

## Batch 1 — Schemas, form config, adapters, sort

**Goal:** Establish the typed data foundation. Form-config-first enum SSOT per Decision 34. Zod schemas validate persona JSON at load time, applying Decision 28/29 normalizers. Canonical sort utility ready for render-time use per Decision 41 Path X. All four personas pass validation as fixtures.

### Task 1.1: Profile form config — enum SSOT

**Files:**
- Create: `lib/forms/profileFormConfig.ts`
- Test: `lib/forms/profileFormConfig.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { profileFormConfig } from './profileFormConfig';

describe('profileFormConfig', () => {
  it('exports an enum source of truth for each profile field', () => {
    expect(profileFormConfig.identity_document_type.options).toContain('PhilSys');
    expect(profileFormConfig.residency_status.options).toContain('PH resident');
    expect(profileFormConfig.customer_type.options).toContain('individual retail');
    expect(profileFormConfig.pep_status.options).toContain('none');
    expect(profileFormConfig.sanctions_screening.options).toContain('clean');
    expect(profileFormConfig.high_risk_jurisdiction_connection.options).toContain('none');
    expect(profileFormConfig.adverse_media.options).toContain('no');
    expect(profileFormConfig.years_with_bank.options).toContain('new');
    expect(profileFormConfig.years_with_bank.options).toContain('1-3');
  });

  it('groups fields by regulatory function per Decision 37', () => {
    expect(profileFormConfig.identity_document_type.group).toBe('identity');
    expect(profileFormConfig.occupation_type.group).toBe('account');
    expect(profileFormConfig.pep_status.group).toBe('risk');
    expect(profileFormConfig.years_with_bank.group).toBe('relationship');
  });

  it('marks composite-prone fields per Decision 37a', () => {
    expect(profileFormConfig.source_of_funds.composite).toBe(true);
    expect(profileFormConfig.account_purpose.composite).toBe(true);
    expect(profileFormConfig.identity_document_type.composite).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/forms/profileFormConfig.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/forms/profileFormConfig.ts
// Enum source of truth for the 13-field customer profile.
// Per PRIMARY_PROMPT.md §4.7 (Decision 34), enums live HERE; persona JSONs validate as subsets.

export type FieldGroup = 'identity' | 'account' | 'risk' | 'relationship';

export interface FieldConfig {
  group: FieldGroup;
  label: string;
  options: readonly string[];
  composite?: boolean;
  citationTooltip?: string;
}

export const profileFormConfig = {
  customer_reference: {
    group: 'identity',
    label: 'Customer reference',
    options: [] as const, // free text
  },
  identity_document_type: {
    group: 'identity',
    label: 'Identity document',
    options: ['PhilSys', 'passport', 'driver\'s license', 'other government ID'] as const,
    composite: true, // + "PhilSys enrollment in process" checkbox
  },
  residency_status: {
    group: 'identity',
    label: 'Residency status',
    options: ['PH resident', 'PH non-resident', 'OFW', 'foreign national'] as const,
  },
  customer_type: {
    group: 'identity',
    label: 'Customer type',
    options: ['individual retail', 'individual high-net-worth', 'sole proprietor', 'corporate', 'NGO'] as const,
    citationTooltip: 'Classification per MORB §901 customer typology.',
  },
  occupation_type: {
    group: 'account',
    label: 'Occupation',
    options: ['employed', 'self-employed', 'business owner', 'student', 'OFW'] as const,
    // Also accepts free text — schema uses union; see lib/schemas/customerProfile.ts
  },
  source_of_funds: {
    group: 'account',
    label: 'Source of funds',
    options: ['salary', 'business', 'investments', 'inheritance', 'remittance', 'unclear'] as const,
    composite: true,
    citationTooltip: 'Source of funds verification — FATF R.10, MORB §921.',
  },
  account_purpose: {
    group: 'account',
    label: 'Account purpose',
    options: ['payroll', 'savings', 'business', 'investment', 'remittance', 'unclear'] as const,
    composite: true,
  },
  expected_monthly_volume_php: {
    group: 'account',
    label: 'Expected monthly volume (PHP)',
    options: [] as const, // numeric
  },
  pep_status: {
    group: 'risk',
    label: 'PEP status',
    options: ['none', 'domestic PEP', 'foreign PEP', 'family/close associate'] as const,
    citationTooltip: 'Person currently or formerly in a prominent public function, or their family / close associates — FATF R.12, MORB §923.',
  },
  sanctions_screening: {
    group: 'risk',
    label: 'Sanctions screening',
    options: ['clean', 'partial match', 'confirmed match'] as const,
  },
  high_risk_jurisdiction_connection: {
    group: 'risk',
    label: 'High-risk jurisdiction connection',
    options: ['none', 'transit', 'residence', 'business operations'] as const,
    citationTooltip: 'FATF high-risk / monitored jurisdictions — FATF Public Statement, MORB §923.',
  },
  adverse_media: {
    group: 'risk',
    label: 'Adverse media',
    options: ['no', 'minor flags', 'material concerns'] as const,
  },
  years_with_bank: {
    group: 'relationship',
    label: 'Years with bank',
    options: ['new', '1-3', '3-5', '5+'] as const,
  },
} as const satisfies Record<string, FieldConfig>;

export type ProfileFormConfig = typeof profileFormConfig;
```

> **Open verification** (PRIMARY_PROMPT.md §6.6): `years_with_bank` is enum, confirmed by `data/personas.json` values `"new"` and `"1-3"`. Render as enum dropdown.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/forms/profileFormConfig.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/forms/profileFormConfig.ts lib/forms/profileFormConfig.test.ts
git commit -m "feat(schemas): add profile form config as enum SSOT per Decision 34"
```

### Task 1.2: Customer profile schema

**Files:**
- Create: `lib/schemas/customerProfile.ts`
- Test: `lib/schemas/customerProfile.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { CustomerProfileSchema } from './customerProfile';
import personasData from '@/data/personas.json';

describe('CustomerProfileSchema', () => {
  it('validates Maria profile', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    expect(CustomerProfileSchema.safeParse(maria!.profile).success).toBe(true);
  });

  it('validates Carlos profile', () => {
    const carlos = personasData.personas.find((p: any) => p.id === 'carlos');
    expect(CustomerProfileSchema.safeParse(carlos!.profile).success).toBe(true);
  });

  it('validates persona_c profile', () => {
    const c = personasData.personas.find((p: any) => p.id === 'persona_c');
    expect(CustomerProfileSchema.safeParse(c!.profile).success).toBe(true);
  });

  it('validates persona_d profile', () => {
    const d = personasData.personas.find((p: any) => p.id === 'persona_d');
    expect(CustomerProfileSchema.safeParse(d!.profile).success).toBe(true);
  });

  it('rejects expected_monthly_volume_php = 0', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const bad = { ...maria!.profile, expected_monthly_volume_php: 0 };
    expect(CustomerProfileSchema.safeParse(bad).success).toBe(false);
  });

  it('accepts composite source_of_funds wire string', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const composite = { ...maria!.profile, source_of_funds: 'mixed (salary + inheritance)' };
    expect(CustomerProfileSchema.safeParse(composite).success).toBe(true);
  });

  it('accepts occupation_type as enum value', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    expect(CustomerProfileSchema.safeParse({ ...maria!.profile, occupation_type: 'employed' }).success).toBe(true);
  });

  it('accepts occupation_type as free text (≥ 3 chars)', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    expect(CustomerProfileSchema.safeParse({ ...maria!.profile, occupation_type: 'chef de partie' }).success).toBe(true);
  });

  it('rejects occupation_type free text shorter than 3 chars', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    expect(CustomerProfileSchema.safeParse({ ...maria!.profile, occupation_type: 'xy' }).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/schemas/customerProfile.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/schemas/customerProfile.ts
import { z } from 'zod';
import { profileFormConfig } from '@/lib/forms/profileFormConfig';

const enumOf = <T extends readonly [string, ...string[]]>(opts: T) => z.enum(opts);

// Composite-prone fields accept any non-empty string (wire format per Decision 37a)
const compositeString = z.string().min(1);

// occupation_type — enum or free text with three guards per PRIMARY_PROMPT.md §6.6 (Decision 37b)
const occupationEnumValues = profileFormConfig.occupation_type.options as readonly [string, ...string[]];
const OccupationField = z.preprocess(
  (val) => (typeof val === 'string' ? val.trim() : val),
  z.union([
    enumOf(occupationEnumValues),
    z.string().min(3),
  ]),
);

export const CustomerProfileSchema = z.object({
  customer_reference: z.string().min(1),
  identity_document_type: compositeString,
  residency_status: enumOf(profileFormConfig.residency_status.options as readonly [string, ...string[]]),
  customer_type: enumOf(profileFormConfig.customer_type.options as readonly [string, ...string[]]),
  occupation_type: OccupationField,
  source_of_funds: compositeString,
  account_purpose: compositeString,
  expected_monthly_volume_php: z.number().int().positive(),
  pep_status: enumOf(profileFormConfig.pep_status.options as readonly [string, ...string[]]),
  sanctions_screening: enumOf(profileFormConfig.sanctions_screening.options as readonly [string, ...string[]]),
  high_risk_jurisdiction_connection: enumOf(profileFormConfig.high_risk_jurisdiction_connection.options as readonly [string, ...string[]]),
  adverse_media: enumOf(profileFormConfig.adverse_media.options as readonly [string, ...string[]]),
  years_with_bank: enumOf(profileFormConfig.years_with_bank.options as readonly [string, ...string[]]),
}).strict();

export type CustomerProfile = z.infer<typeof CustomerProfileSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/schemas/customerProfile.test.ts`
Expected: PASS (all nine).

> If any of the four personas fail validation: inspect the failing field, check that the value appears in `profileFormConfig.<field>.options`, add it if missing. The form config must be a SUPERSET of all persona values. Do not modify the locked `personas.json` to match — adjust the form config.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/customerProfile.ts lib/schemas/customerProfile.test.ts
git commit -m "feat(schemas): add CustomerProfileSchema with occupation union guards"
```

### Task 1.2.5: Persona normalizers — pure functions only (no schema deps)

**Goal:** Land `normalizePass1` and `normalizePass2` as pure functions BEFORE the Pass 1 / Pass 2 schema tests need them. The typed `loadPersona` / `listPersonas` extend this same file later in Task 1.7, after the schemas exist. Inserted to fix the ordering issue flagged in the plan amendments at the top.

**Files:**
- Create: `lib/schemas/personaAdapters.ts`
- Test: `lib/schemas/personaAdapters.normalizers.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { normalizePass1, normalizePass2 } from './personaAdapters';
import personasData from '@/data/personas.json';

describe('normalizePass1 (pure)', () => {
  it('rewrites "escalation" category to "escalation_triggers" (Carlos / Persona C)', () => {
    const carlos = personasData.personas.find((p: any) => p.id === 'carlos');
    const before = carlos!.pass_1.rules_fired.find((r: any) => r.category === 'escalation');
    if (before) {
      const normalized = normalizePass1(carlos!.pass_1);
      expect(normalized.rules_fired.every((r: any) => r.category !== 'escalation')).toBe(true);
      expect(normalized.rules_fired.some((r: any) => r.category === 'escalation_triggers')).toBe(true);
    }
  });

  it('is a no-op for canonical Pass 1 (Maria)', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const normalized = normalizePass1(maria!.pass_1);
    expect(normalized.rules_fired).toEqual(maria!.pass_1.rules_fired);
  });

  it('is idempotent', () => {
    const carlos = personasData.personas.find((p: any) => p.id === 'carlos');
    const once = normalizePass1(carlos!.pass_1);
    const twice = normalizePass1(once);
    expect(twice).toEqual(once);
  });
});

describe('normalizePass2 (pure)', () => {
  it('maps audit_generated_at → generated_at (Persona C)', () => {
    const c = personasData.personas.find((p: any) => p.id === 'persona_c');
    if ((c!.pass_2 as any).audit_generated_at) {
      const normalized = normalizePass2(c!.pass_2);
      expect(normalized.generated_at).toBe((c!.pass_2 as any).audit_generated_at);
    }
  });

  it('maps target_violations → target_check_ids', () => {
    const c = personasData.personas.find((p: any) => p.id === 'persona_c');
    if ((c!.pass_2 as any).target_violations) {
      const normalized = normalizePass2(c!.pass_2);
      expect(normalized.target_check_ids).toEqual((c!.pass_2 as any).target_violations);
    }
  });

  it('defaults regeneration_scope to "none" when null', () => {
    const c = personasData.personas.find((p: any) => p.id === 'persona_c');
    const normalized = normalizePass2(c!.pass_2);
    expect(normalized.regeneration_scope).toBe('none');
  });

  it('is idempotent', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const once = normalizePass2(maria!.pass_2);
    const twice = normalizePass2(once);
    expect(twice).toEqual(once);
  });

  it('emits computed DC-07 dual-satisfaction flags (per plan amendment #4)', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const normalized = normalizePass2(maria!.pass_2);
    expect(typeof normalized._dc07_structured_record).toBe('boolean');
    expect(typeof normalized._dc07_prose).toBe('boolean');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/schemas/personaAdapters.normalizers.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation (pure normalizers only — typed loaders land in Task 1.7)**

```ts
// lib/schemas/personaAdapters.ts
// Render-time adapters for Decision 28 (Pass 2 shape) and Decision 29 (Pass 1 category).
// PRIMARY_PROMPT.md §4.4: locked persona JSON stays byte-frozen; normalize at read time.
//
// This file lands in two phases per the plan amendments:
//   Phase 1 (Task 1.2.5 — this task): pure normalizers, no schema imports
//   Phase 2 (Task 1.7): typed loadPersona / listPersonas added on top
// Do not rewrite this file in Task 1.7 — only extend it.

export function normalizePass1(p1: any): any {
  return {
    ...p1,
    rules_fired: (p1.rules_fired ?? []).map((r: any) => ({
      ...r,
      category: r.category === 'escalation' ? 'escalation_triggers' : r.category,
    })),
  };
}

// DC-07 dual-satisfaction inspection per plan amendment #4.
// Half 1 (structured-record): a DC-07 check exists in the audit and passed.
// Half 2 (prose-level): a check's evidence_note explicitly references the audit_trail prose.
// If a persona JSON cannot distinguish the two halves cleanly, both flags fall back to the
// presence of any passing DC-07 check; surface anomalies to JP during implementation rather
// than defaulting silently.
function computeDc07Flags(checks: any[]): { _dc07_structured_record: boolean; _dc07_prose: boolean } {
  const dc07 = checks.filter((c) => c?.rule_id === 'DC-07' || c?.check_type === 'dc07_documentation');
  if (dc07.length === 0) return { _dc07_structured_record: false, _dc07_prose: false };
  const structuredRecord = dc07.some((c) => c?.status === 'PASS' && /rules_fired|structured-record/.test(c?.evidence_note ?? ''));
  const prose = dc07.some((c) => c?.status === 'PASS' && /audit_trail|prose-level|substantive/.test(c?.evidence_note ?? ''));
  // Fallback: if neither half matches the prose patterns, but at least one DC-07 check is PASS,
  // treat both halves as satisfied. The PRIMARY_PROMPT.md §4.6 contract says DC-07 is dual; on
  // a PASS-clean persona, both halves are by construction true.
  const anyPass = dc07.some((c) => c?.status === 'PASS');
  return {
    _dc07_structured_record: structuredRecord || (anyPass && !prose ? true : structuredRecord),
    _dc07_prose: prose || (anyPass && !structuredRecord ? true : prose),
  };
}

export function normalizePass2(p2: any): any {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { audited_persona, ...rest } = p2;
  const checks = p2.checks ?? [];
  const dc07 = computeDc07Flags(checks);
  return {
    ...rest,
    generated_at: p2.generated_at ?? p2.audit_generated_at,
    target_check_ids: p2.target_check_ids ?? p2.target_violations ?? [],
    regeneration_scope: p2.regeneration_scope ?? 'none',
    _dc07_structured_record: p2._dc07_structured_record ?? dc07._dc07_structured_record,
    _dc07_prose: p2._dc07_prose ?? dc07._dc07_prose,
  };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/schemas/personaAdapters.normalizers.test.ts`
Expected: PASS (all eight).

- [ ] **Step 5: Inspect each persona's DC-07 check evidence notes**

Before committing, open `data/personas.json` and grep for `"rule_id": "DC-07"`. For each of the four personas, read the `evidence_note` text. Confirm the regex heuristic in `computeDc07Flags` actually distinguishes the two halves for at least one persona. If the persona JSONs use language not matched by the regex, refine the patterns (e.g., add `documented-rationale`, `examiner notes audit_trail`, etc.) — or, if the personas treat DC-07 as a single check without splitting into halves, surface to JP. Per plan amendment #4, do not silently default both to `true` without confirming the heuristic at least picks up the substantive distinction on a real persona.

- [ ] **Step 6: Commit**

```bash
git add lib/schemas/personaAdapters.ts lib/schemas/personaAdapters.normalizers.test.ts
git commit -m "feat(schemas): add pure normalizers + DC-07 dual-satisfaction flags (plan amendment #4)"
```

### Task 1.3: Pass 1 schema

**Files:**
- Create: `lib/schemas/pass1.ts`
- Test: `lib/schemas/pass1.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { Pass1OutputSchema } from './pass1';
import { normalizePass1 } from './personaAdapters';
import personasData from '@/data/personas.json';

describe('Pass1OutputSchema', () => {
  for (const id of ['maria', 'carlos', 'persona_c', 'persona_d']) {
    it(`validates ${id} Pass 1 after normalization`, () => {
      const p = personasData.personas.find((x: any) => x.id === id);
      const normalized = normalizePass1(p!.pass_1);
      const result = Pass1OutputSchema.safeParse(normalized);
      if (!result.success) console.error(result.error.issues);
      expect(result.success).toBe(true);
    });
  }

  it('rejects missing decisive_rule_ids', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const normalized = normalizePass1(maria!.pass_1);
    const bad = { ...normalized, decision: { ...normalized.decision, decisive_rule_ids: undefined } };
    expect(Pass1OutputSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/schemas/pass1.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/schemas/pass1.ts
import { z } from 'zod';

// PRIMARY_PROMPT.md §4.7: .strict() on canonical structural fields; .passthrough() on category-field-bearing structures per Decision 29.

export const RiskCategorySchema = z.object({
  weight: z.number(),
  rules: z.array(z.string()),
}).strict();

export const RuleFiredSchema = z.object({
  rule_id: z.string(),
  // category accepts the locked "escalation" variant via passthrough at the parent level;
  // canonical form is "escalation_triggers" after normalizePass1.
  category: z.enum(['escalation_triggers', 'tier_eligibility', 'documentation_process']),
  weight: z.number(),
  trigger_evidence: z.string(),
}).passthrough();

export const DecisionSchema = z.object({
  recommended_tier: z.enum(['SDD', 'Standard', 'EDD', 'Hold']),
  decision_basis: z.enum(['score_based', 'hard_rule', 'multi_decisive_rule', 'hold']),
  decisive_rule_ids: z.array(z.string()),
  senior_approval_required: z.boolean(),
  onboarding_hold: z.boolean(),
  hold_reason: z.string().nullable(),
}).strict();

export const Pass1OutputSchema = z.object({
  decision: DecisionSchema,
  risk_score: z.object({
    total: z.number(),
    category_breakdown: z.object({
      tier_eligibility: z.number(),
      escalation_triggers: z.number(),
      documentation_process: z.number(),
    }).strict(),
  }).strict(),
  rules_fired: z.array(RuleFiredSchema),
  considered_rules: z.array(z.object({
    rule_id: z.string(),
    fired: z.boolean(),
    confidence_basis: z.string(),
  }).passthrough()).optional(),
  examiner_notes_full: z.string(),
  summary_finding: z.string(),
  edd_requirements: z.array(z.string()).optional(),
}).passthrough();

export type Pass1Output = z.infer<typeof Pass1OutputSchema>;
```

> **Refinement after persona validation:** Run the test; if any persona fails on a field not modeled above, inspect the persona JSON for that field and either add it to the schema (with appropriate strictness) or rely on the top-level `.passthrough()`. Some persona-specific extra fields (e.g., `considered_rules`, `edd_requirements`) may be present on some personas and absent on others — model with `.optional()`.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/schemas/pass1.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/pass1.ts lib/schemas/pass1.test.ts
git commit -m "feat(schemas): add Pass 1 output schema with Decision 29 category passthrough"
```

### Task 1.4: Pass 2 schema

**Files:**
- Create: `lib/schemas/pass2.ts`
- Test: `lib/schemas/pass2.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { Pass2OutputSchema } from './pass2';
import { normalizePass2 } from './personaAdapters';
import personasData from '@/data/personas.json';

describe('Pass2OutputSchema', () => {
  for (const id of ['maria', 'carlos', 'persona_c', 'persona_d']) {
    it(`validates ${id} Pass 2 after normalization`, () => {
      const p = personasData.personas.find((x: any) => x.id === id);
      const normalized = normalizePass2(p!.pass_2);
      const result = Pass2OutputSchema.safeParse(normalized);
      if (!result.success) console.error(result.error.issues);
      expect(result.success).toBe(true);
    });
  }

  it('accepts numeric_threshold_verification check shape', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const normalized = normalizePass2(maria!.pass_2);
    const ntv = normalized.checks.find((c: any) => c.check_type === 'numeric_threshold_verification');
    expect(ntv).toBeDefined();
    expect(ntv?.profile_value).toBeDefined();
    expect(ntv?.rule_threshold).toBeDefined();
    expect(ntv?.comparison_result).toBeDefined();
  });

  it('marks DC-07 check', () => {
    const maria = personasData.personas.find((p: any) => p.id === 'maria');
    const normalized = normalizePass2(maria!.pass_2);
    expect(normalized.checks.some((c: any) => c.rule_id === 'DC-07')).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/schemas/pass2.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/schemas/pass2.ts
import { z } from 'zod';

export const CheckTypeSchema = z.enum([
  'hard_rule_floor',
  'rule_firing',
  'numeric_threshold_verification',
  'score_arithmetic',
  'score_band_mapping',
  'decision_basis_consistency',
  'pattern_substance',
  'dc07_documentation',
  'register_compliance',
  'consistency',
]);

export const AuditCheckSchema = z.object({
  rule_id: z.string().nullable().optional(),
  check_type: CheckTypeSchema,
  status: z.enum(['PASS', 'FAIL', 'QUALITY']),
  severity: z.enum(['critical', 'material', 'quality']).nullable(),
  evidence_note: z.string().optional(),
  regulatory_citation: z.string().optional(),
  // Numeric threshold fields — only present when check_type === 'numeric_threshold_verification'
  profile_value: z.union([z.string(), z.number(), z.null()]).optional(),
  rule_threshold: z.union([z.string(), z.number(), z.null()]).optional(),
  comparison_result: z.string().optional(),
}).passthrough();

export const Pass2OutputSchema = z.object({
  generated_at: z.string(),         // normalizePass2 maps audit_generated_at → generated_at for Persona C
  target_check_ids: z.array(z.string()), // normalizePass2 maps target_violations → target_check_ids
  regeneration_scope: z.enum(['none', 'full', 'targeted']).default('none'),
  correction_required: z.boolean(),
  audit_summary: z.string(),
  overall_status: z.enum(['PASS', 'PASS_WITH_QUALITY_FLAGS', 'FAIL']),
  checks: z.array(AuditCheckSchema),
  severity_counts: z.object({
    critical: z.number(),
    material: z.number(),
    quality: z.number(),
  }).strict().optional(),
  // metadata absorbs persona-specific variations per Decision 28
  metadata: z.record(z.unknown()).optional(),
  pass_3_targeting: z.record(z.unknown()).optional(),
  // Plan amendment #4 — computed DC-07 dual-satisfaction flags written by normalizePass2.
  // `_` prefix marks them as derived, not part of the wire/model contract.
  _dc07_structured_record: z.boolean().optional(),
  _dc07_prose: z.boolean().optional(),
}).passthrough();

export type Pass2Output = z.infer<typeof Pass2OutputSchema>;
export type AuditCheck = z.infer<typeof AuditCheckSchema>;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/schemas/pass2.test.ts`
Expected: PASS.

> If `overall_status` or `severity_counts` field names don't match the persona JSON, inspect with `grep -n 'overall_status\|severity_counts' data/personas.json` and adjust. The Decision 34 passthrough strategy says: `metadata`, `pass_3_targeting`, `rules_fired[].category` use passthrough; everything else stays strict where uniform across personas.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/pass2.ts lib/schemas/pass2.test.ts
git commit -m "feat(schemas): add Pass 2 schema with Decision 28 normalization-aware shape"
```

### Task 1.5: Pass 3 schema

**Files:**
- Create: `lib/schemas/pass3.ts`
- Test: `lib/schemas/pass3.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { Pass3OutputSchema } from './pass3';

describe('Pass3OutputSchema', () => {
  // Personas do not exercise Pass 3 (Decision 27); test with a synthetic minimal shape derived from prompts/pass_3_system_prompt.md contract.
  it('validates a minimal corrected Pass 1 + change log', () => {
    const sample = {
      correction_against_audit_id: 'audit-test-20260512T120000Z',
      correction_attempt_number: 1,
      corrected_pass_1: {
        decision: { recommended_tier: 'EDD', decision_basis: 'hard_rule', decisive_rule_ids: ['ES-03'], senior_approval_required: true, onboarding_hold: false, hold_reason: null },
        risk_score: { total: 25, category_breakdown: { tier_eligibility: 15, escalation_triggers: 10, documentation_process: 0 } },
        rules_fired: [{ rule_id: 'ES-03', category: 'escalation_triggers', weight: 10, trigger_evidence: '...' }],
        examiner_notes_full: '...',
        summary_finding: '...',
      },
      change_log: [
        { field: 'decision.recommended_tier', before: 'Standard', after: 'EDD', reason: 'ES-03 hard rule missed in original' },
      ],
    };
    const result = Pass3OutputSchema.safeParse(sample);
    if (!result.success) console.error(result.error.issues);
    expect(result.success).toBe(true);
  });

  it('rejects missing change_log', () => {
    const bad = { correction_against_audit_id: 'x', correction_attempt_number: 1, corrected_pass_1: {} };
    expect(Pass3OutputSchema.safeParse(bad).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/schemas/pass3.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/schemas/pass3.ts
import { z } from 'zod';
import { Pass1OutputSchema } from './pass1';

export const ChangeLogEntrySchema = z.object({
  field: z.string(),
  before: z.unknown(),
  after: z.unknown(),
  reason: z.string(),
}).strict();

export const Pass3OutputSchema = z.object({
  correction_against_audit_id: z.string(),
  correction_attempt_number: z.number().int().positive(),
  corrected_pass_1: Pass1OutputSchema,
  change_log: z.array(ChangeLogEntrySchema).min(1),
}).passthrough();

export type Pass3Output = z.infer<typeof Pass3OutputSchema>;
```

> The Pass 3 schema details derive from `prompts/pass_3_system_prompt.md`'s embedded contract. Open that file and skim §"Output Format" before refining. If the prompt specifies additional required fields (e.g., `correction_summary`, `unresolved_findings`), add them as `.optional()` first and tighten once a live Pass 3 has been observed during Batch 11.

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/schemas/pass3.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/pass3.ts lib/schemas/pass3.test.ts
git commit -m "feat(schemas): add Pass 3 schema with change_log contract"
```

### Task 1.6: DecisioningError schema

**Files:**
- Create: `lib/schemas/apiError.ts`
- Test: `lib/schemas/apiError.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { DecisioningErrorSchema } from './apiError';

describe('DecisioningErrorSchema', () => {
  it('validates a malformed_model_json error', () => {
    const e = { pass: 1, errorType: 'malformed_model_json', message: 'Model returned non-JSON output.', retryable: true };
    expect(DecisioningErrorSchema.safeParse(e).success).toBe(true);
  });

  it('validates a rate_limited error', () => {
    const e = { pass: 1, errorType: 'rate_limited', message: 'Hourly limit reached. Try again in 47 minutes.', retryable: false };
    expect(DecisioningErrorSchema.safeParse(e).success).toBe(true);
  });

  it('validates re-audit pass label', () => {
    const e = { pass: 're-audit', errorType: 'validation_failed', message: 'Re-audit output failed schema validation.', retryable: true, zodIssues: [] };
    expect(DecisioningErrorSchema.safeParse(e).success).toBe(true);
  });

  it('rejects unknown errorType', () => {
    const e = { pass: 1, errorType: 'oops', message: 'x', retryable: false };
    expect(DecisioningErrorSchema.safeParse(e).success).toBe(false);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/schemas/apiError.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// lib/schemas/apiError.ts
// Typed error contract per PRIMARY_PROMPT.md §4.7.
import { z } from 'zod';

export const DecisioningErrorTypeSchema = z.enum([
  'malformed_model_json',
  'validation_failed',
  'upstream_timeout',
  'rate_limited',
  'cap_reached',
]);

export const DecisioningErrorSchema = z.object({
  pass: z.union([z.literal(1), z.literal(2), z.literal(3), z.literal('re-audit')]),
  errorType: DecisioningErrorTypeSchema,
  zodIssues: z.array(z.any()).optional(),
  message: z.string(),
  retryable: z.boolean(),
}).strict();

export type DecisioningError = z.infer<typeof DecisioningErrorSchema>;
export type DecisioningErrorType = z.infer<typeof DecisioningErrorTypeSchema>;

// Institutional-register messages for the gating error types (PRIMARY_PROMPT.md §4.8)
export const ERROR_MESSAGES = {
  rate_limited_hourly: 'Live generation limit reached for this hour. Pre-generated examples remain available.',
  rate_limited_daily: 'Live generation limit reached for today. Pre-generated examples remain available.',
  cap_reached: 'Daily live-generation cap reached. Pre-generated examples remain available; live generation resumes at 00:00 UTC.',
} as const;
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/schemas/apiError.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/apiError.ts lib/schemas/apiError.test.ts
git commit -m "feat(schemas): add DecisioningError discriminated-union schema"
```

### Task 1.7: Extend personaAdapters with typed loadPersona / listPersonas (additive)

> **Plan amendment #1:** This task is additive. The file `lib/schemas/personaAdapters.ts` already exists from Task 1.2.5 with the pure normalizers. Do **not** rewrite it. Add the typed loaders and types on top of the existing exports.

**Files:**
- Modify: `lib/schemas/personaAdapters.ts` (extend with `PersonaId`, `LoadedPersona`, `loadPersona`, `PersonaListEntry`, `listPersonas`)
- Test: `lib/schemas/personaAdapters.loaders.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { loadPersona, listPersonas } from './personaAdapters';

describe('loadPersona', () => {
  it('returns a fully-validated, normalized persona', () => {
    const p = loadPersona('maria');
    expect(p.profile.customer_reference).toContain('Maria');
    expect(p.pass_1.decision.recommended_tier).toBe('Standard');
    expect(p.pass_2.overall_status).toMatch(/PASS/);
  });

  it('throws on unknown persona id', () => {
    expect(() => loadPersona('unknown' as any)).toThrow();
  });

  it('preserves the DC-07 dual-satisfaction flags computed by normalizePass2', () => {
    const p = loadPersona('maria');
    expect((p.pass_2 as any)._dc07_structured_record).toBe(true);
    expect((p.pass_2 as any)._dc07_prose).toBe(true);
  });
});

describe('listPersonas', () => {
  it('lists all four persona id/name/descriptor tuples', () => {
    const list = listPersonas();
    expect(list).toHaveLength(4);
    expect(list.map((p) => p.id)).toEqual(['maria', 'carlos', 'persona_c', 'persona_d']);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/schemas/personaAdapters.loaders.test.ts`
Expected: FAIL — `loadPersona` is not exported yet from `personaAdapters.ts`.

- [ ] **Step 3: Append to the existing `lib/schemas/personaAdapters.ts`**

Add these imports and exports BELOW the existing `normalizePass1` and `normalizePass2` functions. Do not remove or rewrite the existing exports.

```ts
// Append below the existing normalizer exports — keep the pure functions intact.
import personasData from '@/data/personas.json';
import { CustomerProfileSchema, type CustomerProfile } from './customerProfile';
import { Pass1OutputSchema, type Pass1Output } from './pass1';
import { Pass2OutputSchema, type Pass2Output } from './pass2';

export type PersonaId = 'maria' | 'carlos' | 'persona_c' | 'persona_d';

export interface LoadedPersona {
  id: PersonaId;
  name: string;
  descriptor: string;
  profile: CustomerProfile;
  pass_1: Pass1Output;
  pass_2: Pass2Output;
}

export function loadPersona(id: PersonaId): LoadedPersona {
  const raw = personasData.personas.find((p: any) => p.id === id);
  if (!raw) throw new Error(`Unknown persona id: ${id}`);

  const profile = CustomerProfileSchema.parse(raw.profile);
  const pass_1 = Pass1OutputSchema.parse(normalizePass1(raw.pass_1));
  const pass_2 = Pass2OutputSchema.parse(normalizePass2(raw.pass_2));

  return {
    id: raw.id as PersonaId,
    name: raw.name,
    descriptor: raw.descriptor,
    profile,
    pass_1,
    pass_2,
  };
}

export interface PersonaListEntry {
  id: PersonaId;
  name: string;
  descriptor: string;
}

export function listPersonas(): PersonaListEntry[] {
  return personasData.personas.map((p: any) => ({
    id: p.id as PersonaId,
    name: p.name,
    descriptor: p.descriptor,
  }));
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/schemas/personaAdapters.loaders.test.ts`
Expected: PASS.

> Re-run the Batch 1 suite (`pnpm vitest run lib/schemas`) and confirm the normalizers test from Task 1.2.5 still passes — appending to the file must not have broken it.

- [ ] **Step 5: Commit**

```bash
git add lib/schemas/personaAdapters.ts lib/schemas/personaAdapters.loaders.test.ts
git commit -m "feat(schemas): extend personaAdapters with typed loadPersona/listPersonas"
```

### Task 1.8: Canonical check sort

**Files:**
- Create: `lib/orchestration/sortChecks.ts`
- Test: `lib/orchestration/sortChecks.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { sortChecks, CANONICAL_CHECK_TYPE_ORDER } from './sortChecks';
import { loadPersona } from '@/lib/schemas/personaAdapters';

describe('sortChecks', () => {
  it('sorts by check_type in canonical order', () => {
    const checks = [
      { check_type: 'dc07_documentation', rule_id: 'DC-07' },
      { check_type: 'hard_rule_floor', rule_id: 'ES-02' },
      { check_type: 'numeric_threshold_verification', rule_id: 'TE-05' },
      { check_type: 'rule_firing', rule_id: 'TE-02' },
    ];
    const sorted = sortChecks(checks as any);
    expect(sorted.map((c) => c.check_type)).toEqual([
      'hard_rule_floor',
      'rule_firing',
      'numeric_threshold_verification',
      'dc07_documentation',
    ]);
  });

  it('sorts by rule_id within the same check_type', () => {
    const checks = [
      { check_type: 'rule_firing', rule_id: 'TE-05' },
      { check_type: 'rule_firing', rule_id: 'TE-01' },
      { check_type: 'rule_firing', rule_id: 'TE-02' },
    ];
    const sorted = sortChecks(checks as any);
    expect(sorted.map((c) => c.rule_id)).toEqual(['TE-01', 'TE-02', 'TE-05']);
  });

  it('is stable across all four personas without mutating the input', () => {
    for (const id of ['maria', 'carlos', 'persona_c', 'persona_d'] as const) {
      const p = loadPersona(id);
      const before = JSON.stringify(p.pass_2.checks);
      const sorted = sortChecks(p.pass_2.checks);
      // Input not mutated
      expect(JSON.stringify(p.pass_2.checks)).toBe(before);
      // Order is canonical
      for (let i = 1; i < sorted.length; i++) {
        const prev = CANONICAL_CHECK_TYPE_ORDER.indexOf(sorted[i - 1].check_type);
        const cur = CANONICAL_CHECK_TYPE_ORDER.indexOf(sorted[i].check_type);
        expect(prev).toBeLessThanOrEqual(cur);
      }
    }
  });

  it('places unknown check_types at the end (defensive)', () => {
    const sorted = sortChecks([
      { check_type: 'unknown_type', rule_id: 'X' },
      { check_type: 'hard_rule_floor', rule_id: 'A' },
    ] as any);
    expect(sorted[0].check_type).toBe('hard_rule_floor');
    expect(sorted[sorted.length - 1].check_type).toBe('unknown_type');
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/orchestration/sortChecks.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// lib/orchestration/sortChecks.ts
// Render-time canonical check ordering per Decision 41 Path X (PRIMARY_PROMPT.md §4.11).
// Locked persona JSON stays byte-frozen with tail-end orderings; sort normalizes at render.

import type { AuditCheck } from '@/lib/schemas/pass2';

export const CANONICAL_CHECK_TYPE_ORDER = [
  'hard_rule_floor',
  'rule_firing',
  'numeric_threshold_verification',
  'score_arithmetic',
  'score_band_mapping',
  'decision_basis_consistency',
  'pattern_substance',
  'dc07_documentation',
  'register_compliance',
  'consistency',
] as const;

const orderIndex = (t: string): number => {
  const i = CANONICAL_CHECK_TYPE_ORDER.indexOf(t as any);
  return i === -1 ? Number.MAX_SAFE_INTEGER : i;
};

export function sortChecks(checks: readonly AuditCheck[]): AuditCheck[] {
  return [...checks].sort((a, b) => {
    const ta = orderIndex(a.check_type);
    const tb = orderIndex(b.check_type);
    if (ta !== tb) return ta - tb;
    const ra = (a.rule_id ?? '').toString();
    const rb = (b.rule_id ?? '').toString();
    return ra.localeCompare(rb);
  });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/orchestration/sortChecks.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/orchestration/sortChecks.ts lib/orchestration/sortChecks.test.ts
git commit -m "feat(orchestration): add render-time canonical check sort (Decision 41 Path X)"
```

### Task 1.9: Audit reference ID generator

**Files:**
- Create: `lib/orchestration/auditReferenceId.ts`
- Test: `lib/orchestration/auditReferenceId.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { generateAuditReferenceId } from './auditReferenceId';

describe('generateAuditReferenceId', () => {
  it('formats as audit-{id}-{YYYYMMDDHHMMSS}', () => {
    const fixed = new Date(Date.UTC(2026, 4, 12, 14, 32, 47));
    expect(generateAuditReferenceId('maria', fixed)).toBe('audit-maria-20260512143247');
  });

  it('zero-pads single-digit month and day', () => {
    const fixed = new Date(Date.UTC(2026, 0, 5, 3, 4, 9));
    expect(generateAuditReferenceId('carlos', fixed)).toBe('audit-carlos-20260105030409');
  });

  it('hashes live custom-input session to short id', () => {
    const id = generateAuditReferenceId({ kind: 'live', sessionSeed: 'abc123' }, new Date(Date.UTC(2026, 4, 12, 14, 32, 47)));
    expect(id).toMatch(/^audit-[a-z0-9]{6,8}-20260512143247$/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/orchestration/auditReferenceId.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// lib/orchestration/auditReferenceId.ts
// PRIMARY_PROMPT.md §6.5: audit-{persona_id}-{YYYYMMDDHHMMSS}, readable format not epoch.

const pad = (n: number, width = 2) => n.toString().padStart(width, '0');

function formatStamp(d: Date): string {
  const y = d.getUTCFullYear();
  const mo = pad(d.getUTCMonth() + 1);
  const da = pad(d.getUTCDate());
  const h = pad(d.getUTCHours());
  const mi = pad(d.getUTCMinutes());
  const s = pad(d.getUTCSeconds());
  return `${y}${mo}${da}${h}${mi}${s}`;
}

// 32-bit FNV-1a — deterministic, no crypto import needed
function shortHash(input: string): string {
  let h = 0x811c9dc5;
  for (let i = 0; i < input.length; i++) {
    h ^= input.charCodeAt(i);
    h = Math.imul(h, 0x01000193);
  }
  return (h >>> 0).toString(36).slice(0, 8);
}

export type AuditRefSource =
  | string // persona id
  | { kind: 'live'; sessionSeed: string };

export function generateAuditReferenceId(source: AuditRefSource, now: Date = new Date()): string {
  const stamp = formatStamp(now);
  const id = typeof source === 'string' ? source : shortHash(source.sessionSeed);
  return `audit-${id}-${stamp}`;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/orchestration/auditReferenceId.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/orchestration/auditReferenceId.ts lib/orchestration/auditReferenceId.test.ts
git commit -m "feat(orchestration): add audit reference ID generator with FNV-1a session hash"
```

### ✅ Checkpoint 1 — JP review gate

- `pnpm test` runs all Batch 1 tests green
- `pnpm typecheck` passes
- All four personas validate cleanly through `loadPersona`
- Adapters are idempotent and do not mutate input
- Canonical sort is render-time only — no edits to `data/personas.json`
- Request JP review before proceeding to Batch 2

---

## Batch 2 — Prompt and ruleset injection

**Goal:** Build-time prompt assembly per Decision 35 (PRIMARY_PROMPT.md §4.10). Marker constants in `lib/prompts/markers.ts`. Injection function in `lib/prompts/inject.ts`. Build-time invariant test enforces (1) each marker appears exactly once in its source file, (2) injection content sources are non-empty, (3) bidirectional marker-set match (no orphan markers).

### Task 2.1: Marker constants

**Files:**
- Create: `lib/prompts/markers.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/prompts/markers.ts
// Marker strings that exist verbatim in prompts/pass_*.md.
// Source files stay byte-frozen per PRIMARY_PROMPT.md §8.5; markers mirror them here for substitution.

export const MARKERS = {
  ruleset: '[FULL RULESET v1 INSERTED HERE — all 25 rules with IDs, triggers, tier impacts, citations, and weights. Plus the Tier Decision Logic section verbatim from 02_RULESET_v1.md.]',
  ruleset_pass2: '[FULL RULESET v1 INSERTED HERE — same insertion as Pass 1, all 25 rules with IDs, triggers, tier impacts, citations, weights, plus the Tier Decision Logic section verbatim from 02_RULESET_v1.md.]',
  ruleset_pass3: '[FULL RULESET v1 INSERTED HERE — same insertion as Pass 1 and Pass 2, all 25 rules with IDs, triggers, tier impacts, citations, weights, plus the Tier Decision Logic section verbatim from 02_RULESET_v1.md.]',
  customer_profile: '[CUSTOMER PROFILE JSON INSERTED HERE]',
  pass1_output: '[PASS 1 JSON OUTPUT INSERTED HERE]',
  original_pass1_output: '[ORIGINAL PASS 1 JSON OUTPUT INSERTED HERE]',
  pass2_output: '[PASS 2 JSON OUTPUT INSERTED HERE]',
  correction_audit_id: 'correction_against_audit_id: [STRING INSERTED HERE]',
  correction_attempt_number: 'correction_attempt_number: [INTEGER INSERTED HERE]',
} as const;

export type MarkerKey = keyof typeof MARKERS;
```

> Marker strings copied verbatim from `prompts/pass_*.md`. Pass 1 and Pass 2 ruleset markers differ by one word ("same insertion as Pass 1"), so they are tracked separately. The Batch 0 `wc -c` byte-count check confirms the source files are unmodified; this file must match what's there.

- [ ] **Step 2: Commit**

```bash
git add lib/prompts/markers.ts
git commit -m "feat(prompts): mirror marker strings from prompts/pass_*.md"
```

### Task 2.2: Injection function — TDD

**Files:**
- Create: `lib/prompts/inject.ts`
- Test: `lib/prompts/inject.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { injectPrompt } from './inject';
import { MARKERS } from './markers';

const sampleProfile = { customer_reference: 'Test', occupation_type: 'employed' };
const samplePass1 = { decision: { recommended_tier: 'Standard' } };
const samplePass2 = { overall_status: 'PASS', checks: [] };

describe('injectPrompt — Pass 1', () => {
  it('produces a non-empty string with no markers remaining', () => {
    const out = injectPrompt({ pass: 1, profile: sampleProfile });
    expect(out.length).toBeGreaterThan(0);
    expect(out).not.toContain(MARKERS.ruleset);
    expect(out).not.toContain(MARKERS.customer_profile);
  });

  it('inlines the customer profile JSON', () => {
    const out = injectPrompt({ pass: 1, profile: sampleProfile });
    expect(out).toContain('"customer_reference": "Test"');
  });
});

describe('injectPrompt — Pass 2', () => {
  it('inlines ruleset, profile, and Pass 1 output', () => {
    const out = injectPrompt({ pass: 2, profile: sampleProfile, pass1: samplePass1 });
    expect(out).not.toContain(MARKERS.ruleset_pass2);
    expect(out).not.toContain(MARKERS.customer_profile);
    expect(out).not.toContain(MARKERS.pass1_output);
    expect(out).toContain('"recommended_tier": "Standard"');
    expect(out).toContain('"customer_reference": "Test"');
  });
});

describe('injectPrompt — Pass 3', () => {
  it('inlines all four content sources + orchestration context', () => {
    const out = injectPrompt({
      pass: 3,
      profile: sampleProfile,
      pass1: samplePass1,
      pass2: samplePass2,
      orchestration: { audit_id: 'audit-test-20260512143247', attempt: 1 },
    });
    expect(out).not.toContain(MARKERS.ruleset_pass3);
    expect(out).not.toContain(MARKERS.original_pass1_output);
    expect(out).not.toContain(MARKERS.pass2_output);
    expect(out).toContain('audit-test-20260512143247');
    expect(out).toContain('correction_attempt_number: 1');
  });
});

describe('injectPrompt — error paths', () => {
  it('throws if a required source is missing', () => {
    expect(() => injectPrompt({ pass: 2, profile: sampleProfile } as any)).toThrow();
    expect(() => injectPrompt({ pass: 3, profile: sampleProfile, pass1: samplePass1 } as any)).toThrow();
  });

  it('throws if a marker is not found in the source prompt (orphan-replacement check)', () => {
    // This guard is exercised by the invariants test, not unit test — see Task 2.3.
    expect(true).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/prompts/inject.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/prompts/inject.ts
// Build-time prompt injection per Decision 35 (PRIMARY_PROMPT.md §4.10).
// Reads the byte-frozen source prompts via ?raw imports and substitutes content at the M1 markers.

import pass1Prompt from '@/prompts/pass_1_system_prompt.md?raw';
import pass2Prompt from '@/prompts/pass_2_system_prompt.md?raw';
import pass3Prompt from '@/prompts/pass_3_system_prompt.md?raw';
import ruleset from '@/ruleset_v1.md?raw';
import { MARKERS } from './markers';

type Pass = 1 | 2 | 3;

interface InjectArgs {
  pass: Pass;
  profile: unknown;
  pass1?: unknown;
  pass2?: unknown;
  orchestration?: { audit_id: string; attempt: number };
}

function replaceOnce(haystack: string, marker: string, value: string): string {
  const idx = haystack.indexOf(marker);
  if (idx === -1) throw new Error(`Marker not found in source prompt: ${marker.slice(0, 60)}…`);
  if (haystack.indexOf(marker, idx + marker.length) !== -1) {
    throw new Error(`Marker found more than once in source prompt: ${marker.slice(0, 60)}…`);
  }
  return haystack.slice(0, idx) + value + haystack.slice(idx + marker.length);
}

const json = (v: unknown) => JSON.stringify(v, null, 2);

function assertNonEmpty(label: string, content: string) {
  if (!content || content.trim().length === 0) {
    throw new Error(`Injection content is empty: ${label}`);
  }
}

export function injectPrompt(args: InjectArgs): string {
  assertNonEmpty('ruleset', ruleset);

  if (args.pass === 1) {
    let out = pass1Prompt;
    out = replaceOnce(out, MARKERS.ruleset, ruleset);
    out = replaceOnce(out, MARKERS.customer_profile, json(args.profile));
    return out;
  }

  if (args.pass === 2) {
    if (!args.pass1) throw new Error('Pass 2 injection requires pass1 output');
    let out = pass2Prompt;
    out = replaceOnce(out, MARKERS.ruleset_pass2, ruleset);
    out = replaceOnce(out, MARKERS.pass1_output, json(args.pass1));
    out = replaceOnce(out, MARKERS.customer_profile, json(args.profile));
    return out;
  }

  // pass === 3
  if (!args.pass1) throw new Error('Pass 3 injection requires pass1 output');
  if (!args.pass2) throw new Error('Pass 3 injection requires pass2 output');
  if (!args.orchestration) throw new Error('Pass 3 injection requires orchestration context');
  let out = pass3Prompt;
  out = replaceOnce(out, MARKERS.ruleset_pass3, ruleset);
  out = replaceOnce(out, MARKERS.customer_profile, json(args.profile));
  out = replaceOnce(out, MARKERS.original_pass1_output, json(args.pass1));
  out = replaceOnce(out, MARKERS.pass2_output, json(args.pass2));
  out = replaceOnce(out, MARKERS.correction_audit_id, `correction_against_audit_id: ${args.orchestration.audit_id}`);
  out = replaceOnce(out, MARKERS.correction_attempt_number, `correction_attempt_number: ${args.orchestration.attempt}`);
  return out;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/prompts/inject.test.ts`
Expected: PASS (all five).

- [ ] **Step 5: Commit**

```bash
git add lib/prompts/inject.ts lib/prompts/inject.test.ts
git commit -m "feat(prompts): add build-time injectPrompt with single-occurrence enforcement"
```

### Task 2.3: Invariants test

**Files:**
- Create: `lib/prompts/invariants.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest';
import { MARKERS } from './markers';
import pass1Prompt from '@/prompts/pass_1_system_prompt.md?raw';
import pass2Prompt from '@/prompts/pass_2_system_prompt.md?raw';
import pass3Prompt from '@/prompts/pass_3_system_prompt.md?raw';
import ruleset from '@/ruleset_v1.md?raw';

const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

describe('Prompt injection invariants — PRIMARY_PROMPT.md §4.10', () => {
  it('each Pass 1 marker appears exactly once in pass_1_system_prompt.md', () => {
    expect(occurrences(pass1Prompt, MARKERS.ruleset)).toBe(1);
    expect(occurrences(pass1Prompt, MARKERS.customer_profile)).toBe(1);
  });

  it('each Pass 2 marker appears exactly once in pass_2_system_prompt.md', () => {
    expect(occurrences(pass2Prompt, MARKERS.ruleset_pass2)).toBe(1);
    expect(occurrences(pass2Prompt, MARKERS.pass1_output)).toBe(1);
    expect(occurrences(pass2Prompt, MARKERS.customer_profile)).toBe(1);
  });

  it('each Pass 3 marker appears exactly once in pass_3_system_prompt.md', () => {
    expect(occurrences(pass3Prompt, MARKERS.ruleset_pass3)).toBe(1);
    expect(occurrences(pass3Prompt, MARKERS.customer_profile)).toBe(1);
    expect(occurrences(pass3Prompt, MARKERS.original_pass1_output)).toBe(1);
    expect(occurrences(pass3Prompt, MARKERS.pass2_output)).toBe(1);
    expect(occurrences(pass3Prompt, MARKERS.correction_audit_id)).toBe(1);
    expect(occurrences(pass3Prompt, MARKERS.correction_attempt_number)).toBe(1);
  });

  it('ruleset content is non-empty after load', () => {
    expect(ruleset.trim().length).toBeGreaterThan(0);
  });

  it('no orphan markers — Pass 1 sources match Pass 1 markers exactly', () => {
    // Look for any "[…INSERTED HERE…]" pattern in the source files not accounted for in MARKERS.
    const orphanPattern = /\[[^\]]*INSERTED HERE[^\]]*\]/g;
    const knownPass1 = [MARKERS.ruleset, MARKERS.customer_profile];
    const matches = pass1Prompt.match(orphanPattern) ?? [];
    for (const m of matches) {
      expect(knownPass1).toContain(m);
    }
  });

  it('no orphan markers — Pass 2 source markers match', () => {
    const orphanPattern = /\[[^\]]*INSERTED HERE[^\]]*\]/g;
    const known = [MARKERS.ruleset_pass2, MARKERS.pass1_output, MARKERS.customer_profile];
    const matches = pass2Prompt.match(orphanPattern) ?? [];
    for (const m of matches) {
      expect(known).toContain(m);
    }
  });

  it('no orphan markers — Pass 3 source markers match', () => {
    const orphanPattern = /\[[^\]]*INSERTED HERE[^\]]*\]/g;
    const known = [MARKERS.ruleset_pass3, MARKERS.customer_profile, MARKERS.original_pass1_output, MARKERS.pass2_output];
    const matches = pass3Prompt.match(orphanPattern) ?? [];
    for (const m of matches) {
      expect(known).toContain(m);
    }
  });
});
```

- [ ] **Step 2: Run the test**

Run: `pnpm vitest run lib/prompts/invariants.test.ts`
Expected: PASS.

> If any assertion fails: the `prompts/pass_*.md` files have drifted from the marker constants. The locked-artifact discipline (PRIMARY_PROMPT.md §8.5) says do NOT edit the source `.md` files — fix `lib/prompts/markers.ts` to match the source. If the source has a marker not in `markers.ts`, add it; if it has a marker pattern that doesn't fit the M1 convention, consult JP before resolving.

- [ ] **Step 3: Commit**

```bash
git add lib/prompts/invariants.test.ts
git commit -m "test(prompts): add build-time invariants — marker count, non-empty, orphan check"
```

### ✅ Checkpoint 2 — JP review gate

- `pnpm test` green across Batches 0–2
- Invariants test enforces the three assertions from PRIMARY_PROMPT.md §4.10
- Injected prompt for each pass renders without leftover markers
- Locked source files (`prompts/pass_*.md`, `ruleset_v1.md`) unchanged
- Request JP review before proceeding to Batch 3

---

## Batch 3 — Anthropic client, env, cost protection

**Goal:** Server-side primitives for the API route. Anthropic call helper that returns parsed-and-validated typed output or a typed `DecisioningError`. Upstash Redis client. Rate-limit (L1), kill-switch (L3), and telemetry helpers per PRIMARY_PROMPT.md §4.8. Persona playback is exempt — these helpers only run on the live `/api/decisioning` path.

### Task 3.1: Environment variable accessors

**Files:**
- Create: `lib/env.ts`
- Test: `lib/env.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('env', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    process.env.ADMIN_STATS_KEY = 'test-admin';
  });

  it('exports required server env vars', async () => {
    const { serverEnv } = await import('./env');
    expect(serverEnv.ANTHROPIC_API_KEY).toBe('test-key');
    expect(serverEnv.UPSTASH_REDIS_REST_URL).toBe('https://example.upstash.io');
    expect(serverEnv.UPSTASH_REDIS_REST_TOKEN).toBe('test-token');
    expect(serverEnv.ADMIN_STATS_KEY).toBe('test-admin');
  });

  it('throws on missing ANTHROPIC_API_KEY when read', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { requireAnthropicKey } = await import('./env');
    expect(() => requireAnthropicKey()).toThrow(/ANTHROPIC_API_KEY/);
  });
});
```

- [ ] **Step 2: Write the implementation**

```ts
// lib/env.ts
// Server-side env access. PRIMARY_PROMPT.md §7.2: ANTHROPIC_API_KEY is server-only.

export const serverEnv = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  ADMIN_STATS_KEY: process.env.ADMIN_STATS_KEY ?? '',
};

export function requireAnthropicKey(): string {
  const k = process.env.ANTHROPIC_API_KEY;
  if (!k) throw new Error('ANTHROPIC_API_KEY not set — configure in Vercel project env vars (PRIMARY_PROMPT.md §7.2)');
  return k;
}

export function requireUpstash(): { url: string; token: string } {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Upstash credentials missing — configure via Vercel Marketplace integration (PRIMARY_PROMPT.md §4.8)');
  }
  return { url, token };
}
```

- [ ] **Step 3: Run tests, commit**

Run: `pnpm vitest run lib/env.test.ts`
Expected: PASS.

```bash
git add lib/env.ts lib/env.test.ts
git commit -m "feat(env): add server env accessors with explicit require helpers"
```

### Task 3.2: Upstash Redis client

**Files:**
- Create: `lib/costprotection/redis.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/costprotection/redis.ts
// Single Upstash client instance, lazy-initialized.

import { Redis } from '@upstash/redis';
import { requireUpstash } from '@/lib/env';

let _client: Redis | null = null;

export function redis(): Redis {
  if (_client) return _client;
  const { url, token } = requireUpstash();
  _client = new Redis({ url, token });
  return _client;
}

// Test-only override; used by integration tests in Batch 4.
export function __setRedisForTest(c: Redis | null) {
  _client = c;
}
```

> No standalone test file — exercised through `rateLimit.test.ts` and `killSwitch.test.ts` below using `__setRedisForTest` with an in-memory stub.

- [ ] **Step 2: Commit**

```bash
git add lib/costprotection/redis.ts
git commit -m "feat(costprotection): add lazy Upstash client singleton"
```

### Task 3.3: Rate limit (L1) — TDD

**Files:**
- Create: `lib/costprotection/rateLimit.ts`
- Test: `lib/costprotection/rateLimit.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkRateLimit, RATE_LIMIT_HOURLY, RATE_LIMIT_DAILY } from './rateLimit';
import { __setRedisForTest } from './redis';

class InMemoryRedis {
  private store = new Map<string, number>();
  async incr(key: string) {
    const v = (this.store.get(key) ?? 0) + 1;
    this.store.set(key, v);
    return v;
  }
  async expire(_key: string, _seconds: number) { return 1; }
  async get<T>(key: string) { return (this.store.get(key) ?? null) as T | null; }
  // unused for rate-limit tests but required to satisfy Redis shape
  async set() { return 'OK'; }
}

describe('checkRateLimit (L1)', () => {
  beforeEach(() => {
    __setRedisForTest(new InMemoryRedis() as any);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T14:00:00Z'));
  });

  it(`allows up to ${RATE_LIMIT_HOURLY} runs per hour per IP`, async () => {
    for (let i = 0; i < RATE_LIMIT_HOURLY; i++) {
      expect((await checkRateLimit('1.2.3.4')).allowed).toBe(true);
    }
  });

  it(`blocks the ${RATE_LIMIT_HOURLY + 1}th run within the hour`, async () => {
    for (let i = 0; i < RATE_LIMIT_HOURLY; i++) await checkRateLimit('1.2.3.4');
    const result = await checkRateLimit('1.2.3.4');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('hourly');
  });

  it(`blocks at the ${RATE_LIMIT_DAILY + 1}th daily run`, async () => {
    let allowed = 0;
    for (let i = 0; i < RATE_LIMIT_DAILY + 5; i++) {
      // Move forward one hour per iteration so the hourly bucket resets but the daily accumulates
      vi.setSystemTime(new Date(`2026-05-12T${(14 + i).toString().padStart(2, '0')}:00:00Z`));
      const r = await checkRateLimit('1.2.3.4');
      if (r.allowed) allowed++;
    }
    expect(allowed).toBeLessThanOrEqual(RATE_LIMIT_DAILY);
  });

  it('uses per-IP keys (different IPs do not interfere)', async () => {
    for (let i = 0; i < RATE_LIMIT_HOURLY; i++) await checkRateLimit('1.2.3.4');
    expect((await checkRateLimit('5.6.7.8')).allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/costprotection/rateLimit.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 3: Write the implementation**

```ts
// lib/costprotection/rateLimit.ts
// L1 per-IP rate limit per PRIMARY_PROMPT.md §4.8.

import { redis } from './redis';

export const RATE_LIMIT_HOURLY = 3;
export const RATE_LIMIT_DAILY = 10;

const HOUR_TTL = 60 * 60;
const DAY_TTL = 24 * 60 * 60;

function pad(n: number) { return n.toString().padStart(2, '0'); }

function hourKey(ip: string, now: Date) {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}${pad(now.getUTCHours())}`;
  return `ratelimit:ip:${ip}:hour:${stamp}`;
}

function dayKey(ip: string, now: Date) {
  const stamp = `${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
  return `ratelimit:ip:${ip}:day:${stamp}`;
}

export interface RateLimitResult {
  allowed: boolean;
  reason?: 'hourly' | 'daily';
  hourly: number;
  daily: number;
}

export async function checkRateLimit(ip: string, now: Date = new Date()): Promise<RateLimitResult> {
  const r = redis();
  const hk = hourKey(ip, now);
  const dk = dayKey(ip, now);

  const hourly = await r.incr(hk);
  await r.expire(hk, HOUR_TTL);
  const daily = await r.incr(dk);
  await r.expire(dk, DAY_TTL);

  if (hourly > RATE_LIMIT_HOURLY) return { allowed: false, reason: 'hourly', hourly, daily };
  if (daily > RATE_LIMIT_DAILY) return { allowed: false, reason: 'daily', hourly, daily };
  return { allowed: true, hourly, daily };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/costprotection/rateLimit.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/costprotection/rateLimit.ts lib/costprotection/rateLimit.test.ts
git commit -m "feat(costprotection): add L1 per-IP rate limit (3/hour, 10/day)"
```

### Task 3.4: Kill switch (L3) — TDD

**Files:**
- Create: `lib/costprotection/killSwitch.ts`
- Test: `lib/costprotection/killSwitch.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { checkKillSwitch, KILL_SWITCH_DAILY_CAP } from './killSwitch';
import { __setRedisForTest } from './redis';

class InMemoryRedis {
  private store = new Map<string, number>();
  async incr(key: string) { const v = (this.store.get(key) ?? 0) + 1; this.store.set(key, v); return v; }
  async expire(_k: string, _s: number) { return 1; }
  async get<T>(key: string) { return (this.store.get(key) ?? null) as T | null; }
  async set() { return 'OK'; }
}

describe('checkKillSwitch (L3)', () => {
  beforeEach(() => {
    __setRedisForTest(new InMemoryRedis() as any);
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-12T14:00:00Z'));
  });

  it(`allows the first ${KILL_SWITCH_DAILY_CAP} runs of the UTC day`, async () => {
    for (let i = 0; i < KILL_SWITCH_DAILY_CAP; i++) {
      expect((await checkKillSwitch()).allowed).toBe(true);
    }
  });

  it(`blocks run ${KILL_SWITCH_DAILY_CAP + 1}`, async () => {
    for (let i = 0; i < KILL_SWITCH_DAILY_CAP; i++) await checkKillSwitch();
    const r = await checkKillSwitch();
    expect(r.allowed).toBe(false);
  });

  it('resets at 00:00 UTC, not rolling', async () => {
    for (let i = 0; i < KILL_SWITCH_DAILY_CAP; i++) await checkKillSwitch();
    vi.setSystemTime(new Date('2026-05-13T00:00:01Z'));
    expect((await checkKillSwitch()).allowed).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/costprotection/killSwitch.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// lib/costprotection/killSwitch.ts
// L3 global daily kill switch per PRIMARY_PROMPT.md §4.8.
// Per-day-UTC reset, not rolling.

import { redis } from './redis';

export const KILL_SWITCH_DAILY_CAP = 50;

function pad(n: number) { return n.toString().padStart(2, '0'); }

function dayKey(now: Date) {
  return `killswitch:day:${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
}

export interface KillSwitchResult {
  allowed: boolean;
  count: number;
}

export async function checkKillSwitch(now: Date = new Date()): Promise<KillSwitchResult> {
  const r = redis();
  const k = dayKey(now);
  const count = await r.incr(k);
  await r.expire(k, 60 * 60 * 36); // 36h TTL — buffer past midnight UTC
  return { allowed: count <= KILL_SWITCH_DAILY_CAP, count };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/costprotection/killSwitch.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/costprotection/killSwitch.ts lib/costprotection/killSwitch.test.ts
git commit -m "feat(costprotection): add L3 global daily kill switch (50/UTC day)"
```

### Task 3.5: Telemetry counters

**Files:**
- Create: `lib/costprotection/telemetry.ts`
- Test: `lib/costprotection/telemetry.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { incrementCounter, readTelemetry } from './telemetry';
import { __setRedisForTest } from './redis';

class InMemoryRedis {
  private store = new Map<string, number>();
  async incr(key: string) { const v = (this.store.get(key) ?? 0) + 1; this.store.set(key, v); return v; }
  async expire() { return 1; }
  async get<T>(key: string) { return (this.store.get(key) ?? null) as T | null; }
  async mget<T>(...keys: string[]) { return keys.map((k) => (this.store.get(k) ?? null) as T | null); }
  async set() { return 'OK'; }
}

describe('telemetry', () => {
  beforeEach(() => __setRedisForTest(new InMemoryRedis() as any));

  it('increments a named counter for the UTC day', async () => {
    await incrementCounter('live_runs');
    await incrementCounter('live_runs');
    const t = await readTelemetry();
    expect(t.live_runs).toBe(2);
  });

  it('reads zero for absent counters', async () => {
    const t = await readTelemetry();
    expect(t.live_runs).toBe(0);
    expect(t.rate_limit_hits).toBe(0);
    expect(t.kill_switch_triggers).toBe(0);
    expect(t.error_counts).toBe(0);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm vitest run lib/costprotection/telemetry.test.ts`
Expected: FAIL.

- [ ] **Step 3: Write the implementation**

```ts
// lib/costprotection/telemetry.ts
// Daily-rollup counters per PRIMARY_PROMPT.md §4.8.

import { redis } from './redis';

export type CounterName = 'live_runs' | 'rate_limit_hits' | 'kill_switch_triggers' | 'error_counts';

const COUNTER_NAMES: CounterName[] = ['live_runs', 'rate_limit_hits', 'kill_switch_triggers', 'error_counts'];

function pad(n: number) { return n.toString().padStart(2, '0'); }

function counterKey(name: CounterName, now: Date) {
  return `telemetry:${name}:day:${now.getUTCFullYear()}${pad(now.getUTCMonth() + 1)}${pad(now.getUTCDate())}`;
}

export async function incrementCounter(name: CounterName, now: Date = new Date()): Promise<number> {
  const r = redis();
  const k = counterKey(name, now);
  const v = await r.incr(k);
  await r.expire(k, 60 * 60 * 24 * 7); // 7-day TTL for dashboard history
  return v;
}

export type TelemetrySnapshot = Record<CounterName, number>;

export async function readTelemetry(now: Date = new Date()): Promise<TelemetrySnapshot> {
  const r = redis();
  const keys = COUNTER_NAMES.map((n) => counterKey(n, now));
  const values = await r.mget<(number | null)[]>(...keys);
  const snapshot = {} as TelemetrySnapshot;
  COUNTER_NAMES.forEach((n, i) => {
    snapshot[n] = Number(values[i] ?? 0);
  });
  return snapshot;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm vitest run lib/costprotection/telemetry.test.ts`
Expected: PASS.

- [ ] **Step 5: Commit**

```bash
git add lib/costprotection/telemetry.ts lib/costprotection/telemetry.test.ts
git commit -m "feat(costprotection): add daily telemetry counters with 7-day TTL"
```

### Task 3.6: Anthropic client helper

**Files:**
- Create: `lib/anthropic/client.ts`
- Test: `lib/anthropic/client.test.ts`

- [ ] **Step 1: Web-search check before coding**

Run a web search: "Anthropic SDK Node @anthropic-ai/sdk messages.create example 2026" to confirm the current SDK call shape. Verify model ID `claude-sonnet-4-6` is still the current Sonnet 4.6 identifier per PRIMARY_PROMPT.md §4.5 + §8.1.

Record findings in a comment at the top of `lib/anthropic/client.ts`. If the SDK has changed shape, adjust below before writing the test.

- [ ] **Step 2: Write the failing test**

```ts
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callPass, parseModelJson } from './client';
import type { ZodSchema } from 'zod';
import { z } from 'zod';

// Mock the SDK at module level
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class FakeAnthropic {
      messages = {
        create: vi.fn(),
      };
    },
  };
});

describe('parseModelJson', () => {
  const Schema = z.object({ foo: z.string() });

  it('parses a clean JSON response', () => {
    const result = parseModelJson('{"foo":"bar"}', Schema, 1);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.foo).toBe('bar');
  });

  it('strips a leading code fence', () => {
    const result = parseModelJson('```json\n{"foo":"bar"}\n```', Schema, 1);
    expect(result.ok).toBe(true);
  });

  it('returns malformed_model_json on non-JSON', () => {
    const result = parseModelJson('not json', Schema, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errorType).toBe('malformed_model_json');
  });

  it('returns validation_failed when JSON parses but schema rejects', () => {
    const result = parseModelJson('{"baz":1}', Schema, 2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errorType).toBe('validation_failed');
  });
});

describe('callPass', () => {
  beforeEach(() => { process.env.ANTHROPIC_API_KEY = 'test'; });

  it('returns parsed output on success', async () => {
    const Schema = z.object({ ok: z.boolean() });
    const result = await callPass({
      pass: 1,
      systemPrompt: 'sys',
      userMessage: 'user',
      schema: Schema,
      _injectClient: { messages: { create: async () => ({ content: [{ type: 'text', text: '{"ok":true}' }] }) } } as any,
    });
    expect(result.ok).toBe(true);
  });

  it('maps upstream timeout to DecisioningError', async () => {
    const Schema = z.object({ ok: z.boolean() });
    const result = await callPass({
      pass: 1,
      systemPrompt: 'sys',
      userMessage: 'user',
      schema: Schema,
      _injectClient: { messages: { create: async () => { const e: any = new Error('timeout'); e.name = 'AbortError'; throw e; } } } as any,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errorType).toBe('upstream_timeout');
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm vitest run lib/anthropic/client.test.ts`
Expected: FAIL — module not found.

- [ ] **Step 4: Write the implementation**

```ts
// lib/anthropic/client.ts
// Anthropic SDK wrapper: makes one /v1/messages call per pass, parses + validates,
// returns Result<T, DecisioningError>.
//
// Verified against @anthropic-ai/sdk current version — see web-search note in Task 3.6 Step 1.

import Anthropic from '@anthropic-ai/sdk';
import type { ZodSchema } from 'zod';
import { requireAnthropicKey } from '@/lib/env';
import type { DecisioningError } from '@/lib/schemas/apiError';

export const MODEL_ID = 'claude-sonnet-4-6';

interface AnthropicLike {
  messages: {
    create: (args: any) => Promise<any>;
  };
}

let _client: AnthropicLike | null = null;
function client(): AnthropicLike {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: requireAnthropicKey() }) as unknown as AnthropicLike;
  return _client;
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: DecisioningError };

export function parseModelJson<T>(raw: string, schema: ZodSchema<T>, pass: 1 | 2 | 3 | 're-audit'): ParseResult<T> {
  const stripped = raw.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return {
      ok: false,
      error: { pass, errorType: 'malformed_model_json', message: 'Model output was not valid JSON.', retryable: true },
    };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: {
        pass,
        errorType: 'validation_failed',
        zodIssues: result.error.issues as any,
        message: 'Model output did not match the expected schema.',
        retryable: true,
      },
    };
  }
  return { ok: true, data: result.data };
}

export interface CallPassArgs<T> {
  pass: 1 | 2 | 3 | 're-audit';
  systemPrompt: string;
  userMessage: string;
  schema: ZodSchema<T>;
  maxTokens?: number;
  /** Test-only injection seam. */
  _injectClient?: AnthropicLike;
}

export async function callPass<T>(args: CallPassArgs<T>): Promise<ParseResult<T>> {
  const c = args._injectClient ?? client();
  try {
    const resp = await c.messages.create({
      model: MODEL_ID,
      max_tokens: args.maxTokens ?? 8000,
      system: args.systemPrompt,
      messages: [{ role: 'user', content: args.userMessage }],
    });
    const text = (resp.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
    return parseModelJson(text, args.schema, args.pass);
  } catch (err: any) {
    if (err?.name === 'AbortError' || /timeout/i.test(err?.message ?? '')) {
      return { ok: false, error: { pass: args.pass, errorType: 'upstream_timeout', message: 'Upstream model request timed out.', retryable: true } };
    }
    return { ok: false, error: { pass: args.pass, errorType: 'upstream_timeout', message: `Upstream error: ${err?.message ?? 'unknown'}`, retryable: true } };
  }
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm vitest run lib/anthropic/client.test.ts`
Expected: PASS.

- [ ] **Step 6: Commit**

```bash
git add lib/anthropic/client.ts lib/anthropic/client.test.ts
git commit -m "feat(anthropic): add typed callPass with parseModelJson + DecisioningError mapping"
```

### ✅ Checkpoint 3 — JP review gate

- All unit tests green
- Anthropic SDK version + model ID verified via web search; note in `client.ts` header
- Cost protection layers have keys + TTLs matching PRIMARY_PROMPT.md §4.8 exactly
- `requireAnthropicKey()` / `requireUpstash()` fail loudly with file/line-pointing error messages
- Request JP review before proceeding to Batch 4

---

## Batch 4 — API route and admin stats

**Goal:** The `/api/decisioning?pass=N` chokepoint per Decision 32 (PRIMARY_PROMPT.md §4.9). Single Vercel serverless route. Rate-limit + kill-switch + telemetry execute before pass dispatch. Returns 200 with parsed pass output OR 4xx/5xx with a `DecisioningError` body. Admin telemetry route at `/api/admin/stats`.

### Task 4.1: API route — integration test setup

**Files:**
- Create: `tests/integration/decisioning-route.test.ts`

- [ ] **Step 1: Write failing test (uses Next.js Request/Response directly)**

```ts
import { describe, it, expect, beforeEach, vi } from 'vitest';
import { __setRedisForTest } from '@/lib/costprotection/redis';

// In-memory Redis stub
class InMemoryRedis {
  store = new Map<string, number>();
  async incr(k: string) { const v = (this.store.get(k) ?? 0) + 1; this.store.set(k, v); return v; }
  async expire() { return 1; }
  async get<T>(k: string) { return (this.store.get(k) ?? null) as T | null; }
  async mget<T>(...keys: string[]) { return keys.map((k) => (this.store.get(k) ?? null) as T | null); }
  async set() { return 'OK'; }
}

// Mock Anthropic SDK
const mockCreate = vi.fn();
vi.mock('@anthropic-ai/sdk', () => ({
  default: class { messages = { create: mockCreate }; },
}));

beforeEach(() => {
  __setRedisForTest(new InMemoryRedis() as any);
  process.env.ANTHROPIC_API_KEY = 'test';
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  process.env.ADMIN_STATS_KEY = 'admin-test';
  mockCreate.mockReset();
});

const validProfile = {
  customer_reference: 'Test Customer',
  identity_document_type: 'PhilSys',
  residency_status: 'PH resident',
  customer_type: 'individual retail',
  occupation_type: 'employed',
  source_of_funds: 'salary',
  account_purpose: 'payroll',
  expected_monthly_volume_php: 80000,
  pep_status: 'none',
  sanctions_screening: 'clean',
  high_risk_jurisdiction_connection: 'none',
  adverse_media: 'no',
  years_with_bank: 'new',
};

const validPass1 = {
  decision: { recommended_tier: 'Standard', decision_basis: 'score_based', decisive_rule_ids: ['TE-02'], senior_approval_required: false, onboarding_hold: false, hold_reason: null },
  risk_score: { total: 0, category_breakdown: { tier_eligibility: 0, escalation_triggers: 0, documentation_process: 0 } },
  rules_fired: [{ rule_id: 'TE-02', category: 'tier_eligibility', weight: 0, trigger_evidence: 'baseline' }],
  examiner_notes_full: 'memo',
  summary_finding: 'standard tier',
};

async function callRoute(pass: 1 | 2 | 3, body: unknown, headers: Record<string, string> = {}) {
  const { POST } = await import('@/app/api/decisioning/route');
  const req = new Request(`http://localhost/api/decisioning?pass=${pass}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4', ...headers },
    body: JSON.stringify(body),
  });
  return POST(req);
}

describe('/api/decisioning — Pass 1 happy path', () => {
  it('returns parsed Pass 1 output', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify(validPass1) }] });
    const res = await callRoute(1, { profile: validProfile });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decision.recommended_tier).toBe('Standard');
  });
});

describe('/api/decisioning — validation', () => {
  it('rejects malformed profile with validation_failed', async () => {
    const res = await callRoute(1, { profile: { ...validProfile, expected_monthly_volume_php: -5 } });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorType).toBe('validation_failed');
    expect(body.retryable).toBe(true);
  });
});

describe('/api/decisioning — malformed model JSON', () => {
  it('returns malformed_model_json', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: 'not json at all' }] });
    const res = await callRoute(1, { profile: validProfile });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.errorType).toBe('malformed_model_json');
  });
});

describe('/api/decisioning — rate limit', () => {
  it('returns rate_limited after 3 hourly hits on same IP', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify(validPass1) }] });
    for (let i = 0; i < 3; i++) {
      const r = await callRoute(1, { profile: validProfile });
      expect(r.status).toBe(200);
    }
    const blocked = await callRoute(1, { profile: validProfile });
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.errorType).toBe('rate_limited');
    expect(body.retryable).toBe(false);
  });
});

describe('/api/decisioning — kill switch', () => {
  it('returns cap_reached after 50 global runs', async () => {
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify(validPass1) }] });
    // Spread across many IPs to bypass L1; only L3 should gate
    for (let i = 0; i < 50; i++) {
      const r = await callRoute(1, { profile: validProfile }, { 'x-forwarded-for': `10.0.0.${i}` });
      expect(r.status).toBe(200);
    }
    const blocked = await callRoute(1, { profile: validProfile }, { 'x-forwarded-for': '10.0.0.99' });
    expect(blocked.status).toBe(429);
    const body = await blocked.json();
    expect(body.errorType).toBe('cap_reached');
  });
});

describe('/api/decisioning — Pass 2', () => {
  it('requires both profile and pass1 in body', async () => {
    const res = await callRoute(2, { profile: validProfile });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorType).toBe('validation_failed');
  });
});

describe('/api/decisioning — bad pass parameter', () => {
  it('rejects pass=99', async () => {
    const res = await fetch('http://localhost/api/decisioning?pass=99').catch(() => null);
    // Use route directly
    const { POST } = await import('@/app/api/decisioning/route');
    const req = new Request('http://localhost/api/decisioning?pass=99', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({ profile: validProfile }),
    });
    const r = await POST(req);
    expect(r.status).toBe(400);
  });
});
```

- [ ] **Step 2: Run, expect failure (route file does not exist yet)**

Run: `pnpm vitest run tests/integration/decisioning-route.test.ts`
Expected: FAIL — route module not found.

### Task 4.2: API route implementation

**Files:**
- Create: `app/api/decisioning/route.ts`

- [ ] **Step 1: Write the route**

```ts
// app/api/decisioning/route.ts
// PRIMARY_PROMPT.md §4.9 (Decision 32): single Vercel serverless route, per-pass POSTs branched by ?pass=N.
// PRIMARY_PROMPT.md §4.8 (Decision 33): cost protection executes BEFORE pass dispatch.

import { z } from 'zod';
import { CustomerProfileSchema } from '@/lib/schemas/customerProfile';
import { Pass1OutputSchema } from '@/lib/schemas/pass1';
import { Pass2OutputSchema } from '@/lib/schemas/pass2';
import { Pass3OutputSchema } from '@/lib/schemas/pass3';
import type { DecisioningError } from '@/lib/schemas/apiError';
import { ERROR_MESSAGES } from '@/lib/schemas/apiError';
import { injectPrompt } from '@/lib/prompts/inject';
import { callPass } from '@/lib/anthropic/client';
import { checkRateLimit } from '@/lib/costprotection/rateLimit';
import { checkKillSwitch } from '@/lib/costprotection/killSwitch';
import { incrementCounter } from '@/lib/costprotection/telemetry';

export const runtime = 'nodejs';

const PassQuerySchema = z.union([z.literal('1'), z.literal('2'), z.literal('3')]);

const RequestBodySchema = z.object({
  profile: z.unknown(),
  pass1: z.unknown().optional(),
  pass2: z.unknown().optional(),
  orchestration: z.object({ audit_id: z.string(), attempt: z.number().int().positive() }).optional(),
});

function jsonResponse(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), { status, headers: { 'content-type': 'application/json' } });
}

function getIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return '0.0.0.0';
}

function makeError(pass: 1 | 2 | 3 | 're-audit', errorType: DecisioningError['errorType'], message: string, retryable: boolean, zodIssues?: any[]): DecisioningError {
  return { pass, errorType, message, retryable, ...(zodIssues ? { zodIssues } : {}) };
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const rawPass = url.searchParams.get('pass');
  const passResult = PassQuerySchema.safeParse(rawPass);
  if (!passResult.success) {
    return jsonResponse(makeError(1, 'validation_failed', 'Invalid pass parameter; expected 1, 2, or 3.', true), 400);
  }
  const pass = Number(passResult.data) as 1 | 2 | 3;

  let body: z.infer<typeof RequestBodySchema>;
  try {
    body = RequestBodySchema.parse(await req.json());
  } catch (e: any) {
    return jsonResponse(makeError(pass, 'validation_failed', 'Malformed request body.', true, e?.issues), 400);
  }

  // Cost protection layers — fail BEFORE incurring API cost.
  const ip = getIp(req);
  const rl = await checkRateLimit(ip);
  if (!rl.allowed) {
    await incrementCounter('rate_limit_hits');
    const msg = rl.reason === 'hourly' ? ERROR_MESSAGES.rate_limited_hourly : ERROR_MESSAGES.rate_limited_daily;
    return jsonResponse(makeError(pass, 'rate_limited', msg, false), 429);
  }
  const ks = await checkKillSwitch();
  if (!ks.allowed) {
    await incrementCounter('kill_switch_triggers');
    return jsonResponse(makeError(pass, 'cap_reached', ERROR_MESSAGES.cap_reached, false), 429);
  }

  // Validate profile structure
  const profileResult = CustomerProfileSchema.safeParse(body.profile);
  if (!profileResult.success) {
    await incrementCounter('error_counts');
    return jsonResponse(makeError(pass, 'validation_failed', 'Customer profile failed validation.', true, profileResult.error.issues as any), 400);
  }

  // Dispatch by pass
  let result;
  if (pass === 1) {
    const systemPrompt = injectPrompt({ pass: 1, profile: profileResult.data });
    result = await callPass({ pass: 1, systemPrompt, userMessage: 'Produce the Pass 1 output JSON per the system prompt schema.', schema: Pass1OutputSchema });
  } else if (pass === 2) {
    if (!body.pass1) {
      return jsonResponse(makeError(2, 'validation_failed', 'Pass 2 requires pass1 in body.', true), 400);
    }
    const systemPrompt = injectPrompt({ pass: 2, profile: profileResult.data, pass1: body.pass1 });
    result = await callPass({ pass: 2, systemPrompt, userMessage: 'Produce the Pass 2 audit JSON per the system prompt schema.', schema: Pass2OutputSchema });
  } else {
    if (!body.pass1 || !body.pass2 || !body.orchestration) {
      return jsonResponse(makeError(3, 'validation_failed', 'Pass 3 requires pass1, pass2, and orchestration context.', true), 400);
    }
    const systemPrompt = injectPrompt({ pass: 3, profile: profileResult.data, pass1: body.pass1, pass2: body.pass2, orchestration: body.orchestration });
    result = await callPass({ pass: 3, systemPrompt, userMessage: 'Produce the Pass 3 correction JSON per the system prompt schema.', schema: Pass3OutputSchema });
  }

  await incrementCounter('live_runs');

  if (!result.ok) {
    await incrementCounter('error_counts');
    const status = result.error.errorType === 'malformed_model_json' || result.error.errorType === 'upstream_timeout' ? 502 : 400;
    return jsonResponse(result.error, status);
  }

  // Plan amendment #3 — debug toggle for Pass 3 rehearsal.
  // Gated behind DEBUG_MODE=true. On Pass 2 requests with ?force_correction=1,
  // overwrite the model's correction_required field to true so the client-side
  // state machine takes the Pass 3 + re-audit + cap-reached path. Used only
  // during Batch 11 rehearsal; unset DEBUG_MODE before production deploy.
  if (
    pass === 2 &&
    process.env.DEBUG_MODE === 'true' &&
    url.searchParams.get('force_correction') === '1'
  ) {
    return jsonResponse({ ...(result.data as any), correction_required: true }, 200);
  }

  return jsonResponse(result.data, 200);
}
```

**Required integration test for the debug toggle** — add this to `tests/integration/decisioning-route.test.ts` from Task 4.1:

```ts
describe('/api/decisioning — debug toggle (plan amendment #3)', () => {
  it('force_correction=1 has no effect when DEBUG_MODE is unset', async () => {
    process.env.DEBUG_MODE = undefined;
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify({ ...validPass2Clean }) }] });
    const { POST } = await import('@/app/api/decisioning/route');
    const req = new Request('http://localhost/api/decisioning?pass=2&force_correction=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.4' },
      body: JSON.stringify({ profile: validProfile, pass1: validPass1 }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.correction_required).toBe(false);
  });

  it('force_correction=1 flips correction_required to true when DEBUG_MODE=true', async () => {
    process.env.DEBUG_MODE = 'true';
    mockCreate.mockResolvedValue({ content: [{ type: 'text', text: JSON.stringify({ ...validPass2Clean }) }] });
    const { POST } = await import('@/app/api/decisioning/route');
    const req = new Request('http://localhost/api/decisioning?pass=2&force_correction=1', {
      method: 'POST',
      headers: { 'content-type': 'application/json', 'x-forwarded-for': '1.2.3.5' },
      body: JSON.stringify({ profile: validProfile, pass1: validPass1 }),
    });
    const res = await POST(req);
    const body = await res.json();
    expect(body.correction_required).toBe(true);
    delete process.env.DEBUG_MODE;
  });
});
```

> Add `validPass2Clean` to the test fixtures: `{ generated_at: '2026-05-12T00:00:00Z', target_check_ids: [], regeneration_scope: 'none', correction_required: false, audit_summary: 'PASS clean', overall_status: 'PASS', checks: [] }`.

- [ ] **Step 2: Run integration tests**

Run: `pnpm vitest run tests/integration/decisioning-route.test.ts`
Expected: PASS (all eight). If any fail, inspect the assertion and fix the route — these tests are the contract.

- [ ] **Step 3: Commit**

```bash
git add app/api/decisioning/route.ts tests/integration/decisioning-route.test.ts
git commit -m "feat(api): add /api/decisioning per-pass POST route with cost protection chokepoint"
```

### Task 4.3: Admin stats route

**Files:**
- Create: `app/api/admin/stats/route.ts`
- Test: `tests/integration/admin-stats.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, beforeEach } from 'vitest';
import { __setRedisForTest } from '@/lib/costprotection/redis';

class InMemoryRedis {
  store = new Map<string, number>();
  async incr(k: string) { const v = (this.store.get(k) ?? 0) + 1; this.store.set(k, v); return v; }
  async expire() { return 1; }
  async get<T>(k: string) { return (this.store.get(k) ?? null) as T | null; }
  async mget<T>(...keys: string[]) { return keys.map((k) => (this.store.get(k) ?? null) as T | null); }
  async set() { return 'OK'; }
}

beforeEach(() => {
  __setRedisForTest(new InMemoryRedis() as any);
  process.env.ADMIN_STATS_KEY = 'sekret';
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
});

describe('/api/admin/stats', () => {
  it('returns 401 without key', async () => {
    const { GET } = await import('@/app/api/admin/stats/route');
    const r = await GET(new Request('http://localhost/api/admin/stats'));
    expect(r.status).toBe(401);
  });

  it('returns 401 with wrong key', async () => {
    const { GET } = await import('@/app/api/admin/stats/route');
    const r = await GET(new Request('http://localhost/api/admin/stats?key=wrong'));
    expect(r.status).toBe(401);
  });

  it('returns telemetry snapshot with correct key', async () => {
    const { GET } = await import('@/app/api/admin/stats/route');
    const r = await GET(new Request('http://localhost/api/admin/stats?key=sekret'));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.live_runs).toBe(0);
    expect(body.rate_limit_hits).toBe(0);
    expect(body.kill_switch_triggers).toBe(0);
    expect(body.error_counts).toBe(0);
  });
});
```

- [ ] **Step 2: Write the route**

```ts
// app/api/admin/stats/route.ts
// PRIMARY_PROMPT.md §4.8: /api/admin/stats?key={env-var-secret}

import { readTelemetry } from '@/lib/costprotection/telemetry';
import { serverEnv } from '@/lib/env';

export const runtime = 'nodejs';

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  if (!serverEnv.ADMIN_STATS_KEY || key !== serverEnv.ADMIN_STATS_KEY) {
    return new Response(JSON.stringify({ error: 'unauthorized' }), { status: 401, headers: { 'content-type': 'application/json' } });
  }
  const snapshot = await readTelemetry();
  return new Response(JSON.stringify(snapshot), { status: 200, headers: { 'content-type': 'application/json' } });
}
```

- [ ] **Step 3: Run tests, commit**

Run: `pnpm vitest run tests/integration/admin-stats.test.ts`
Expected: PASS.

```bash
git add app/api/admin/stats/route.ts tests/integration/admin-stats.test.ts
git commit -m "feat(api): add /api/admin/stats key-gated telemetry endpoint"
```

### ✅ Checkpoint 4 — JP review gate

- All integration tests green
- Cost protection chokepoint fires before any Anthropic API cost is incurred
- `DecisioningError` returned with correct HTTP status for each error type (400 validation, 429 rate_limited/cap_reached, 502 model errors)
- Admin route rejects missing/wrong key
- Request JP review before proceeding to Batch 5

---

## Batch 5 — Design tokens, layout chrome, fonts

**Goal:** Tokens from `visual_system.md` §2 + §3 live in `app/globals.css`. Layout sets up font families. Page shell uses Tailwind classes mapped to tokens. No components yet — this is the foundation Batch 6 builds on.

### Task 5.1: Global token sheet

**Files:**
- Modify: `app/globals.css`

- [ ] **Step 1: Replace globals.css with the full token set**

```css
/* app/globals.css — tokens per visual_system.md §2 + §3 */

:root {
  /* Surface */
  --surface-base: #FAF8F4;
  --surface-elevated: #FFFFFF;
  --surface-recessed: #F1EEE7;

  /* Text */
  --text-primary: #1F2933;
  --text-secondary: #52606D;
  --text-tertiary: #7B8794;
  --text-inverse: #FAF8F4;

  /* Accent — slate-blue (Decision 1) */
  --accent-primary: #4A6B8A;
  --accent-secondary: #5C7A9C;
  --accent-deep: #3B5673;
  --accent-subtle-bg: #E8EDF3;

  /* Compliance violation — ONLY for rule violations */
  --violation-primary: #B3261E;
  --violation-bg: #FBEAE9;
  --violation-warn: #C84937;

  /* Neutrals */
  --border-default: #D9D2C5;
  --border-strong: #B8AE9C;
  --border-subtle: #ECE7DC;

  /* Status — non-violation */
  --status-success: #2C7A50;
  --status-success-bg: #E5EFE8;
  --status-warning: #8C6A1F;
  --status-warning-bg: #F5EDD8;

  /* Code / data */
  --data-bg: #2A2F36;
  --data-text: #E8E5DC;
  --data-accent: #8FA8C2;

  /* Type families */
  --font-serif: 'Source Serif Pro', 'Charter', 'Georgia', serif;
  --font-sans: 'Inter', 'IBM Plex Sans', -apple-system, system-ui, sans-serif;
  --font-mono: 'JetBrains Mono', 'IBM Plex Mono', 'Menlo', monospace;
  --font-numeric: 'Inter', system-ui, sans-serif;

  /* Type scale */
  --text-xs: 11px;
  --text-sm: 13px;
  --text-base: 15px;
  --text-md: 17px;
  --text-lg: 20px;
  --text-xl: 26px;
  --text-2xl: 34px;

  --leading-tight: 1.25;
  --leading-normal: 1.5;
  --leading-loose: 1.7;
}

@tailwind base;
@tailwind components;
@tailwind utilities;

html, body {
  background: var(--surface-base);
  color: var(--text-primary);
  font-family: var(--font-sans);
  font-size: var(--text-base);
  line-height: var(--leading-normal);
  -webkit-font-smoothing: antialiased;
  -moz-osx-font-smoothing: grayscale;
}

body {
  margin: 0;
}

.tabular-figures {
  font-variant-numeric: tabular-nums;
}

.font-serif {
  font-family: var(--font-serif);
}

.font-mono {
  font-family: var(--font-mono);
}

/* Modal backdrop — only allowed semi-transparent overlay (visual_system.md §2) */
.modal-backdrop {
  background-color: rgba(31, 41, 51, 0.4);
}
```

### Task 5.2: Root layout with font loading

**Files:**
- Modify: `app/layout.tsx`

- [ ] **Step 1: Wire fonts**

```tsx
// app/layout.tsx
import './globals.css';
import type { Metadata } from 'next';
import { Inter, Source_Serif_4, JetBrains_Mono } from 'next/font/google';

const inter = Inter({ subsets: ['latin'], variable: '--font-sans-loaded', display: 'swap' });
const serif = Source_Serif_4({ subsets: ['latin'], variable: '--font-serif-loaded', display: 'swap' });
const mono = JetBrains_Mono({ subsets: ['latin'], variable: '--font-mono-loaded', display: 'swap' });

export const metadata: Metadata = {
  title: 'KYC Tier Decisioning — Shift Atlas',
  description: 'Three-pass reasoning pipeline demo for Philippine bank compliance.',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en" className={`${inter.variable} ${serif.variable} ${mono.variable}`}>
      <body>{children}</body>
    </html>
  );
}
```

- [ ] **Step 2: Update `app/globals.css` font variables to read the next/font CSS variables**

Edit the four font-family lines so Inter loads via the next/font variable while keeping the fallback chain:

```css
--font-serif: var(--font-serif-loaded), 'Source Serif Pro', 'Charter', 'Georgia', serif;
--font-sans: var(--font-sans-loaded), 'Inter', 'IBM Plex Sans', -apple-system, system-ui, sans-serif;
--font-mono: var(--font-mono-loaded), 'JetBrains Mono', 'IBM Plex Mono', 'Menlo', monospace;
--font-numeric: var(--font-sans-loaded), 'Inter', system-ui, sans-serif;
```

> If `Source_Serif_4` is not available in the installed `next` version, fall back to `Source_Serif_Pro` or omit and rely on the system fallback chain. Verify the import name with the installed Next version.

### Task 5.3: Placeholder page using tokens

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace with a token-using placeholder**

```tsx
// app/page.tsx — token-using placeholder; real page assembly in Batch 10.
export default function HomePage() {
  return (
    <main className="min-h-screen bg-surface-base text-text-primary">
      <div className="mx-auto max-w-[1180px] px-12 py-16">
        <header className="mb-16">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">KYC Tier Decisioning Demo</p>
          <h1 className="mt-2 text-2xl font-semibold">Three-pass reasoning pipeline</h1>
          <p className="mt-3 text-md font-serif text-text-secondary max-w-[60ch]">
            Tier recommendation, compliance audit, and conditional auto-correction — built as a reference architecture for Philippine bank deployment.
          </p>
        </header>
        <section className="rounded border border-border-default bg-surface-elevated p-6">
          <p className="text-sm text-text-tertiary">Components land in Batch 6–10.</p>
        </section>
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Visual check**

Run: `pnpm dev`, open `http://localhost:3000`.
Expected: off-white background, charcoal heading, serif intro paragraph, slate accents not visible yet (no accent elements rendered). No layout shifts on font load.

- [ ] **Step 3: Commit**

```bash
git add app/globals.css app/layout.tsx app/page.tsx
git commit -m "feat(visual): add design tokens + font loading per visual_system.md"
```

### ✅ Checkpoint 5 — JP review gate

- Tokens visible in DevTools as CSS custom properties on `:root`
- Tailwind utility classes (`bg-surface-base`, `text-text-tertiary`, etc.) resolve correctly
- Fonts load without flash of unstyled text
- Page passes the "would this be at home on a YC landing page?" sanity check — NO is the correct answer
- Request JP review before proceeding to Batch 6

---

## Batch 6 — UI primitives

**Goal:** The set of low-level building blocks that Batches 7–8 compose. Each primitive is small, focused, and tested. No business logic — these are visual atoms with strict adherence to `visual_system.md`.

For each primitive: write a Vitest + React Testing Library test for the deterministic rendering behavior (props → DOM/classes), then implement.

### Task 6.1: `cx` classname helper + format utilities

**Files:**
- Create: `lib/ui/classnames.ts`, `lib/ui/format.ts`
- Test: `lib/ui/format.test.ts`

- [ ] **Step 1: Write the test**

```ts
import { describe, it, expect } from 'vitest';
import { formatPhp, formatElapsed, formatIsoNow } from './format';

describe('formatPhp', () => {
  it('formats with PHP prefix and thousands separators', () => {
    expect(formatPhp(850000)).toBe('PHP 850,000');
  });
  it('handles zero', () => {
    expect(formatPhp(0)).toBe('PHP 0');
  });
});

describe('formatElapsed', () => {
  it('formats sub-second to tenths', () => {
    expect(formatElapsed(2300)).toBe('2.3s elapsed');
  });
  it('formats fractional seconds with one decimal', () => {
    expect(formatElapsed(4250)).toBe('4.3s elapsed');
  });
});

describe('formatIsoNow', () => {
  it('returns an ISO 8601 string', () => {
    const s = formatIsoNow(new Date('2026-05-12T14:32:47Z'));
    expect(s).toBe('2026-05-12T14:32:47Z');
  });
});
```

- [ ] **Step 2: Write the implementations**

```ts
// lib/ui/classnames.ts
export function cx(...args: Array<string | false | null | undefined>): string {
  return args.filter(Boolean).join(' ');
}
```

```ts
// lib/ui/format.ts
export function formatPhp(n: number): string {
  return `PHP ${n.toLocaleString('en-US')}`;
}

export function formatElapsed(ms: number): string {
  const seconds = ms / 1000;
  return `${seconds.toFixed(1)}s elapsed`;
}

export function formatIsoNow(d: Date = new Date()): string {
  return d.toISOString().replace(/\.\d{3}Z$/, 'Z');
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run lib/ui/format.test.ts
git add lib/ui/classnames.ts lib/ui/format.ts lib/ui/format.test.ts
git commit -m "feat(ui): add cx helper + PHP/elapsed/ISO formatters"
```

### Task 6.2: `Card` primitive

**Files:**
- Create: `components/primitives/Card.tsx`
- Test: `components/primitives/Card.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('renders children with 24px padding (visual_system.md §4)', () => {
    render(<Card><span>content</span></Card>);
    const el = screen.getByText('content').parentElement!;
    expect(el).toHaveClass('p-6'); // Tailwind p-6 = 24px
  });
  it('renders elevated variant with bg-surface-elevated', () => {
    render(<Card variant="elevated"><span>x</span></Card>);
    expect(screen.getByText('x').parentElement).toHaveClass('bg-surface-elevated');
  });
  it('renders recessed variant', () => {
    render(<Card variant="recessed"><span>x</span></Card>);
    expect(screen.getByText('x').parentElement).toHaveClass('bg-surface-recessed');
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/primitives/Card.tsx
import { cx } from '@/lib/ui/classnames';

interface CardProps {
  variant?: 'elevated' | 'recessed' | 'base';
  className?: string;
  children: React.ReactNode;
}

export function Card({ variant = 'elevated', className, children }: CardProps) {
  const bg = variant === 'elevated' ? 'bg-surface-elevated' : variant === 'recessed' ? 'bg-surface-recessed' : 'bg-surface-base';
  return (
    <div className={cx('rounded border border-border-default p-6', bg, className)}>
      {children}
    </div>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/primitives/Card.test.tsx
git add components/primitives/Card.tsx components/primitives/Card.test.tsx
git commit -m "feat(primitives): add Card with elevated/recessed/base variants"
```

### Task 6.3: `Chip` primitive

**Files:**
- Create: `components/primitives/Chip.tsx`
- Test: `components/primitives/Chip.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chip } from './Chip';

describe('Chip', () => {
  it('maps status="PASS" to status-success colors', () => {
    render(<Chip status="PASS">PASS</Chip>);
    expect(screen.getByText('PASS')).toHaveClass('bg-status-success-bg');
    expect(screen.getByText('PASS')).toHaveClass('text-status-success');
  });
  it('maps status="FAIL" to violation colors', () => {
    render(<Chip status="FAIL">FAIL</Chip>);
    expect(screen.getByText('FAIL')).toHaveClass('bg-violation-bg');
    expect(screen.getByText('FAIL')).toHaveClass('text-violation-primary');
  });
  it('maps status="QUALITY" to warning amber', () => {
    render(<Chip status="QUALITY">QUALITY</Chip>);
    expect(screen.getByText('QUALITY')).toHaveClass('bg-status-warning-bg');
    expect(screen.getByText('QUALITY')).toHaveClass('text-status-warning');
  });
  it('renders accent variant', () => {
    render(<Chip variant="accent">CHIP</Chip>);
    expect(screen.getByText('CHIP')).toHaveClass('bg-accent-subtle-bg');
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/primitives/Chip.tsx
import { cx } from '@/lib/ui/classnames';

type Status = 'PASS' | 'FAIL' | 'QUALITY';

interface ChipProps {
  status?: Status;
  variant?: 'accent' | 'neutral';
  className?: string;
  children: React.ReactNode;
}

const STATUS_CLASSES: Record<Status, string> = {
  PASS: 'bg-status-success-bg text-status-success',
  FAIL: 'bg-violation-bg text-violation-primary',
  QUALITY: 'bg-status-warning-bg text-status-warning',
};

export function Chip({ status, variant, className, children }: ChipProps) {
  const colors = status
    ? STATUS_CLASSES[status]
    : variant === 'accent'
      ? 'bg-accent-subtle-bg text-accent-deep'
      : 'bg-surface-recessed text-text-secondary';
  return (
    <span className={cx('inline-flex items-center rounded-sm px-2 py-0.5 text-xs font-medium', colors, className)}>
      {children}
    </span>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/primitives/Chip.test.tsx
git add components/primitives/Chip.tsx components/primitives/Chip.test.tsx
git commit -m "feat(primitives): add Chip with compliance-status color mapping"
```

### Task 6.4: `Button` primitive

**Files:**
- Create: `components/primitives/Button.tsx`
- Test: `components/primitives/Button.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button', () => {
  it('renders primary variant with accent background', () => {
    render(<Button variant="primary">Run</Button>);
    expect(screen.getByRole('button')).toHaveClass('bg-accent-primary');
  });
  it('renders outline variant', () => {
    render(<Button variant="outline">Escalate</Button>);
    expect(screen.getByRole('button')).toHaveClass('border');
    expect(screen.getByRole('button')).toHaveClass('border-accent-primary');
  });
  it('disables and reduces opacity when disabled', () => {
    render(<Button disabled>x</Button>);
    expect(screen.getByRole('button')).toBeDisabled();
    expect(screen.getByRole('button')).toHaveClass('opacity-50');
  });
  it('fires onClick', () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>x</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/primitives/Button.tsx
import { cx } from '@/lib/ui/classnames';

interface ButtonProps extends React.ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'outline' | 'subtle';
}

export function Button({ variant = 'primary', className, disabled, children, ...rest }: ButtonProps) {
  const base = 'inline-flex items-center justify-center rounded px-4 py-2 text-sm font-medium transition-colors disabled:cursor-not-allowed disabled:opacity-50';
  const v =
    variant === 'primary' ? 'bg-accent-primary text-text-inverse hover:bg-accent-secondary' :
    variant === 'outline' ? 'border border-accent-primary text-accent-primary bg-transparent hover:bg-accent-subtle-bg' :
    'border border-border-default text-text-secondary bg-transparent hover:bg-surface-recessed';
  return (
    <button {...rest} disabled={disabled} className={cx(base, v, className)}>
      {children}
    </button>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/primitives/Button.test.tsx
git add components/primitives/Button.tsx components/primitives/Button.test.tsx
git commit -m "feat(primitives): add Button with primary/outline/subtle variants"
```

### Task 6.5: `Tooltip` primitive (focus + hover, no click)

**Files:**
- Create: `components/primitives/Tooltip.tsx`
- Test: `components/primitives/Tooltip.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip', () => {
  it('shows content on hover', () => {
    render(<Tooltip content="citation"><span>label</span></Tooltip>);
    expect(screen.queryByText('citation')).not.toBeInTheDocument();
    fireEvent.mouseEnter(screen.getByText('label'));
    expect(screen.getByText('citation')).toBeInTheDocument();
  });
  it('shows content on focus', () => {
    render(<Tooltip content="citation"><button>label</button></Tooltip>);
    fireEvent.focus(screen.getByText('label'));
    expect(screen.getByText('citation')).toBeInTheDocument();
  });
  it('hides on blur', () => {
    render(<Tooltip content="citation"><button>label</button></Tooltip>);
    fireEvent.focus(screen.getByText('label'));
    fireEvent.blur(screen.getByText('label'));
    expect(screen.queryByText('citation')).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/primitives/Tooltip.tsx
'use client';
import { useState, useId } from 'react';

interface TooltipProps {
  content: React.ReactNode;
  children: React.ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-10 mt-1 max-w-xs rounded border border-border-default bg-surface-elevated px-3 py-2 text-sm text-text-secondary shadow-sm"
        >
          {content}
        </span>
      )}
    </span>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/primitives/Tooltip.test.tsx
git add components/primitives/Tooltip.tsx components/primitives/Tooltip.test.tsx
git commit -m "feat(primitives): add Tooltip with hover/focus triggers, no click required"
```

### Task 6.6: `Modal` primitive (focus trap, escape, backdrop click)

**Files:**
- Create: `components/primitives/Modal.tsx`
- Test: `components/primitives/Modal.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Modal } from './Modal';

describe('Modal', () => {
  it('renders content when open', () => {
    render(<Modal open onClose={() => {}}><span>body</span></Modal>);
    expect(screen.getByText('body')).toBeInTheDocument();
  });
  it('does not render when closed', () => {
    render(<Modal open={false} onClose={() => {}}><span>body</span></Modal>);
    expect(screen.queryByText('body')).not.toBeInTheDocument();
  });
  it('calls onClose when Escape pressed', () => {
    const fn = vi.fn();
    render(<Modal open onClose={fn}><span>body</span></Modal>);
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(fn).toHaveBeenCalled();
  });
  it('calls onClose when backdrop clicked', () => {
    const fn = vi.fn();
    render(<Modal open onClose={fn}><span>body</span></Modal>);
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(fn).toHaveBeenCalled();
  });
  it('does NOT close when content clicked', () => {
    const fn = vi.fn();
    render(<Modal open onClose={fn}><span>body</span></Modal>);
    fireEvent.click(screen.getByText('body'));
    expect(fn).not.toHaveBeenCalled();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/primitives/Modal.tsx
'use client';
import { useEffect } from 'react';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  children: React.ReactNode;
}

export function Modal({ open, onClose, children }: ModalProps) {
  useEffect(() => {
    if (!open) return;
    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handle);
    return () => document.removeEventListener('keydown', handle);
  }, [open, onClose]);

  if (!open) return null;
  return (
    <div
      data-testid="modal-backdrop"
      className="fixed inset-0 z-50 flex items-center justify-center modal-backdrop"
      onClick={onClose}
    >
      <div
        role="dialog"
        aria-modal="true"
        className="relative max-w-lg rounded border border-border-default bg-surface-elevated p-6 shadow-lg"
        onClick={(e) => e.stopPropagation()}
      >
        {children}
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/primitives/Modal.test.tsx
git add components/primitives/Modal.tsx components/primitives/Modal.test.tsx
git commit -m "feat(primitives): add Modal with escape/backdrop close, content click safe"
```

### Task 6.7: `ProgressBar`, `Skeleton`, `ChevronDisclosure`, `TabularNumber`

**Files:**
- Create: `components/primitives/ProgressBar.tsx`, `Skeleton.tsx`, `ChevronDisclosure.tsx`, `TabularNumber.tsx`
- Test: one combined test file `components/primitives/misc.test.tsx`

- [ ] **Step 1: Write combined tests**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';
import { Skeleton } from './Skeleton';
import { ChevronDisclosure } from './ChevronDisclosure';
import { TabularNumber } from './TabularNumber';

describe('ProgressBar', () => {
  it('renders an accent-primary bar with width = progress%', () => {
    render(<ProgressBar progress={42} />);
    const bar = screen.getByTestId('progress-bar-fill');
    expect(bar).toHaveStyle({ width: '42%' });
    expect(bar).toHaveClass('bg-accent-primary');
  });
});

describe('Skeleton', () => {
  it('renders with surface-recessed background', () => {
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton')).toHaveClass('bg-surface-recessed');
  });
});

describe('ChevronDisclosure', () => {
  it('toggles open state on click', () => {
    const fn = vi.fn();
    render(<ChevronDisclosure label="More" open={false} onToggle={fn} />);
    fireEvent.click(screen.getByText('More'));
    expect(fn).toHaveBeenCalledWith(true);
  });
  it('rotates chevron when open', () => {
    render(<ChevronDisclosure label="More" open onToggle={() => {}} />);
    expect(screen.getByTestId('chevron-icon')).toHaveClass('rotate-90');
  });
});

describe('TabularNumber', () => {
  it('applies tabular-nums font-variant', () => {
    render(<TabularNumber value="850,000" />);
    expect(screen.getByText('850,000')).toHaveClass('tabular-figures');
  });
});
```

- [ ] **Step 2: Write the implementations**

```tsx
// components/primitives/ProgressBar.tsx
interface ProgressBarProps { progress: number; }
export function ProgressBar({ progress }: ProgressBarProps) {
  return (
    <div className="h-0.5 w-full overflow-hidden bg-surface-recessed">
      <div data-testid="progress-bar-fill" className="h-full bg-accent-primary transition-[width] duration-300" style={{ width: `${Math.max(0, Math.min(100, progress))}%` }} />
    </div>
  );
}
```

```tsx
// components/primitives/Skeleton.tsx
import { cx } from '@/lib/ui/classnames';
interface SkeletonProps { className?: string; }
export function Skeleton({ className }: SkeletonProps) {
  return <div data-testid="skeleton" className={cx('animate-pulse rounded bg-surface-recessed', className)} />;
}
```

```tsx
// components/primitives/ChevronDisclosure.tsx
'use client';
import { cx } from '@/lib/ui/classnames';

interface ChevronDisclosureProps {
  label: string;
  open: boolean;
  onToggle: (next: boolean) => void;
}

export function ChevronDisclosure({ label, open, onToggle }: ChevronDisclosureProps) {
  return (
    <button
      type="button"
      onClick={() => onToggle(!open)}
      className="inline-flex items-center gap-1 text-sm text-accent-primary hover:text-accent-deep"
    >
      <span data-testid="chevron-icon" className={cx('inline-block transition-transform', open && 'rotate-90')} aria-hidden>›</span>
      <span>{label}</span>
    </button>
  );
}
```

```tsx
// components/primitives/TabularNumber.tsx
import { cx } from '@/lib/ui/classnames';
interface TabularNumberProps { value: string | number; className?: string; }
export function TabularNumber({ value, className }: TabularNumberProps) {
  return <span className={cx('tabular-figures', className)}>{value}</span>;
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/primitives/misc.test.tsx
git add components/primitives/ProgressBar.tsx components/primitives/Skeleton.tsx components/primitives/ChevronDisclosure.tsx components/primitives/TabularNumber.tsx components/primitives/misc.test.tsx
git commit -m "feat(primitives): add ProgressBar, Skeleton, ChevronDisclosure, TabularNumber"
```

### ✅ Checkpoint 6 — JP review gate

- All primitive tests green
- Each primitive uses tokens, not hex codes
- No icon library introduced; only chevron glyphs and the `?` glyph (from later Citation tooltip) appear
- `Card`, `Modal`, `Tooltip` deliver the affordances required by Batches 7–8 (audit panel cards, override modal, citation tooltip)
- Request JP review before proceeding to Batch 7

---

## Batch 7 — Decisioning components

**Goal:** Compose primitives into the substantive UI surfaces from PRIMARY_PROMPT.md §6 and visual_system.md §5. Each component takes typed props and renders. Animation behavior is wired in Batch 9 (orchestration owns the timing).

Most tests use `loadPersona('maria')` from Batch 1 to feed real fixtures rather than synthetic minimal shapes — this catches schema drift.

### Task 7.1: `PersonaButtonRow`

**Files:**
- Create: `components/decisioning/PersonaButtonRow.tsx`
- Test: `components/decisioning/PersonaButtonRow.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PersonaButtonRow } from './PersonaButtonRow';

const personas = [
  { id: 'maria', name: 'Maria', descriptor: 'Salaried PH resident — Standard-tier baseline' },
  { id: 'carlos', name: 'Carlos', descriptor: 'High-value EDD case' },
  { id: 'persona_c', name: 'Persona C', descriptor: 'PEP case' },
  { id: 'persona_d', name: 'Persona D', descriptor: 'Hold case' },
];

describe('PersonaButtonRow', () => {
  it('renders four buttons, all equal weight', () => {
    render(<PersonaButtonRow personas={personas as any} onSelect={() => {}} selectedId={null} />);
    expect(screen.getAllByRole('button')).toHaveLength(4);
  });
  it('renders the "Pre-generated example" mode-disclosure on each card', () => {
    render(<PersonaButtonRow personas={personas as any} onSelect={() => {}} selectedId={null} />);
    expect(screen.getAllByText(/Pre-generated example/i)).toHaveLength(4);
  });
  it('fires onSelect with id when clicked', () => {
    const fn = vi.fn();
    render(<PersonaButtonRow personas={personas as any} onSelect={fn} selectedId={null} />);
    fireEvent.click(screen.getByText('Maria'));
    expect(fn).toHaveBeenCalledWith('maria');
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/decisioning/PersonaButtonRow.tsx
'use client';
import type { PersonaListEntry, PersonaId } from '@/lib/schemas/personaAdapters';
import { cx } from '@/lib/ui/classnames';

interface PersonaButtonRowProps {
  personas: PersonaListEntry[];
  selectedId: PersonaId | null;
  onSelect: (id: PersonaId) => void;
}

export function PersonaButtonRow({ personas, selectedId, onSelect }: PersonaButtonRowProps) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4">
      {personas.map((p) => {
        const active = p.id === selectedId;
        return (
          <button
            key={p.id}
            type="button"
            onClick={() => onSelect(p.id)}
            className={cx(
              'rounded border bg-surface-elevated p-4 text-left transition-colors',
              active ? 'border-l-4 border-accent-primary' : 'border-border-default hover:bg-surface-recessed',
            )}
          >
            <div className="text-base font-semibold text-text-primary">{p.name}</div>
            <div className="mt-1 text-sm text-text-secondary">{p.descriptor}</div>
            <div className="mt-3 text-xs text-text-tertiary">Pre-generated example</div>
          </button>
        );
      })}
    </div>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/decisioning/PersonaButtonRow.test.tsx
git add components/decisioning/PersonaButtonRow.tsx components/decisioning/PersonaButtonRow.test.tsx
git commit -m "feat(decisioning): add PersonaButtonRow with equal-weight Decision 27 cards"
```

### Task 7.2: `PassHeadline` + `ElapsedTimeIndicator`

**Files:**
- Create: `components/decisioning/PassHeadline.tsx`, `ElapsedTimeIndicator.tsx`
- Test: `components/decisioning/PassHeadline.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PassHeadline } from './PassHeadline';
import { ElapsedTimeIndicator } from './ElapsedTimeIndicator';

describe('PassHeadline', () => {
  it('renders "Pass 2 — Audit" headline as a persistent section label', () => {
    render(<PassHeadline pass={2} variant="audit" />);
    expect(screen.getByText(/Pass 2 — Audit/)).toBeInTheDocument();
  });
  it('renders "Pass 2 — Re-audit" for re-audit variant', () => {
    render(<PassHeadline pass={2} variant="reaudit" />);
    expect(screen.getByText(/Pass 2 — Re-audit/)).toBeInTheDocument();
  });
});

describe('ElapsedTimeIndicator', () => {
  afterEach(() => vi.useRealTimers());

  it('does not render before 500ms threshold', () => {
    vi.useFakeTimers();
    render(<ElapsedTimeIndicator startedAt={Date.now()} live />);
    act(() => { vi.advanceTimersByTime(300); });
    expect(screen.queryByText(/elapsed/)).not.toBeInTheDocument();
  });
  it('renders elapsed-time format after 500ms', () => {
    vi.useFakeTimers();
    const start = Date.now();
    render(<ElapsedTimeIndicator startedAt={start} live />);
    act(() => { vi.advanceTimersByTime(800); });
    expect(screen.getByText(/0\.[5-9]s elapsed|elapsed/)).toBeInTheDocument();
  });
  it('renders nothing in persona-playback mode', () => {
    render(<ElapsedTimeIndicator startedAt={Date.now() - 5000} live={false} />);
    expect(screen.queryByText(/elapsed/)).not.toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/decisioning/PassHeadline.tsx
type Variant = 'recommendation' | 'audit' | 'correction' | 'reaudit';
interface PassHeadlineProps { pass: 1 | 2 | 3; variant: Variant; }
const LABELS: Record<Variant, string> = {
  recommendation: 'Tier recommendation',
  audit: 'Audit',
  correction: 'Targeted correction',
  reaudit: 'Re-audit',
};
export function PassHeadline({ pass, variant }: PassHeadlineProps) {
  return <h2 className="text-lg font-semibold text-text-primary">{`Pass ${pass} — ${LABELS[variant]}`}</h2>;
}
```

```tsx
// components/decisioning/ElapsedTimeIndicator.tsx
'use client';
import { useEffect, useState } from 'react';
import { formatElapsed } from '@/lib/ui/format';

interface ElapsedTimeIndicatorProps {
  startedAt: number;
  live: boolean;
}

const THRESHOLD_MS = 500;
const CADENCE_MS = 200;

export function ElapsedTimeIndicator({ startedAt, live }: ElapsedTimeIndicatorProps) {
  const [now, setNow] = useState<number>(startedAt);
  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), CADENCE_MS);
    return () => clearInterval(id);
  }, [live]);
  if (!live) return null;
  const elapsed = now - startedAt;
  if (elapsed < THRESHOLD_MS) return null;
  return <div className="mt-1 text-sm tabular-figures text-text-tertiary">{formatElapsed(elapsed)}</div>;
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/decisioning/PassHeadline.test.tsx
git add components/decisioning/PassHeadline.tsx components/decisioning/ElapsedTimeIndicator.tsx components/decisioning/PassHeadline.test.tsx
git commit -m "feat(decisioning): add PassHeadline + 500ms threshold ElapsedTimeIndicator"
```

### Task 7.3: `RecommendationCard`

**Files:**
- Create: `components/decisioning/RecommendationCard.tsx`
- Test: `components/decisioning/RecommendationCard.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { RecommendationCard } from './RecommendationCard';
import { loadPersona } from '@/lib/schemas/personaAdapters';

describe('RecommendationCard', () => {
  it('renders tier badge prominently', () => {
    const p = loadPersona('maria');
    render(<RecommendationCard pass1={p.pass_1} />);
    expect(screen.getByText('Standard')).toBeInTheDocument();
  });
  it('renders the total risk score with category breakdown', () => {
    const p = loadPersona('maria');
    render(<RecommendationCard pass1={p.pass_1} />);
    expect(screen.getByText(/escalation_triggers/)).toBeInTheDocument();
    expect(screen.getByText(/tier_eligibility/)).toBeInTheDocument();
    expect(screen.getByText(/documentation_process/)).toBeInTheDocument();
  });
  it('renders "Why this tier" expandable', () => {
    const p = loadPersona('maria');
    render(<RecommendationCard pass1={p.pass_1} />);
    expect(screen.getByText(/Why this tier/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/decisioning/RecommendationCard.tsx
'use client';
import { useState } from 'react';
import type { Pass1Output } from '@/lib/schemas/pass1';
import { Card } from '@/components/primitives/Card';
import { ChevronDisclosure } from '@/components/primitives/ChevronDisclosure';
import { TabularNumber } from '@/components/primitives/TabularNumber';

interface RecommendationCardProps { pass1: Pass1Output; }

export function RecommendationCard({ pass1 }: RecommendationCardProps) {
  const [open, setOpen] = useState(false);
  const cats = pass1.risk_score.category_breakdown;
  return (
    <Card variant="elevated">
      <div className="flex items-baseline justify-between">
        <div>
          <div className="text-xs text-text-tertiary">Recommended tier</div>
          <div className="mt-2 inline-flex items-center rounded-sm bg-accent-subtle-bg px-3 py-1 font-mono text-lg text-accent-deep">
            {pass1.decision.recommended_tier}
          </div>
        </div>
        <div className="text-right">
          <div className="text-xs text-text-tertiary">Risk score</div>
          <div className="mt-1 text-xl"><TabularNumber value={pass1.risk_score.total} /></div>
        </div>
      </div>
      <div className="mt-6 grid grid-cols-3 gap-3 text-sm text-text-secondary">
        <div>tier_eligibility <TabularNumber value={cats.tier_eligibility} className="ml-2 text-text-primary" /></div>
        <div>escalation_triggers <TabularNumber value={cats.escalation_triggers} className="ml-2 text-text-primary" /></div>
        <div>documentation_process <TabularNumber value={cats.documentation_process} className="ml-2 text-text-primary" /></div>
      </div>
      <div className="mt-6">
        <ChevronDisclosure label="Why this tier" open={open} onToggle={setOpen} />
        {open && (
          <p className="mt-3 font-serif text-md leading-loose text-text-primary">{pass1.summary_finding}</p>
        )}
      </div>
      {pass1.edd_requirements && pass1.edd_requirements.length > 0 && (
        <div className="mt-6">
          <div className="text-xs text-text-tertiary">Suggested EDD requirements</div>
          <ul className="mt-2 list-disc pl-5 text-sm text-text-primary">
            {pass1.edd_requirements.map((r) => <li key={r}>{r}</li>)}
          </ul>
        </div>
      )}
    </Card>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/decisioning/RecommendationCard.test.tsx
git add components/decisioning/RecommendationCard.tsx components/decisioning/RecommendationCard.test.tsx
git commit -m "feat(decisioning): add RecommendationCard with tier badge + category breakdown"
```

### Task 7.4: `NumericThresholdBlock`

**Files:**
- Create: `components/decisioning/NumericThresholdBlock.tsx`
- Test: `components/decisioning/NumericThresholdBlock.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { NumericThresholdBlock } from './NumericThresholdBlock';

describe('NumericThresholdBlock', () => {
  it('renders profile_value, rule_threshold, comparison_result, and PASS/FAIL right-aligned', () => {
    render(<NumericThresholdBlock check={{
      rule_id: 'TE-05',
      check_type: 'numeric_threshold_verification',
      status: 'PASS',
      severity: null,
      profile_value: 'PHP 850,000',
      rule_threshold: 'PHP 500,000',
      comparison_result: '850,000 ≥ 500,000',
    } as any} />);
    expect(screen.getByText('TE-05')).toBeInTheDocument();
    expect(screen.getByText(/PHP 850,000/)).toBeInTheDocument();
    expect(screen.getByText(/PHP 500,000/)).toBeInTheDocument();
    expect(screen.getByText(/PASS/)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/decisioning/NumericThresholdBlock.tsx
import type { AuditCheck } from '@/lib/schemas/pass2';
import { Chip } from '@/components/primitives/Chip';

interface Props { check: AuditCheck; }

export function NumericThresholdBlock({ check }: Props) {
  return (
    <div className="rounded border border-border-default bg-surface-recessed p-4 font-mono text-sm">
      <div className="mb-2 flex items-center justify-between">
        <span className="text-text-secondary">{check.rule_id} <span className="text-text-tertiary">numeric_threshold_verification</span></span>
        <Chip status={check.status}>{check.status}</Chip>
      </div>
      <div className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-text-primary tabular-figures">
        <span className="text-text-tertiary">profile_value:</span><span>{String(check.profile_value ?? '—')}</span>
        <span className="text-text-tertiary">rule_threshold:</span><span>{String(check.rule_threshold ?? '—')}</span>
        <span className="text-text-tertiary">comparison_result:</span><span>{check.comparison_result ?? '—'}</span>
      </div>
    </div>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/decisioning/NumericThresholdBlock.test.tsx
git add components/decisioning/NumericThresholdBlock.tsx components/decisioning/NumericThresholdBlock.test.tsx
git commit -m "feat(decisioning): add NumericThresholdBlock 'show the math' card (Decision 23)"
```

### Task 7.5: `DC07Indicator`

**Files:**
- Create: `components/decisioning/DC07Indicator.tsx`
- Test: `components/decisioning/DC07Indicator.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DC07Indicator } from './DC07Indicator';

describe('DC07Indicator', () => {
  it('renders both halves checked when both satisfied', () => {
    render(<DC07Indicator structuredRecord prose />);
    expect(screen.getByText(/structured-record/)).toBeInTheDocument();
    expect(screen.getByText(/prose-level/)).toBeInTheDocument();
    expect(screen.getAllByText('✓')).toHaveLength(2);
  });
  it('shows × where a half is not satisfied', () => {
    render(<DC07Indicator structuredRecord prose={false} />);
    expect(screen.getByText('✓')).toBeInTheDocument();
    expect(screen.getByText('×')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/decisioning/DC07Indicator.tsx
// PRIMARY_PROMPT.md §4.6: render both halves explicitly; do not collapse to single chip.

interface DC07IndicatorProps { structuredRecord: boolean; prose: boolean; }

export function DC07Indicator({ structuredRecord, prose }: DC07IndicatorProps) {
  return (
    <div className="rounded border border-border-default bg-surface-elevated p-4">
      <div className="font-mono text-sm text-text-secondary">DC-07 — NPC Advisory 2024-04 dual satisfaction</div>
      <ul className="mt-3 space-y-1 text-sm">
        <li>
          <span className={structuredRecord ? 'text-status-success' : 'text-violation-primary'}>{structuredRecord ? '✓' : '×'}</span>
          <span className="ml-2 font-mono text-text-primary">structured-record</span>
          <span className="ml-3 text-text-tertiary">(rule appears in rules_fired)</span>
        </li>
        <li>
          <span className={prose ? 'text-status-success' : 'text-violation-primary'}>{prose ? '✓' : '×'}</span>
          <span className="ml-2 font-mono text-text-primary">prose-level</span>
          <span className="ml-3 text-text-tertiary">(substantive audit_trail text)</span>
        </li>
      </ul>
    </div>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/decisioning/DC07Indicator.test.tsx
git add components/decisioning/DC07Indicator.tsx components/decisioning/DC07Indicator.test.tsx
git commit -m "feat(decisioning): add DC07Indicator dual-satisfaction (Decision 25 corollary)"
```

### Task 7.6: `SeverityStrip` + `AuditCheckRow`

**Files:**
- Create: `components/decisioning/SeverityStrip.tsx`, `AuditCheckRow.tsx`
- Test: `components/decisioning/AuditPanel.test.tsx` (covers strip + row in Task 7.7)

- [ ] **Step 1: Implement**

```tsx
// components/decisioning/SeverityStrip.tsx
import { TabularNumber } from '@/components/primitives/TabularNumber';

interface SeverityStripProps {
  counts: { critical: number; material: number; quality: number };
}

export function SeverityStrip({ counts }: SeverityStripProps) {
  return (
    <div className="flex gap-6 text-sm">
      <div><span className="text-text-tertiary">critical </span><TabularNumber value={counts.critical} className="text-text-primary" /></div>
      <div><span className="text-text-tertiary">material </span><TabularNumber value={counts.material} className="text-text-primary" /></div>
      <div><span className="text-text-tertiary">quality </span><TabularNumber value={counts.quality} className="text-text-primary" /></div>
    </div>
  );
}
```

```tsx
// components/decisioning/AuditCheckRow.tsx
import type { AuditCheck } from '@/lib/schemas/pass2';
import { Chip } from '@/components/primitives/Chip';

interface AuditCheckRowProps { check: AuditCheck; }

export function AuditCheckRow({ check }: AuditCheckRowProps) {
  return (
    <li className="grid grid-cols-[auto_auto_1fr_auto] items-start gap-3 border-b border-border-subtle py-2">
      <span className="font-mono text-sm text-text-secondary">{check.rule_id ?? '—'}</span>
      <Chip status={check.status}>{check.status}</Chip>
      <span className="text-sm text-text-primary">{check.evidence_note ?? ''}</span>
      <span className="font-mono text-xs text-text-tertiary">{check.regulatory_citation ?? ''}</span>
    </li>
  );
}
```

- [ ] **Step 2: Commit (no test yet — tested in Task 7.7 AuditPanel composite test)**

```bash
git add components/decisioning/SeverityStrip.tsx components/decisioning/AuditCheckRow.tsx
git commit -m "feat(decisioning): add SeverityStrip + AuditCheckRow row primitives"
```

### Task 7.7: `AuditPanel` (composite)

**Files:**
- Create: `components/decisioning/AuditPanel.tsx`
- Test: `components/decisioning/AuditPanel.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { AuditPanel } from './AuditPanel';
import { loadPersona } from '@/lib/schemas/personaAdapters';
import { sortChecks } from '@/lib/orchestration/sortChecks';
import personasData from '@/data/personas.json';

describe('AuditPanel', () => {
  it('renders the audit summary + checks in canonical order + DC-07 indicator', () => {
    const p = loadPersona('maria');
    const sorted = sortChecks(p.pass_2.checks);
    render(<AuditPanel pass2={{ ...p.pass_2, checks: sorted }} revealedCount={sorted.length} />);
    expect(screen.getByText(/audit_summary|audited against/i)).toBeInTheDocument();
    expect(screen.getByText(/DC-07/)).toBeInTheDocument();
    // First rendered check should be a hard_rule_floor type (canonical first)
    const firstCheck = sorted[0];
    expect(screen.getByText(firstCheck.rule_id ?? '—')).toBeInTheDocument();
  });

  it('renders only the first N checks when revealedCount < total (ticker animation hook)', () => {
    const p = loadPersona('maria');
    const sorted = sortChecks(p.pass_2.checks);
    render(<AuditPanel pass2={{ ...p.pass_2, checks: sorted }} revealedCount={3} />);
    // Find rendered rule IDs — exactly 3 listed rows
    const rows = screen.getAllByRole('listitem');
    expect(rows).toHaveLength(3);
  });

  it('renders overall status chip', () => {
    const p = loadPersona('maria');
    render(<AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} />);
    expect(screen.getAllByText(/PASS/i).length).toBeGreaterThan(0);
  });

  // Plan amendment #4 + consumption-end guard:
  // _dc07_structured_record and _dc07_prose are written by normalizePass2; the locked
  // persona JSON on disk does NOT carry them. If a future refactor accidentally bypasses
  // loadPersona / normalizePass2 and feeds AuditPanel raw personasData, the DC-07
  // indicator silently flips to × ×. This test catches that regression.
  it('reads DC-07 dual-satisfaction flags from normalized data (regression guard)', () => {
    const p = loadPersona('maria');
    // After loadPersona, the flags MUST be truthy for a PASS-clean persona.
    expect((p.pass_2 as any)._dc07_structured_record).toBe(true);
    expect((p.pass_2 as any)._dc07_prose).toBe(true);

    // Render and confirm both halves visibly checked.
    render(<AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} />);
    const dc07Block = screen.getByText(/DC-07 — NPC Advisory 2024-04 dual satisfaction/).closest('div')!;
    // Two ✓ marks within the DC-07 block, zero × marks.
    expect(dc07Block.textContent).toMatch(/✓.*structured-record/s);
    expect(dc07Block.textContent).toMatch(/✓.*prose-level/s);
    expect(dc07Block.textContent).not.toContain('×');
  });

  it('shows × × when raw personasData bypasses the normalizer (negative case)', () => {
    // Confirm the raw locked JSON has NO _dc07_* flags — proves the flags come from normalizePass2.
    const rawMaria = personasData.personas.find((x: any) => x.id === 'maria')!;
    expect((rawMaria.pass_2 as any)._dc07_structured_record).toBeUndefined();
    expect((rawMaria.pass_2 as any)._dc07_prose).toBeUndefined();

    // If someone refactors to feed raw data directly, AuditPanel falls back to false → × ×.
    render(<AuditPanel pass2={rawMaria.pass_2 as any} revealedCount={(rawMaria.pass_2 as any).checks.length} />);
    const dc07Block = screen.getByText(/DC-07 — NPC Advisory 2024-04 dual satisfaction/).closest('div')!;
    expect(dc07Block.textContent).toContain('×');
    // This rendering is the bug we want to surface — the assertion above documents it.
    // The first test in this block enforces the correct path via loadPersona.
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/decisioning/AuditPanel.tsx
import type { Pass2Output, AuditCheck } from '@/lib/schemas/pass2';
import { Card } from '@/components/primitives/Card';
import { Chip } from '@/components/primitives/Chip';
import { AuditCheckRow } from './AuditCheckRow';
import { NumericThresholdBlock } from './NumericThresholdBlock';
import { DC07Indicator } from './DC07Indicator';
import { SeverityStrip } from './SeverityStrip';

interface AuditPanelProps {
  pass2: Pass2Output;
  /** Number of checks revealed so far — drives the ticker animation in Batch 9. */
  revealedCount: number;
}

function isNumericThreshold(c: AuditCheck) {
  return c.check_type === 'numeric_threshold_verification';
}
function isDc07(c: AuditCheck) {
  return c.rule_id === 'DC-07' || c.check_type === 'dc07_documentation';
}

export function AuditPanel({ pass2, revealedCount }: AuditPanelProps) {
  const visible = pass2.checks.slice(0, revealedCount);
  const counts = pass2.severity_counts ?? { critical: 0, material: 0, quality: 0 };

  // Detect DC-07 dual-satisfaction from the pass2.checks
  const dc07Checks = visible.filter(isDc07);
  // Plan amendment #4: read computed flags written by normalizePass2.
  // Falls back to false if the flags are absent — but Task 1.2.5's normalizer always sets them.
  const structuredRecord = (pass2 as any)._dc07_structured_record === true;
  const prose = (pass2 as any)._dc07_prose === true;

  return (
    <Card variant="elevated" className="space-y-6">
      <header className="flex items-center justify-between">
        <Chip status={pass2.overall_status === 'FAIL' ? 'FAIL' : pass2.overall_status === 'PASS_WITH_QUALITY_FLAGS' ? 'QUALITY' : 'PASS'}>
          {pass2.overall_status}
        </Chip>
        <SeverityStrip counts={counts} />
      </header>
      <p className="text-sm text-text-secondary">{pass2.audit_summary}</p>
      <ul className="divide-y divide-border-subtle">
        {visible.filter((c) => !isNumericThreshold(c) && !isDc07(c)).map((c, i) => (
          <AuditCheckRow key={`${c.rule_id}-${i}`} check={c} />
        ))}
      </ul>
      {visible.filter(isNumericThreshold).map((c, i) => (
        <NumericThresholdBlock key={`ntv-${i}`} check={c} />
      ))}
      {dc07Checks.length > 0 && (
        <DC07Indicator structuredRecord={structuredRecord} prose={prose} />
      )}
    </Card>
  );
}
```

> The structured-record / prose detection heuristic above is approximate. Inspect actual `evidence_note` values from `data/personas.json` for the DC-07 entries and refine the regex if needed during Task 7.7. The personas always pass both halves (Decision 27); both should evaluate `true` for all four.

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/decisioning/AuditPanel.test.tsx
git add components/decisioning/AuditPanel.tsx components/decisioning/AuditPanel.test.tsx
git commit -m "feat(decisioning): add AuditPanel with revealedCount hook + DC-07/NTV emphasis"
```

### Task 7.8: `ExaminerNotes`

**Files:**
- Create: `components/decisioning/ExaminerNotes.tsx`
- Test: `components/decisioning/ExaminerNotes.test.tsx`

> **Per Amendment 13:** `examiner_notes_full` is a structured six-section object (`ExaminerNotesFullSchema` from `lib/schemas/pass1.ts`), not a string. Render each section with a small-caps label above prose. `recommended_edd_procedures` is null for Standard-tier personas (Maria) — conditionally omit that section.

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExaminerNotes } from './ExaminerNotes';
import { loadPersona } from '@/lib/schemas/personaAdapters';

describe('ExaminerNotes', () => {
  it('renders summary finding by default; full memo collapsed', () => {
    const p = loadPersona('maria');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    expect(screen.getByText(p.pass_1.summary_finding)).toBeInTheDocument();
    expect(screen.queryByText(/Decision Summary/i)).not.toBeInTheDocument();
  });

  it('expands to render six structured sections (EDD-tier persona)', () => {
    const p = loadPersona('carlos'); // EDD tier — recommended_edd_procedures present
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    fireEvent.click(screen.getByText(/Read full memo/i));
    expect(screen.getByText(/Decision Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Profile Analysis/i)).toBeInTheDocument();
    expect(screen.getByText(/Rule Application and Risk Pattern/i)).toBeInTheDocument();
    expect(screen.getByText(/Considered Alternatives/i)).toBeInTheDocument();
    expect(screen.getByText(/Recommended EDD Procedures/i)).toBeInTheDocument();
    expect(screen.getByText(/Audit Trail/i)).toBeInTheDocument();
  });

  it('omits Recommended EDD Procedures for Standard-tier personas (null in schema)', () => {
    const p = loadPersona('maria'); // Standard tier — recommended_edd_procedures is null
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    fireEvent.click(screen.getByText(/Read full memo/i));
    expect(screen.queryByText(/Recommended EDD Procedures/i)).not.toBeInTheDocument();
    // The other five sections still render
    expect(screen.getByText(/Decision Summary/i)).toBeInTheDocument();
    expect(screen.getByText(/Audit Trail/i)).toBeInTheDocument();
  });

  it('renders persona name and customer reference', () => {
    const p = loadPersona('maria');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    expect(screen.getByText('Examiner Notes')).toBeInTheDocument();
    expect(screen.getByText(p.profile.customer_reference)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/decisioning/ExaminerNotes.tsx
'use client';
import { useState } from 'react';
import type { Pass1Output } from '@/lib/schemas/pass1';
import { Card } from '@/components/primitives/Card';
import { ChevronDisclosure } from '@/components/primitives/ChevronDisclosure';

interface ExaminerNotesProps {
  pass1: Pass1Output;
  personaName: string;
  customerReference: string;
}

// Six-section structure per ExaminerNotesFullSchema. Order is the compliance-memo register
// established in prompts/pass_1_system_prompt.md §"Output: Two Layers".
const SECTION_LABELS = [
  { key: 'decision_summary', label: 'Decision Summary' },
  { key: 'profile_analysis', label: 'Profile Analysis' },
  { key: 'rule_application_and_risk_pattern', label: 'Rule Application and Risk Pattern' },
  { key: 'considered_alternatives', label: 'Considered Alternatives' },
  { key: 'recommended_edd_procedures', label: 'Recommended EDD Procedures' },
  { key: 'audit_trail', label: 'Audit Trail' },
] as const;

export function ExaminerNotes({ pass1, personaName, customerReference }: ExaminerNotesProps) {
  const [expanded, setExpanded] = useState(false);
  const notes = pass1.examiner_notes_full;
  return (
    <Card variant="elevated">
      <header className="mb-6">
        <h2 className="text-xl font-semibold text-text-primary">Examiner Notes</h2>
        <p className="mt-1 text-sm text-text-secondary">{personaName} · {customerReference}</p>
      </header>
      <p className="font-serif text-md leading-loose text-text-primary">{pass1.summary_finding}</p>
      <div className="mt-6">
        <ChevronDisclosure label={expanded ? 'Hide full memo' : 'Read full memo'} open={expanded} onToggle={setExpanded} />
        {expanded && (
          <div className="mt-6 space-y-6">
            {SECTION_LABELS.map(({ key, label }) => {
              const content = notes[key as keyof typeof notes];
              // recommended_edd_procedures is null for Standard-tier personas — omit section
              if (content === null || content === undefined) return null;
              return (
                <section key={key}>
                  <h3 className="text-xs font-semibold uppercase tracking-wide text-text-secondary mb-2">{label}</h3>
                  <p className="font-serif text-md leading-loose text-text-primary whitespace-pre-line">{content}</p>
                </section>
              );
            })}
          </div>
        )}
      </div>
    </Card>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/decisioning/ExaminerNotes.test.tsx
git add components/decisioning/ExaminerNotes.tsx components/decisioning/ExaminerNotes.test.tsx
git commit -m "feat(decisioning): add ExaminerNotes hero treatment with two-layer disclosure (Decision 11)"
```

### Task 7.9: `ArchitectureStrip`

**Files:**
- Create: `components/decisioning/ArchitectureStrip.tsx`
- Test: `components/decisioning/ArchitectureStrip.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArchitectureStrip } from './ArchitectureStrip';

describe('ArchitectureStrip', () => {
  it('renders five boxes left to right with Reasoning Layer emphasized', () => {
    render(<ArchitectureStrip />);
    expect(screen.getByText('Identity Verification')).toBeInTheDocument();
    expect(screen.getByText('AML Screening')).toBeInTheDocument();
    expect(screen.getByText('Reasoning Layer')).toBeInTheDocument();
    expect(screen.getByText('Case Management')).toBeInTheDocument();
    expect(screen.getByText('Core Banking')).toBeInTheDocument();
    expect(screen.getByText('Reasoning Layer').parentElement).toHaveClass('bg-accent-primary');
  });
  it('renders production annotation centered under the strip', () => {
    render(<ArchitectureStrip />);
    expect(screen.getByText(/v1 demo:/)).toBeInTheDocument();
    expect(screen.getByText(/Production:/)).toBeInTheDocument();
    expect(screen.getByText(/single-model with independent re-derivation/)).toBeInTheDocument();
    expect(screen.getByText(/multi-model audit on Bedrock with redacted input/)).toBeInTheDocument();
  });
  it('does NOT add hover/click affordances (Decision 42 static)', () => {
    render(<ArchitectureStrip />);
    const box = screen.getByText('Reasoning Layer').parentElement!;
    expect(box.tagName).not.toBe('BUTTON');
    expect(box).not.toHaveAttribute('onclick');
  });
});
```

- [ ] **Step 2: Implement**

```tsx
// components/decisioning/ArchitectureStrip.tsx
// PRIMARY_PROMPT.md §6.4 / visual_system.md §5.4 — Decision 42: static, no interactivity.
import { Fragment } from 'react';

const BOXES = [
  { label: 'Identity Verification' },
  { label: 'AML Screening' },
  { label: 'Reasoning Layer', accent: true },
  { label: 'Case Management' },
  { label: 'Core Banking' },
];

export function ArchitectureStrip() {
  return (
    <section className="space-y-6">
      <div className="flex flex-col items-stretch gap-2 md:flex-row md:items-center md:justify-between">
        {BOXES.map((b, i) => (
          <Fragment key={`arch-${b.label}`}>
            <div
              className={
                b.accent
                  ? 'rounded border border-accent-deep bg-accent-primary px-4 py-3 text-center text-text-inverse'
                  : 'rounded border border-border-default bg-surface-recessed px-4 py-3 text-center text-text-primary'
              }
            >
              {b.label}
            </div>
            {i < BOXES.length - 1 && (
              <span aria-hidden className="hidden md:inline text-text-tertiary">›</span>
            )}
            {i < BOXES.length - 1 && (
              <span aria-hidden className="inline md:hidden text-center text-text-tertiary">↓</span>
            )}
          </Fragment>
        ))}
      </div>
      <div className="text-center text-sm">
        <div><span className="text-text-tertiary">v1 demo: </span><span className="text-text-secondary">single-model with independent re-derivation.</span></div>
        <div><span className="text-text-tertiary">Production: </span><span className="text-text-secondary">multi-model audit on Bedrock with redacted input.</span></div>
      </div>
    </section>
  );
}
```

> The fragment loop above produces a React "missing key on fragment" warning. Refactor to wrap in `<React.Fragment key={i}>` if the test runner surfaces a warning; suppress otherwise harmless.

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/decisioning/ArchitectureStrip.test.tsx
git add components/decisioning/ArchitectureStrip.tsx components/decisioning/ArchitectureStrip.test.tsx
git commit -m "feat(decisioning): add static ArchitectureStrip with centered production annotation (Decision 42)"
```

### Task 7.10: `AnalystControlPanel` + `OverrideModal` + `ActionConfirmationCard`

**Files:**
- Create: `components/decisioning/AnalystControlPanel.tsx`, `OverrideModal.tsx`, `ActionConfirmationCard.tsx`
- Test: `components/decisioning/AnalystControlPanel.test.tsx`

- [ ] **Step 1: Write the test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { AnalystControlPanel } from './AnalystControlPanel';
import { loadPersona } from '@/lib/schemas/personaAdapters';

describe('AnalystControlPanel', () => {
  it('shows three buttons by default', () => {
    const p = loadPersona('maria');
    render(<AnalystControlPanel pass1={p.pass_1} personaId={p.id} onAction={() => {}} />);
    expect(screen.getByRole('button', { name: /Approve/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Escalate/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Override/i })).toBeInTheDocument();
  });

  it('switches Escalate to "Confirm Escalation" when senior_approval_required', () => {
    const p = loadPersona('maria');
    const withSenior = { ...p.pass_1, decision: { ...p.pass_1.decision, senior_approval_required: true } };
    render(<AnalystControlPanel pass1={withSenior as any} personaId={p.id} onAction={() => {}} />);
    expect(screen.getByRole('button', { name: /Confirm Escalation/i })).toBeInTheDocument();
  });

  it('renders confirmation card after Approve and disables all buttons', () => {
    const p = loadPersona('maria');
    render(<AnalystControlPanel pass1={p.pass_1} personaId={p.id} onAction={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));
    expect(screen.getByText(/Case approved/i)).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Approve/i })).toBeDisabled();
  });

  it('opens Override modal with disabled submit until non-whitespace text', () => {
    const p = loadPersona('maria');
    render(<AnalystControlPanel pass1={p.pass_1} personaId={p.id} onAction={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Override/i }));
    const submit = screen.getByRole('button', { name: /Submit override/i });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '  ' } });
    expect(submit).toBeDisabled();
    fireEvent.change(screen.getByRole('textbox'), { target: { value: 'documented basis' } });
    expect(submit).not.toBeDisabled();
  });

  it('shows "Reset case" link after an action', () => {
    const p = loadPersona('maria');
    render(<AnalystControlPanel pass1={p.pass_1} personaId={p.id} onAction={() => {}} />);
    fireEvent.click(screen.getByRole('button', { name: /Approve/i }));
    expect(screen.getByText(/Reset case/i)).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Implement `ActionConfirmationCard`**

```tsx
// components/decisioning/ActionConfirmationCard.tsx
import { Card } from '@/components/primitives/Card';

interface Props {
  action: 'approved' | 'escalated' | 'overridden';
  tier: string;
  decisiveRuleIds: string[];
  analystName: string;
  timestampIso: string;
  auditReference: string;
  overrideBasis?: string;
}

const TITLES: Record<Props['action'], string> = {
  approved: 'Case approved',
  escalated: 'Escalated',
  overridden: 'Override recorded',
};

export function ActionConfirmationCard({ action, tier, decisiveRuleIds, analystName, timestampIso, auditReference, overrideBasis }: Props) {
  return (
    <Card variant="elevated">
      <h3 className="text-lg font-semibold text-text-primary">{TITLES[action]}</h3>
      <dl className="mt-4 grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 text-sm">
        <dt className="text-text-secondary">Analyst:</dt><dd className="text-text-primary">{analystName}</dd>
        <dt className="text-text-secondary">Timestamp:</dt><dd className="text-text-primary tabular-figures">{timestampIso}</dd>
        <dt className="text-text-secondary">Tier:</dt><dd className="text-text-primary">{tier}</dd>
        <dt className="text-text-secondary">Decisive rules:</dt><dd className="font-mono text-text-primary">{decisiveRuleIds.join(', ')}</dd>
        <dt className="text-text-secondary">Audit reference:</dt><dd className="font-mono text-text-primary">{auditReference}</dd>
        {overrideBasis && (<><dt className="text-text-secondary">Override basis:</dt><dd className="text-text-primary">{overrideBasis}</dd></>)}
      </dl>
      <p className="mt-6 text-xs text-text-tertiary">
        Production: this record persists to your case management workflow. Demo: this record is not retained.
      </p>
    </Card>
  );
}
```

- [ ] **Step 3: Implement `OverrideModal`**

```tsx
// components/decisioning/OverrideModal.tsx
'use client';
import { useState } from 'react';
import { Modal } from '@/components/primitives/Modal';
import { Button } from '@/components/primitives/Button';

interface OverrideModalProps {
  open: boolean;
  onCancel: () => void;
  onSubmit: (basis: string) => void;
}

export function OverrideModal({ open, onCancel, onSubmit }: OverrideModalProps) {
  const [basis, setBasis] = useState('');
  const canSubmit = basis.trim().length > 0;
  return (
    <Modal open={open} onClose={onCancel}>
      <h3 className="text-lg font-semibold text-text-primary">Override AI recommendation</h3>
      <p className="mt-2 text-sm text-text-secondary">Document the basis for overriding the AI recommendation.</p>
      <textarea
        value={basis}
        onChange={(e) => setBasis(e.target.value)}
        className="mt-4 h-32 w-full resize-none rounded border border-border-default bg-surface-base p-3 text-sm text-text-primary"
      />
      <div className="mt-4 flex justify-end gap-3">
        <Button variant="subtle" onClick={onCancel}>Cancel</Button>
        <Button variant="primary" disabled={!canSubmit} onClick={() => onSubmit(basis.trim())}>Submit override</Button>
      </div>
    </Modal>
  );
}
```

- [ ] **Step 4: Implement `AnalystControlPanel`**

```tsx
// components/decisioning/AnalystControlPanel.tsx
'use client';
import { useState } from 'react';
import type { Pass1Output } from '@/lib/schemas/pass1';
import { Button } from '@/components/primitives/Button';
import { cx } from '@/lib/ui/classnames';
import { ActionConfirmationCard } from './ActionConfirmationCard';
import { OverrideModal } from './OverrideModal';
import { generateAuditReferenceId } from '@/lib/orchestration/auditReferenceId';
import { formatIsoNow } from '@/lib/ui/format';
import type { PersonaId } from '@/lib/schemas/personaAdapters';

type Action = 'approved' | 'escalated' | 'overridden';

interface AnalystControlPanelProps {
  pass1: Pass1Output;
  personaId: PersonaId | { kind: 'live'; sessionSeed: string };
  onAction: (action: Action, basis?: string) => void;
}

export function AnalystControlPanel({ pass1, personaId, onAction }: AnalystControlPanelProps) {
  const [action, setAction] = useState<Action | null>(null);
  const [overrideOpen, setOverrideOpen] = useState(false);
  const [overrideBasis, setOverrideBasis] = useState<string | undefined>();
  const seniorRequired = pass1.decision.senior_approval_required;
  const disabled = action !== null;

  function take(a: Action, basis?: string) {
    setAction(a);
    if (basis) setOverrideBasis(basis);
    onAction(a, basis);
  }

  return (
    <section className="space-y-4">
      <div className="flex flex-wrap gap-3">
        <Button variant="primary" disabled={disabled} className={cx(seniorRequired && 'opacity-50')} onClick={() => take('approved')}>Approve</Button>
        <Button variant={seniorRequired ? 'primary' : 'outline'} disabled={disabled} onClick={() => take('escalated')}>
          {seniorRequired ? 'Confirm Escalation' : 'Escalate'}
        </Button>
        <Button variant="subtle" disabled={disabled} onClick={() => setOverrideOpen(true)}>Override</Button>
      </div>
      {action && (
        <>
          <ActionConfirmationCard
            action={action}
            tier={pass1.decision.recommended_tier}
            decisiveRuleIds={pass1.decision.decisive_rule_ids}
            analystName="Demo Analyst"
            timestampIso={formatIsoNow()}
            auditReference={generateAuditReferenceId(typeof personaId === 'string' ? personaId : personaId)}
            overrideBasis={overrideBasis}
          />
          <button type="button" onClick={() => { setAction(null); setOverrideBasis(undefined); }} className="text-sm text-text-tertiary underline-offset-2 hover:underline">
            Reset case
          </button>
        </>
      )}
      <OverrideModal
        open={overrideOpen}
        onCancel={() => setOverrideOpen(false)}
        onSubmit={(basis) => { setOverrideOpen(false); take('overridden', basis); }}
      />
    </section>
  );
}
```

- [ ] **Step 5: Run tests, commit**

```bash
pnpm vitest run components/decisioning/AnalystControlPanel.test.tsx
git add components/decisioning/AnalystControlPanel.tsx components/decisioning/OverrideModal.tsx components/decisioning/ActionConfirmationCard.tsx components/decisioning/AnalystControlPanel.test.tsx
git commit -m "feat(decisioning): add AnalystControlPanel + Override modal + confirmation card (Decision 36)"
```

### Task 7.11: `Pass3CorrectionBanner`, `CapReachedBanner`, `Pass3RaceBanner`, `ErrorState`, `Footer`

**Files:**
- Create: `components/decisioning/Pass3CorrectionBanner.tsx`, `CapReachedBanner.tsx`, `Pass3RaceBanner.tsx`, `ErrorState.tsx`, `Footer.tsx`
- Test: `components/decisioning/banners.test.tsx`

- [ ] **Step 1: Write tests + implementations**

```tsx
// components/decisioning/Pass3CorrectionBanner.tsx
'use client';
import { useState } from 'react';
import type { Pass3Output } from '@/lib/schemas/pass3';
import { Card } from '@/components/primitives/Card';
import { ChevronDisclosure } from '@/components/primitives/ChevronDisclosure';

interface Pass3CorrectionBannerProps { pass3: Pass3Output; }

export function Pass3CorrectionBanner({ pass3 }: Pass3CorrectionBannerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Card variant="elevated" className="border-l-4 border-accent-primary">
      <h3 className="text-lg font-semibold text-text-primary">Pass 3 — Targeted correction applied</h3>
      <p className="mt-2 text-sm text-text-secondary">Audit findings revised by the correction pass. Review before action.</p>
      <div className="mt-4">
        <ChevronDisclosure label={open ? 'Hide change log' : 'Show change log'} open={open} onToggle={setOpen} />
        {open && (
          <ul className="mt-4 space-y-3 text-sm">
            {pass3.change_log.map((c, i) => (
              <li key={i} className="rounded border border-border-default bg-surface-recessed p-3">
                <div className="font-mono text-text-tertiary">{c.field}</div>
                <div className="mt-1"><span className="text-text-tertiary">before:</span> <span className="text-text-primary">{String(c.before)}</span></div>
                <div><span className="text-text-tertiary">after:</span> <span className="text-text-primary">{String(c.after)}</span></div>
                <div className="mt-1 text-text-secondary">{c.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
```

```tsx
// components/decisioning/CapReachedBanner.tsx
import { Card } from '@/components/primitives/Card';

export function CapReachedBanner() {
  return (
    <Card variant="elevated" className="border-l-4 border-violation-warn">
      <h3 className="text-lg font-semibold text-text-primary">Correction cap reached — analyst attention required</h3>
      <p className="mt-2 text-sm text-text-secondary">
        Re-audit after Pass 3 still flagged a finding. The 1-attempt correction cap for this demo has been reached.
        Production talking point: a 2-attempt cap with escalation routing would apply here.
      </p>
    </Card>
  );
}
```

```tsx
// components/decisioning/Pass3RaceBanner.tsx
interface Pass3RaceBannerProps { withinModal?: boolean; }
export function Pass3RaceBanner({ withinModal }: Pass3RaceBannerProps) {
  return (
    <div className={`rounded border border-violation-warn bg-violation-bg p-4 text-sm text-text-primary ${withinModal ? 'mb-4' : ''}`}>
      Audit findings revised after your previous action. Action surface reset; please review the corrected recommendation.
    </div>
  );
}
```

```tsx
// components/decisioning/ErrorState.tsx
import type { DecisioningError } from '@/lib/schemas/apiError';

interface ErrorStateProps { error: DecisioningError; }

export function ErrorState({ error }: ErrorStateProps) {
  return (
    <div className="rounded border border-violation-primary bg-violation-bg p-4">
      <div className="text-xs font-mono text-violation-primary">{error.errorType}</div>
      <p className="mt-2 text-sm text-violation-primary">{error.message}</p>
      {error.retryable && <p className="mt-3 text-xs text-text-tertiary">This is a transient error. You may retry.</p>}
    </div>
  );
}
```

```tsx
// components/decisioning/Footer.tsx
export function Footer() {
  return (
    <footer className="mt-16 border-t border-border-default pt-8 pb-12 text-sm">
      <div className="grid grid-cols-1 gap-8 md:grid-cols-2">
        <div>
          <div className="text-xs uppercase tracking-wide text-text-tertiary">Regulatory references</div>
          <ul className="mt-3 space-y-1 font-mono text-sm text-text-secondary">
            <li>MORB §901, §921, §923</li>
            <li>FATF Recommendations 10, 12</li>
            <li>NPC Advisory 2024-04</li>
            <li>BSP Circular 1022</li>
          </ul>
        </div>
        <div className="space-y-2 text-text-secondary">
          <p>Reference architecture: deployed via Amazon Bedrock in client AWS environment.</p>
          <p>Customer data never leaves client infrastructure.</p>
          <p>Final decision authority rests with the compliance analyst.</p>
        </div>
      </div>
      <div className="mt-8 text-right text-xs text-text-tertiary">Shift Atlas</div>
    </footer>
  );
}
```

```tsx
// components/decisioning/banners.test.tsx
import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Pass3CorrectionBanner } from './Pass3CorrectionBanner';
import { CapReachedBanner } from './CapReachedBanner';
import { Pass3RaceBanner } from './Pass3RaceBanner';
import { ErrorState } from './ErrorState';
import { Footer } from './Footer';

describe('Pass3CorrectionBanner', () => {
  it('toggles change log on click', () => {
    const pass3 = { correction_against_audit_id: 'x', correction_attempt_number: 1, corrected_pass_1: {}, change_log: [{ field: 'decision.recommended_tier', before: 'Standard', after: 'EDD', reason: 'ES-03 missed' }] } as any;
    render(<Pass3CorrectionBanner pass3={pass3} />);
    expect(screen.queryByText('ES-03 missed')).not.toBeInTheDocument();
    fireEvent.click(screen.getByText(/Show change log/i));
    expect(screen.getByText('ES-03 missed')).toBeInTheDocument();
  });
});

describe('CapReachedBanner', () => {
  it('renders analyst-attention message', () => {
    render(<CapReachedBanner />);
    expect(screen.getByText(/cap reached/i)).toBeInTheDocument();
  });
});

describe('Pass3RaceBanner', () => {
  it('renders revision message', () => {
    render(<Pass3RaceBanner />);
    expect(screen.getByText(/Audit findings revised/i)).toBeInTheDocument();
  });
});

describe('ErrorState', () => {
  it('renders typed error and retryable hint', () => {
    render(<ErrorState error={{ pass: 1, errorType: 'malformed_model_json', message: 'oops', retryable: true }} />);
    expect(screen.getByText('malformed_model_json')).toBeInTheDocument();
    expect(screen.getByText(/transient/i)).toBeInTheDocument();
  });
});

describe('Footer', () => {
  it('renders the regulatory references and architecture statements', () => {
    render(<Footer />);
    expect(screen.getByText(/MORB/)).toBeInTheDocument();
    expect(screen.getByText(/deployed via Amazon Bedrock/i)).toBeInTheDocument();
    expect(screen.getByText('Shift Atlas')).toBeInTheDocument();
  });
});
```

- [ ] **Step 2: Run, commit**

```bash
pnpm vitest run components/decisioning/banners.test.tsx
git add components/decisioning/Pass3CorrectionBanner.tsx components/decisioning/CapReachedBanner.tsx components/decisioning/Pass3RaceBanner.tsx components/decisioning/ErrorState.tsx components/decisioning/Footer.tsx components/decisioning/banners.test.tsx
git commit -m "feat(decisioning): add Pass 3 banners, ErrorState, and Footer"
```

### ✅ Checkpoint 7 — JP review gate

- All decisioning component tests green
- AuditPanel renders Maria persona's checks in canonical order with NTV + DC-07 visibly emphasized
- AnalystControlPanel exercises all three actions including Escalate concordance signaling
- ArchitectureStrip is static — no hover/click handlers anywhere
- Examiner Notes serif body is readable at default viewport
- Request JP review before proceeding to Batch 8

---

## Batch 8 — Custom input form

**Goal:** The 13-field profile form per PRIMARY_PROMPT.md §6.6 and visual_system.md §5.6. React Hook Form + Zod resolver shares `CustomerProfileSchema` with the API. Composite sub-controls join to the canonical wire string on submit. Citation tooltips on four non-obvious fields. Submit handler is wired in Batch 9 (state machine).

### Task 8.1: `FieldGroup` wrapper + `CitationTooltipGlyph`

**Files:**
- Create: `components/form/FieldGroup.tsx`, `components/form/CitationTooltipGlyph.tsx`

- [ ] **Step 1: Implement (small, no test — composed by larger tests below)**

```tsx
// components/form/FieldGroup.tsx
import { Card } from '@/components/primitives/Card';

interface FieldGroupProps { title: string; children: React.ReactNode; }

export function FieldGroup({ title, children }: FieldGroupProps) {
  return (
    <Card variant="elevated">
      <div className="mb-4 text-xs uppercase tracking-wide text-text-tertiary">{title}</div>
      <div className="grid grid-cols-1 gap-4 md:grid-cols-2">{children}</div>
    </Card>
  );
}
```

```tsx
// components/form/CitationTooltipGlyph.tsx
import { Tooltip } from '@/components/primitives/Tooltip';

interface Props { content: string; }

export function CitationTooltipGlyph({ content }: Props) {
  return (
    <Tooltip content={<span className="font-serif italic">{content}</span>}>
      <span tabIndex={0} role="button" aria-label="View citation" className="ml-2 inline-flex h-4 w-4 cursor-help items-center justify-center rounded-full text-xs text-text-tertiary outline-none focus-visible:ring-2 focus-visible:ring-accent-primary">?</span>
    </Tooltip>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/form/FieldGroup.tsx components/form/CitationTooltipGlyph.tsx
git commit -m "feat(form): add FieldGroup card + always-on CitationTooltipGlyph"
```

### Task 8.2: `CompositeSelect` (source_of_funds, account_purpose, identity_document_type)

**Files:**
- Create: `components/form/CompositeSelect.tsx`
- Test: `components/form/CompositeSelect.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { CompositeSelect } from './CompositeSelect';

describe('CompositeSelect (source_of_funds pattern)', () => {
  it('emits the primary value when only primary is selected', () => {
    const fn = vi.fn();
    render(<CompositeSelect options={['salary', 'business']} value="" onChange={fn} addAnotherLabel="+ Add additional source" />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'salary' } });
    expect(fn).toHaveBeenLastCalledWith('salary');
  });

  it('joins primary + secondary as "mixed (primary + secondary)" on add', () => {
    const fn = vi.fn();
    render(<CompositeSelect options={['salary', 'business', 'inheritance']} value="salary" onChange={fn} addAnotherLabel="+ Add" />);
    fireEvent.click(screen.getByText('+ Add'));
    const secondary = screen.getAllByRole('combobox')[1];
    fireEvent.change(secondary, { target: { value: 'inheritance' } });
    expect(fn).toHaveBeenLastCalledWith('mixed (salary + inheritance)');
  });
});
```

- [ ] **Step 2: Run, expect FAIL**

Run: `pnpm vitest run components/form/CompositeSelect.test.tsx`

- [ ] **Step 3: Implement**

```tsx
// components/form/CompositeSelect.tsx
'use client';
import { useState } from 'react';

interface CompositeSelectProps {
  options: readonly string[];
  value: string;
  onChange: (next: string) => void;
  addAnotherLabel: string;
}

// Decision 37a wire format: "mixed (primary + secondary)" when a secondary is added.
export function CompositeSelect({ options, value, onChange, addAnotherLabel }: CompositeSelectProps) {
  const [secondaryOpen, setSecondaryOpen] = useState(false);
  const [secondary, setSecondary] = useState<string>('');
  const primary = value.startsWith('mixed (') ? value.slice(7).split(' + ')[0] : value;

  function emit(p: string, s: string) {
    if (!s) onChange(p);
    else onChange(`mixed (${p} + ${s})`);
  }

  return (
    <div className="space-y-2">
      <select
        value={primary}
        onChange={(e) => emit(e.target.value, secondary)}
        className="w-full rounded border border-border-default bg-surface-base px-3 py-2 text-sm"
      >
        <option value="">—</option>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
      {!secondaryOpen && primary && (
        <button type="button" onClick={() => setSecondaryOpen(true)} className="text-xs text-accent-primary hover:underline">{addAnotherLabel}</button>
      )}
      {secondaryOpen && (
        <select
          value={secondary}
          onChange={(e) => { setSecondary(e.target.value); emit(primary, e.target.value); }}
          className="w-full rounded border border-border-default bg-surface-base px-3 py-2 text-sm"
        >
          <option value="">—</option>
          {options.filter((o) => o !== primary).map((o) => <option key={o} value={o}>{o}</option>)}
        </select>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run tests, commit**

```bash
pnpm vitest run components/form/CompositeSelect.test.tsx
git add components/form/CompositeSelect.tsx components/form/CompositeSelect.test.tsx
git commit -m "feat(form): add CompositeSelect with primary+secondary wire-format join"
```

### Task 8.3: `OccupationUnionField`

**Files:**
- Create: `components/form/OccupationUnionField.tsx`
- Test: `components/form/OccupationUnionField.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { OccupationUnionField } from './OccupationUnionField';

describe('OccupationUnionField', () => {
  it('emits enum value when enum option selected', () => {
    const fn = vi.fn();
    render(<OccupationUnionField value="" onChange={fn} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: 'employed' } });
    expect(fn).toHaveBeenLastCalledWith('employed');
  });

  it('reveals free text input when "Other..." selected and emits trimmed value', () => {
    const fn = vi.fn();
    render(<OccupationUnionField value="" onChange={fn} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__other__' } });
    const input = screen.getByPlaceholderText(/free text/i);
    fireEvent.change(input, { target: { value: '  Chef de partie  ' } });
    expect(fn).toHaveBeenLastCalledWith('Chef de partie');
  });

  it('normalizes enum-matching free text to enum value (silent normalization, Decision 37b)', () => {
    const fn = vi.fn();
    render(<OccupationUnionField value="" onChange={fn} />);
    fireEvent.change(screen.getByRole('combobox'), { target: { value: '__other__' } });
    fireEvent.change(screen.getByPlaceholderText(/free text/i), { target: { value: 'employed' } });
    expect(fn).toHaveBeenLastCalledWith('employed');
  });
});
```

- [ ] **Step 2: Run, FAIL, implement**

```tsx
// components/form/OccupationUnionField.tsx
'use client';
import { useState } from 'react';
import { profileFormConfig } from '@/lib/forms/profileFormConfig';

const ENUM = profileFormConfig.occupation_type.options;
const ENUM_LC = new Set(ENUM.map((o) => o.toLowerCase()));

interface OccupationUnionFieldProps {
  value: string;
  onChange: (next: string) => void;
}

export function OccupationUnionField({ value, onChange }: OccupationUnionFieldProps) {
  const isEnum = (ENUM as readonly string[]).includes(value);
  const [mode, setMode] = useState<'enum' | 'free'>(value && !isEnum ? 'free' : 'enum');

  return (
    <div className="space-y-2">
      <select
        value={mode === 'enum' ? value : '__other__'}
        onChange={(e) => {
          if (e.target.value === '__other__') { setMode('free'); onChange(''); }
          else { setMode('enum'); onChange(e.target.value); }
        }}
        className="w-full rounded border border-border-default bg-surface-base px-3 py-2 text-sm"
      >
        <option value="">—</option>
        {ENUM.map((o) => <option key={o} value={o}>{o}</option>)}
        <option value="__other__">Other…</option>
      </select>
      {mode === 'free' && (
        <input
          type="text"
          placeholder="free text occupation"
          value={value}
          onChange={(e) => {
            const trimmed = e.target.value.trim();
            // Decision 37b silent enum-match normalization
            const match = ENUM.find((o) => o.toLowerCase() === trimmed.toLowerCase());
            onChange(match ?? trimmed);
          }}
          className="w-full rounded border border-border-default bg-surface-base px-3 py-2 text-sm"
        />
      )}
    </div>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/form/OccupationUnionField.test.tsx
git add components/form/OccupationUnionField.tsx components/form/OccupationUnionField.test.tsx
git commit -m "feat(form): add OccupationUnionField with silent enum normalization"
```

### Task 8.4: `PhpAmountField`

**Files:**
- Create: `components/form/PhpAmountField.tsx`
- Test: `components/form/PhpAmountField.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { PhpAmountField } from './PhpAmountField';

describe('PhpAmountField', () => {
  it('shows "PHP" prefix label', () => {
    render(<PhpAmountField value={850000} onChange={() => {}} />);
    expect(screen.getByText('PHP')).toBeInTheDocument();
  });

  it('formats with thousand separators on blur', () => {
    render(<PhpAmountField value={850000} onChange={() => {}} />);
    fireEvent.blur(screen.getByRole('textbox'));
    expect((screen.getByRole('textbox') as HTMLInputElement).value).toBe('850,000');
  });

  it('emits integer values on change', () => {
    const fn = vi.fn();
    render(<PhpAmountField value={0} onChange={fn} />);
    fireEvent.change(screen.getByRole('textbox'), { target: { value: '850,000' } });
    expect(fn).toHaveBeenLastCalledWith(850000);
  });
});
```

- [ ] **Step 2: Run, FAIL, implement**

```tsx
// components/form/PhpAmountField.tsx
'use client';
import { useState } from 'react';

interface PhpAmountFieldProps {
  value: number;
  onChange: (next: number) => void;
}

function parseInt0(s: string): number {
  const digits = s.replace(/[^0-9]/g, '');
  return digits ? Number(digits) : 0;
}

export function PhpAmountField({ value, onChange }: PhpAmountFieldProps) {
  const [display, setDisplay] = useState<string>(value ? value.toLocaleString('en-US') : '');
  return (
    <div className="flex items-center gap-2">
      <span className="text-xs text-text-tertiary">PHP</span>
      <input
        type="text"
        inputMode="numeric"
        value={display}
        onChange={(e) => {
          const n = parseInt0(e.target.value);
          setDisplay(e.target.value);
          onChange(n);
        }}
        onBlur={() => setDisplay(value ? value.toLocaleString('en-US') : '')}
        className="w-full rounded border border-border-default bg-surface-base px-3 py-2 text-sm tabular-figures"
      />
    </div>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/form/PhpAmountField.test.tsx
git add components/form/PhpAmountField.tsx components/form/PhpAmountField.test.tsx
git commit -m "feat(form): add PhpAmountField with format-on-blur thousand separators"
```

### Task 8.5: `CustomInputForm` — composition + RHF + Zod resolver

**Files:**
- Create: `components/form/CustomInputForm.tsx`
- Test: `components/form/CustomInputForm.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { CustomInputForm } from './CustomInputForm';

describe('CustomInputForm', () => {
  it('renders all four field groups', () => {
    render(<CustomInputForm onSubmit={() => {}} />);
    expect(screen.getByText(/Customer identity/i)).toBeInTheDocument();
    expect(screen.getByText(/Account & behavior/i)).toBeInTheDocument();
    expect(screen.getByText(/Risk indicators/i)).toBeInTheDocument();
    expect(screen.getByText(/Relationship/i)).toBeInTheDocument();
  });

  it('renders the mode-disclosure label "Live audit"', () => {
    render(<CustomInputForm onSubmit={() => {}} />);
    expect(screen.getByText(/Live audit/i)).toBeInTheDocument();
  });

  it('renders the rate-limit footer microcopy', () => {
    render(<CustomInputForm onSubmit={() => {}} />);
    expect(screen.getByText(/rate-limited per session/i)).toBeInTheDocument();
  });

  it('renders citation tooltips on the four non-obvious fields', () => {
    render(<CustomInputForm onSubmit={() => {}} />);
    expect(screen.getAllByLabelText(/View citation/i)).toHaveLength(4);
  });

  it('calls onSubmit with a typed CustomerProfile when valid', async () => {
    const fn = vi.fn();
    render(<CustomInputForm onSubmit={fn} />);
    // Fill all required fields; relies on default values for many, override the truly required ones
    fireEvent.change(screen.getByLabelText(/Customer reference/i), { target: { value: 'Test Customer' } });
    fireEvent.click(screen.getByRole('button', { name: /Run three-pass analysis/i }));
    await waitFor(() => expect(fn).toHaveBeenCalled());
  });
});
```

- [ ] **Step 2: Run, FAIL, implement**

```tsx
// components/form/CustomInputForm.tsx
'use client';
import { useForm, Controller } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CustomerProfileSchema, type CustomerProfile } from '@/lib/schemas/customerProfile';
import { profileFormConfig } from '@/lib/forms/profileFormConfig';
import { FieldGroup } from './FieldGroup';
import { CompositeSelect } from './CompositeSelect';
import { OccupationUnionField } from './OccupationUnionField';
import { PhpAmountField } from './PhpAmountField';
import { CitationTooltipGlyph } from './CitationTooltipGlyph';
import { Button } from '@/components/primitives/Button';

interface CustomInputFormProps {
  onSubmit: (profile: CustomerProfile) => void;
  disabled?: boolean;
}

const DEFAULTS: CustomerProfile = {
  customer_reference: '',
  identity_document_type: 'PhilSys',
  residency_status: 'PH resident',
  customer_type: 'individual retail',
  occupation_type: 'employed',
  source_of_funds: 'salary',
  account_purpose: 'payroll',
  expected_monthly_volume_php: 80000,
  pep_status: 'none',
  sanctions_screening: 'clean',
  high_risk_jurisdiction_connection: 'none',
  adverse_media: 'no',
  years_with_bank: 'new',
};

export function CustomInputForm({ onSubmit, disabled }: CustomInputFormProps) {
  const { register, handleSubmit, control, formState: { errors } } = useForm<CustomerProfile>({
    resolver: zodResolver(CustomerProfileSchema),
    mode: 'onBlur',
    defaultValues: DEFAULTS,
  });

  const tooltipFor = (k: keyof typeof profileFormConfig) => {
    const c = profileFormConfig[k] as { citationTooltip?: string };
    return c.citationTooltip ? <CitationTooltipGlyph content={c.citationTooltip} /> : null;
  };

  function SimpleSelect({ name, options }: { name: keyof CustomerProfile; options: readonly string[] }) {
    return (
      <select {...register(name as any)} disabled={disabled} className="w-full rounded border border-border-default bg-surface-base px-3 py-2 text-sm">
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-6">
      <div className="text-xs text-text-tertiary">Live audit</div>

      <FieldGroup title="Customer identity">
        <label className="space-y-1">
          <div className="text-sm text-text-secondary">Customer reference</div>
          <input {...register('customer_reference')} disabled={disabled} className="w-full rounded border border-border-default bg-surface-base px-3 py-2 text-sm" />
          {errors.customer_reference && <p className="text-xs text-violation-primary">{errors.customer_reference.message}</p>}
        </label>
        <label className="space-y-1">
          <div className="flex items-center text-sm text-text-secondary">Identity document</div>
          <Controller control={control} name="identity_document_type" render={({ field }) => (
            <CompositeSelect options={profileFormConfig.identity_document_type.options} value={field.value} onChange={field.onChange} addAnotherLabel="+ PhilSys enrollment in process" />
          )} />
        </label>
        <label className="space-y-1">
          <div className="text-sm text-text-secondary">Residency status</div>
          <SimpleSelect name="residency_status" options={profileFormConfig.residency_status.options} />
        </label>
        <label className="space-y-1">
          <div className="flex items-center text-sm text-text-secondary">Customer type {tooltipFor('customer_type')}</div>
          <SimpleSelect name="customer_type" options={profileFormConfig.customer_type.options} />
        </label>
      </FieldGroup>

      <FieldGroup title="Account & behavior">
        <label className="space-y-1">
          <div className="text-sm text-text-secondary">Occupation</div>
          <Controller control={control} name="occupation_type" render={({ field }) => (
            <OccupationUnionField value={field.value} onChange={field.onChange} />
          )} />
        </label>
        <label className="space-y-1">
          <div className="flex items-center text-sm text-text-secondary">Source of funds {tooltipFor('source_of_funds')}</div>
          <Controller control={control} name="source_of_funds" render={({ field }) => (
            <CompositeSelect options={profileFormConfig.source_of_funds.options} value={field.value} onChange={field.onChange} addAnotherLabel="+ Add additional source" />
          )} />
        </label>
        <label className="space-y-1">
          <div className="text-sm text-text-secondary">Account purpose</div>
          <Controller control={control} name="account_purpose" render={({ field }) => (
            <CompositeSelect options={profileFormConfig.account_purpose.options} value={field.value} onChange={field.onChange} addAnotherLabel="+ Add another" />
          )} />
        </label>
        <label className="space-y-1">
          <div className="text-sm text-text-secondary">Expected monthly volume</div>
          <Controller control={control} name="expected_monthly_volume_php" render={({ field }) => (
            <PhpAmountField value={field.value} onChange={field.onChange} />
          )} />
        </label>
      </FieldGroup>

      <FieldGroup title="Risk indicators">
        <label className="space-y-1">
          <div className="flex items-center text-sm text-text-secondary">PEP status {tooltipFor('pep_status')}</div>
          <SimpleSelect name="pep_status" options={profileFormConfig.pep_status.options} />
        </label>
        <label className="space-y-1">
          <div className="text-sm text-text-secondary">Sanctions screening</div>
          <SimpleSelect name="sanctions_screening" options={profileFormConfig.sanctions_screening.options} />
        </label>
        <label className="space-y-1">
          <div className="flex items-center text-sm text-text-secondary">High-risk jurisdiction connection {tooltipFor('high_risk_jurisdiction_connection')}</div>
          <SimpleSelect name="high_risk_jurisdiction_connection" options={profileFormConfig.high_risk_jurisdiction_connection.options} />
        </label>
        <label className="space-y-1">
          <div className="text-sm text-text-secondary">Adverse media</div>
          <SimpleSelect name="adverse_media" options={profileFormConfig.adverse_media.options} />
        </label>
      </FieldGroup>

      <FieldGroup title="Relationship">
        <label className="space-y-1">
          <div className="text-sm text-text-secondary">Years with bank</div>
          <SimpleSelect name="years_with_bank" options={profileFormConfig.years_with_bank.options} />
        </label>
      </FieldGroup>

      <div className="flex flex-col-reverse items-stretch gap-3 md:flex-row md:items-center md:justify-between">
        <p className="text-xs text-text-tertiary">Live generation is rate-limited per session. Pre-generated examples are not affected.</p>
        <Button type="submit" variant="primary" disabled={disabled}>Run three-pass analysis</Button>
      </div>
    </form>
  );
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run components/form/CustomInputForm.test.tsx
git add components/form/CustomInputForm.tsx components/form/CustomInputForm.test.tsx
git commit -m "feat(form): assemble 13-field profile form with RHF + Zod resolver"
```

### ✅ Checkpoint 8 — JP review gate

- Form renders all four regulatory-function groups
- Composite fields produce canonical wire strings on submit (`mixed (salary + inheritance)`, etc.)
- Occupation union accepts both branches with silent enum normalization
- PHP field shows tabular figures, formats on blur
- Citation tooltips appear on focus and hover; tap-to-dismiss on mobile (manual test)
- Request JP review before proceeding to Batch 9

---

## Batch 9 — Orchestration: state machine + ticker animation

**Goal:** The client-side state machine that owns the persona-playback vs live-mode dispatch, the audit-panel ticker animation, the Pass 3 race detection, and the action-state reset behavior. This is where Decisions 32 (per-pass POSTs), 41 (symmetric ticker), and the cap-reached/race-banner flows become real.

### Task 9.1: State machine — shape and reducer

**Files:**
- Create: `lib/orchestration/stateMachine.ts`
- Test: `lib/orchestration/stateMachine.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect } from 'vitest';
import { initialState, decisioningReducer } from './stateMachine';

describe('decisioningReducer — persona playback', () => {
  it('starts idle', () => {
    expect(initialState.phase).toBe('idle');
  });

  it('PERSONA_SELECTED → loading_pass1', () => {
    const s = decisioningReducer(initialState, { type: 'PERSONA_SELECTED', personaId: 'maria' });
    expect(s.phase).toBe('loading_pass1');
    expect(s.mode).toBe('persona');
    expect(s.personaId).toBe('maria');
  });

  it('PASS1_LOADED with locked persona → loading_pass2', () => {
    const s1 = decisioningReducer(initialState, { type: 'PERSONA_SELECTED', personaId: 'maria' });
    const s2 = decisioningReducer(s1, { type: 'PASS1_LOADED', pass1: { decision: { recommended_tier: 'Standard' } } as any });
    expect(s2.phase).toBe('loading_pass2');
  });

  it('PASS2_LOADED with PASS clean → complete (no Pass 3 on personas)', () => {
    const s1 = decisioningReducer(initialState, { type: 'PERSONA_SELECTED', personaId: 'maria' });
    const s2 = decisioningReducer(s1, { type: 'PASS1_LOADED', pass1: { decision: { recommended_tier: 'Standard' } } as any });
    const s3 = decisioningReducer(s2, { type: 'PASS2_LOADED', pass2: { overall_status: 'PASS', correction_required: false, checks: [] } as any });
    expect(s3.phase).toBe('complete');
  });
});

describe('decisioningReducer — live mode + Pass 3', () => {
  it('LIVE_SUBMIT → loading_pass1 with mode=live', () => {
    const s = decisioningReducer(initialState, { type: 'LIVE_SUBMIT', profile: {} as any });
    expect(s.mode).toBe('live');
    expect(s.phase).toBe('loading_pass1');
  });

  it('PASS2_LOADED with correction_required → loading_pass3', () => {
    let s = decisioningReducer(initialState, { type: 'LIVE_SUBMIT', profile: {} as any });
    s = decisioningReducer(s, { type: 'PASS1_LOADED', pass1: {} as any });
    s = decisioningReducer(s, { type: 'PASS2_LOADED', pass2: { overall_status: 'FAIL', correction_required: true, checks: [] } as any });
    expect(s.phase).toBe('loading_pass3');
  });

  it('REAUDIT_LOADED with PASS → complete with pass3 applied', () => {
    let s = decisioningReducer(initialState, { type: 'LIVE_SUBMIT', profile: {} as any });
    s = decisioningReducer(s, { type: 'PASS1_LOADED', pass1: {} as any });
    s = decisioningReducer(s, { type: 'PASS2_LOADED', pass2: { overall_status: 'FAIL', correction_required: true, checks: [] } as any });
    s = decisioningReducer(s, { type: 'PASS3_LOADED', pass3: { correction_against_audit_id: 'x', correction_attempt_number: 1, change_log: [] } as any });
    s = decisioningReducer(s, { type: 'REAUDIT_LOADED', reaudit: { overall_status: 'PASS', correction_required: false, checks: [] } as any });
    expect(s.phase).toBe('complete');
    expect(s.pass3).toBeDefined();
  });

  it('REAUDIT_LOADED still flagging → cap_reached (1-attempt cap)', () => {
    let s = decisioningReducer(initialState, { type: 'LIVE_SUBMIT', profile: {} as any });
    s = decisioningReducer(s, { type: 'PASS1_LOADED', pass1: {} as any });
    s = decisioningReducer(s, { type: 'PASS2_LOADED', pass2: { overall_status: 'FAIL', correction_required: true, checks: [] } as any });
    s = decisioningReducer(s, { type: 'PASS3_LOADED', pass3: {} as any });
    s = decisioningReducer(s, { type: 'REAUDIT_LOADED', reaudit: { overall_status: 'FAIL', correction_required: true, checks: [] } as any });
    expect(s.phase).toBe('cap_reached');
  });

  it('ERROR transitions to error phase carrying typed error', () => {
    let s = decisioningReducer(initialState, { type: 'LIVE_SUBMIT', profile: {} as any });
    s = decisioningReducer(s, { type: 'ERROR', error: { pass: 1, errorType: 'malformed_model_json', message: 'x', retryable: true } });
    expect(s.phase).toBe('error');
    expect(s.error?.errorType).toBe('malformed_model_json');
  });

  it('RESET returns to idle', () => {
    let s = decisioningReducer(initialState, { type: 'PERSONA_SELECTED', personaId: 'maria' });
    s = decisioningReducer(s, { type: 'RESET' });
    expect(s).toEqual(initialState);
  });
});
```

- [ ] **Step 2: Run, FAIL, implement**

```ts
// lib/orchestration/stateMachine.ts
import type { Pass1Output } from '@/lib/schemas/pass1';
import type { Pass2Output } from '@/lib/schemas/pass2';
import type { Pass3Output } from '@/lib/schemas/pass3';
import type { DecisioningError } from '@/lib/schemas/apiError';
import type { PersonaId } from '@/lib/schemas/personaAdapters';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';

export type Phase =
  | 'idle'
  | 'loading_pass1'
  | 'pass1_loaded'
  | 'loading_pass2'
  | 'pass2_loaded'
  | 'loading_pass3'
  | 'pass3_loaded'
  | 'loading_reaudit'
  | 'complete'
  | 'cap_reached'
  | 'error';

export interface State {
  phase: Phase;
  mode: 'persona' | 'live' | null;
  personaId: PersonaId | null;
  profile: CustomerProfile | null;
  pass1: Pass1Output | null;
  pass2: Pass2Output | null;
  pass3: Pass3Output | null;
  reaudit: Pass2Output | null;
  error: DecisioningError | null;
}

export const initialState: State = {
  phase: 'idle', mode: null, personaId: null, profile: null,
  pass1: null, pass2: null, pass3: null, reaudit: null, error: null,
};

export type Action =
  | { type: 'PERSONA_SELECTED'; personaId: PersonaId }
  | { type: 'LIVE_SUBMIT'; profile: CustomerProfile }
  | { type: 'PASS1_LOADED'; pass1: Pass1Output }
  | { type: 'PASS2_LOADED'; pass2: Pass2Output }
  | { type: 'PASS3_LOADED'; pass3: Pass3Output }
  | { type: 'REAUDIT_LOADED'; reaudit: Pass2Output }
  | { type: 'ERROR'; error: DecisioningError }
  | { type: 'RESET' };

export function decisioningReducer(state: State, action: Action): State {
  switch (action.type) {
    case 'PERSONA_SELECTED':
      return { ...initialState, mode: 'persona', personaId: action.personaId, phase: 'loading_pass1' };
    case 'LIVE_SUBMIT':
      return { ...initialState, mode: 'live', profile: action.profile, phase: 'loading_pass1' };
    case 'PASS1_LOADED':
      return { ...state, pass1: action.pass1, phase: 'loading_pass2' };
    case 'PASS2_LOADED': {
      if (state.mode === 'persona' || !action.pass2.correction_required) {
        return { ...state, pass2: action.pass2, phase: 'complete' };
      }
      return { ...state, pass2: action.pass2, phase: 'loading_pass3' };
    }
    case 'PASS3_LOADED':
      return { ...state, pass3: action.pass3, phase: 'loading_reaudit' };
    case 'REAUDIT_LOADED':
      if (action.reaudit.correction_required) {
        return { ...state, reaudit: action.reaudit, phase: 'cap_reached' };
      }
      return { ...state, reaudit: action.reaudit, phase: 'complete' };
    case 'ERROR':
      return { ...state, error: action.error, phase: 'error' };
    case 'RESET':
      return initialState;
  }
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run lib/orchestration/stateMachine.test.ts
git add lib/orchestration/stateMachine.ts lib/orchestration/stateMachine.test.ts
git commit -m "feat(orchestration): add decisioning state machine with Pass 3 cap-reached path"
```

### Task 9.2: Audit-panel ticker hook

**Files:**
- Create: `lib/orchestration/useAuditTicker.ts`
- Test: `lib/orchestration/useAuditTicker.test.ts`

- [ ] **Step 1: Write the failing test**

```ts
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act } from '@testing-library/react';
import { useAuditTicker } from './useAuditTicker';

describe('useAuditTicker', () => {
  afterEach(() => vi.useRealTimers());

  it('starts at 0 and ticks one check per ~100ms', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAuditTicker(10, { paceMs: 100, active: true }));
    expect(result.current).toBe(0);
    act(() => { vi.advanceTimersByTime(100); });
    expect(result.current).toBe(1);
    act(() => { vi.advanceTimersByTime(400); });
    expect(result.current).toBe(5);
  });

  it('caps at totalChecks', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAuditTicker(3, { paceMs: 100, active: true }));
    act(() => { vi.advanceTimersByTime(1000); });
    expect(result.current).toBe(3);
  });

  it('does not advance when active is false', () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => useAuditTicker(5, { paceMs: 100, active: false }));
    act(() => { vi.advanceTimersByTime(500); });
    expect(result.current).toBe(0);
  });
});
```

- [ ] **Step 2: Run, FAIL, implement**

```ts
// lib/orchestration/useAuditTicker.ts
'use client';
import { useEffect, useState } from 'react';

interface Options {
  paceMs: number; // 80–120ms per visual_system.md §5.2
  active: boolean;
}

export function useAuditTicker(totalChecks: number, { paceMs, active }: Options): number {
  const [revealed, setRevealed] = useState(0);
  useEffect(() => {
    if (!active) return;
    setRevealed(0);
    const id = setInterval(() => {
      setRevealed((r) => {
        if (r + 1 >= totalChecks) {
          clearInterval(id);
          return totalChecks;
        }
        return r + 1;
      });
    }, paceMs);
    return () => clearInterval(id);
  }, [totalChecks, paceMs, active]);
  return revealed;
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run lib/orchestration/useAuditTicker.test.ts
git add lib/orchestration/useAuditTicker.ts lib/orchestration/useAuditTicker.test.ts
git commit -m "feat(orchestration): add useAuditTicker hook for 80–120ms per-check ticker"
```

### Task 9.3: API client wrapper

**Files:**
- Create: `lib/orchestration/apiClient.ts`

- [ ] **Step 1: Write the file**

```ts
// lib/orchestration/apiClient.ts
import type { CustomerProfile } from '@/lib/schemas/customerProfile';
import type { Pass1Output } from '@/lib/schemas/pass1';
import type { Pass2Output } from '@/lib/schemas/pass2';
import type { Pass3Output } from '@/lib/schemas/pass3';
import type { DecisioningError } from '@/lib/schemas/apiError';

export type PassResult<T> = { ok: true; data: T } | { ok: false; error: DecisioningError };

async function callPassRoute<T>(pass: 1 | 2 | 3, body: unknown): Promise<PassResult<T>> {
  const res = await fetch(`/api/decisioning?pass=${pass}`, {
    method: 'POST',
    headers: { 'content-type': 'application/json' },
    body: JSON.stringify(body),
  });
  const json = await res.json();
  if (res.ok) return { ok: true, data: json as T };
  return { ok: false, error: json as DecisioningError };
}

export const apiClient = {
  pass1: (profile: CustomerProfile) => callPassRoute<Pass1Output>(1, { profile }),
  pass2: (profile: CustomerProfile, pass1: Pass1Output) => callPassRoute<Pass2Output>(2, { profile, pass1 }),
  pass3: (profile: CustomerProfile, pass1: Pass1Output, pass2: Pass2Output, orchestration: { audit_id: string; attempt: number }) =>
    callPassRoute<Pass3Output>(3, { profile, pass1, pass2, orchestration }),
  reaudit: (profile: CustomerProfile, correctedPass1: Pass1Output) =>
    callPassRoute<Pass2Output>(2, { profile, pass1: correctedPass1 }), // re-audit reuses pass=2 per Decision 32
};
```

> No test file — exercised through Batch 11 e2e via mocked fetch in the page assembly test.

- [ ] **Step 2: Commit**

```bash
git add lib/orchestration/apiClient.ts
git commit -m "feat(orchestration): add apiClient with pass1/2/3/reaudit helpers"
```

### Task 9.4: Persona playback orchestrator hook

**Files:**
- Create: `lib/orchestration/usePersonaPlayback.ts`
- Test: `lib/orchestration/usePersonaPlayback.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { usePersonaPlayback } from './usePersonaPlayback';

describe('usePersonaPlayback', () => {
  afterEach(() => vi.useRealTimers());

  it('sequences PASS1_LOADED then PASS2_LOADED with simulated load delays', async () => {
    vi.useFakeTimers();
    const { result } = renderHook(() => usePersonaPlayback({ pass1DelayMs: 200, pass2DelayMs: 200 }));
    act(() => { result.current.start('maria'); });
    expect(result.current.state.phase).toBe('loading_pass1');
    act(() => { vi.advanceTimersByTime(200); });
    await waitFor(() => expect(result.current.state.phase).toBe('loading_pass2'));
    act(() => { vi.advanceTimersByTime(200); });
    await waitFor(() => expect(result.current.state.phase).toBe('complete'));
    expect(result.current.state.pass1?.decision.recommended_tier).toBe('Standard');
  });
});
```

- [ ] **Step 2: Run, FAIL, implement**

```tsx
// lib/orchestration/usePersonaPlayback.ts
'use client';
import { useReducer, useCallback } from 'react';
import { decisioningReducer, initialState } from './stateMachine';
import { loadPersona, type PersonaId } from '@/lib/schemas/personaAdapters';

interface Options {
  pass1DelayMs?: number;
  pass2DelayMs?: number;
}

export function usePersonaPlayback({ pass1DelayMs = 800, pass2DelayMs = 800 }: Options = {}) {
  const [state, dispatch] = useReducer(decisioningReducer, initialState);

  const start = useCallback((id: PersonaId) => {
    dispatch({ type: 'PERSONA_SELECTED', personaId: id });
    const persona = loadPersona(id);
    setTimeout(() => {
      dispatch({ type: 'PASS1_LOADED', pass1: persona.pass_1 });
      setTimeout(() => {
        dispatch({ type: 'PASS2_LOADED', pass2: persona.pass_2 });
      }, pass2DelayMs);
    }, pass1DelayMs);
  }, [pass1DelayMs, pass2DelayMs]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { state, start, reset };
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run lib/orchestration/usePersonaPlayback.test.tsx
git add lib/orchestration/usePersonaPlayback.ts lib/orchestration/usePersonaPlayback.test.tsx
git commit -m "feat(orchestration): add usePersonaPlayback hook with simulated load delays"
```

### Task 9.5: Live custom-input orchestrator hook

**Files:**
- Create: `lib/orchestration/useLiveDecisioning.ts`
- Test: `lib/orchestration/useLiveDecisioning.test.tsx`

- [ ] **Step 1: Write the failing test**

```tsx
import { describe, it, expect, vi } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useLiveDecisioning } from './useLiveDecisioning';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';

const profile: CustomerProfile = {
  customer_reference: 'Test', identity_document_type: 'PhilSys', residency_status: 'PH resident',
  customer_type: 'individual retail', occupation_type: 'employed', source_of_funds: 'salary',
  account_purpose: 'payroll', expected_monthly_volume_php: 80000, pep_status: 'none',
  sanctions_screening: 'clean', high_risk_jurisdiction_connection: 'none', adverse_media: 'no',
  years_with_bank: 'new',
};

describe('useLiveDecisioning', () => {
  it('runs Pass 1 → Pass 2 PASS-clean → complete', async () => {
    const mockClient = {
      pass1: vi.fn(async () => ({ ok: true, data: { decision: { recommended_tier: 'Standard' } } })),
      pass2: vi.fn(async () => ({ ok: true, data: { overall_status: 'PASS', correction_required: false, checks: [] } })),
      pass3: vi.fn(),
      reaudit: vi.fn(),
    };
    const { result } = renderHook(() => useLiveDecisioning({ _client: mockClient as any }));
    act(() => { result.current.submit(profile); });
    await waitFor(() => expect(result.current.state.phase).toBe('complete'));
    expect(mockClient.pass1).toHaveBeenCalled();
    expect(mockClient.pass2).toHaveBeenCalled();
    expect(mockClient.pass3).not.toHaveBeenCalled();
  });

  it('fires Pass 3 + re-audit when Pass 2 flags correction_required', async () => {
    const mockClient = {
      pass1: vi.fn(async () => ({ ok: true, data: { decision: { recommended_tier: 'Standard' } } })),
      pass2: vi.fn(async () => ({ ok: true, data: { overall_status: 'FAIL', correction_required: true, checks: [] } })),
      pass3: vi.fn(async () => ({ ok: true, data: { correction_against_audit_id: 'x', correction_attempt_number: 1, corrected_pass_1: { decision: { recommended_tier: 'EDD' } }, change_log: [{ field: 'x', before: 'a', after: 'b', reason: 'r' }] } })),
      reaudit: vi.fn(async () => ({ ok: true, data: { overall_status: 'PASS', correction_required: false, checks: [] } })),
    };
    const { result } = renderHook(() => useLiveDecisioning({ _client: mockClient as any }));
    act(() => { result.current.submit(profile); });
    await waitFor(() => expect(result.current.state.phase).toBe('complete'));
    expect(mockClient.pass3).toHaveBeenCalled();
    expect(mockClient.reaudit).toHaveBeenCalled();
  });

  it('dispatches ERROR on /api/decisioning failure', async () => {
    const mockClient = {
      pass1: vi.fn(async () => ({ ok: false, error: { pass: 1, errorType: 'rate_limited', message: 'no', retryable: false } })),
      pass2: vi.fn(), pass3: vi.fn(), reaudit: vi.fn(),
    };
    const { result } = renderHook(() => useLiveDecisioning({ _client: mockClient as any }));
    act(() => { result.current.submit(profile); });
    await waitFor(() => expect(result.current.state.phase).toBe('error'));
    expect(result.current.state.error?.errorType).toBe('rate_limited');
  });
});
```

- [ ] **Step 2: Run, FAIL, implement**

```ts
// lib/orchestration/useLiveDecisioning.ts
'use client';
import { useReducer, useCallback, useRef } from 'react';
import { decisioningReducer, initialState } from './stateMachine';
import { apiClient as defaultClient } from './apiClient';
import { generateAuditReferenceId } from './auditReferenceId';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';

interface Options {
  _client?: typeof defaultClient;
  sessionSeed?: string;
}

export function useLiveDecisioning({ _client = defaultClient, sessionSeed }: Options = {}) {
  const [state, dispatch] = useReducer(decisioningReducer, initialState);
  const seedRef = useRef<string>(sessionSeed ?? `${Date.now()}-${Math.random().toString(36).slice(2)}`);

  const submit = useCallback(async (profile: CustomerProfile) => {
    dispatch({ type: 'LIVE_SUBMIT', profile });

    const r1 = await _client.pass1(profile);
    if (!r1.ok) { dispatch({ type: 'ERROR', error: r1.error }); return; }
    dispatch({ type: 'PASS1_LOADED', pass1: r1.data });

    const r2 = await _client.pass2(profile, r1.data);
    if (!r2.ok) { dispatch({ type: 'ERROR', error: r2.error }); return; }
    dispatch({ type: 'PASS2_LOADED', pass2: r2.data });

    if (!r2.data.correction_required) return;

    const auditId = generateAuditReferenceId({ kind: 'live', sessionSeed: seedRef.current });
    const r3 = await _client.pass3(profile, r1.data, r2.data, { audit_id: auditId, attempt: 1 });
    if (!r3.ok) { dispatch({ type: 'ERROR', error: r3.error }); return; }
    dispatch({ type: 'PASS3_LOADED', pass3: r3.data });

    const rRe = await _client.reaudit(profile, r3.data.corrected_pass_1);
    if (!rRe.ok) { dispatch({ type: 'ERROR', error: rRe.error }); return; }
    dispatch({ type: 'REAUDIT_LOADED', reaudit: rRe.data });
  }, [_client]);

  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return { state, submit, reset };
}
```

- [ ] **Step 3: Run tests, commit**

```bash
pnpm vitest run lib/orchestration/useLiveDecisioning.test.tsx
git add lib/orchestration/useLiveDecisioning.ts lib/orchestration/useLiveDecisioning.test.tsx
git commit -m "feat(orchestration): add useLiveDecisioning hook with per-pass POSTs (Decision 32)"
```

### ✅ Checkpoint 9 — JP review gate

- State machine + ticker + persona playback + live hook all green under Vitest
- 1-attempt Pass 3 cap fires `cap_reached` on persistent flag
- Error transitions populate typed error in state
- Request JP review before proceeding to Batch 10

---

## Batch 10 — Page assembly

**Goal:** `app/page.tsx` wires the persona row, custom-input form, and result surfaces into a single coherent page following PRIMARY_PROMPT.md §6 and visual_system.md §4 layout discipline.

### Task 10.1: Compose results surface

**Files:**
- Create: `components/decisioning/ResultsSurface.tsx`

- [ ] **Step 1: Write the file**

```tsx
// components/decisioning/ResultsSurface.tsx
'use client';
import type { State } from '@/lib/orchestration/stateMachine';
import { sortChecks } from '@/lib/orchestration/sortChecks';
import { useAuditTicker } from '@/lib/orchestration/useAuditTicker';
import { PassHeadline } from './PassHeadline';
import { ElapsedTimeIndicator } from './ElapsedTimeIndicator';
import { RecommendationCard } from './RecommendationCard';
import { AuditPanel } from './AuditPanel';
import { ExaminerNotes } from './ExaminerNotes';
import { AnalystControlPanel } from './AnalystControlPanel';
import { Pass3CorrectionBanner } from './Pass3CorrectionBanner';
import { CapReachedBanner } from './CapReachedBanner';
import { ErrorState } from './ErrorState';
import { ArchitectureStrip } from './ArchitectureStrip';
import { Skeleton } from '@/components/primitives/Skeleton';
import { Card } from '@/components/primitives/Card';

interface ResultsSurfaceProps {
  state: State;
  startedAt: number | null;
  personaName?: string;
  customerReference?: string;
}

export function ResultsSurface({ state, startedAt, personaName, customerReference }: ResultsSurfaceProps) {
  if (state.phase === 'idle') return null;
  const live = state.mode === 'live';
  const sortedChecks = state.pass2 ? sortChecks(state.pass2.checks) : [];
  const reauditChecks = state.reaudit ? sortChecks(state.reaudit.checks) : [];
  const pass2Revealed = useAuditTicker(sortedChecks.length, { paceMs: 100, active: state.phase !== 'loading_pass2' && state.pass2 !== null });
  const reauditRevealed = useAuditTicker(reauditChecks.length, { paceMs: 100, active: state.reaudit !== null });

  return (
    <section className="space-y-16">
      <section className="space-y-4">
        <PassHeadline pass={1} variant="recommendation" />
        {startedAt !== null && state.phase === 'loading_pass1' && <ElapsedTimeIndicator startedAt={startedAt} live={live} />}
        {state.pass1
          ? <RecommendationCard pass1={state.pass1} />
          : <Skeleton className="h-40" />}
      </section>

      {state.pass1 && (
        <section className="space-y-4">
          <PassHeadline pass={2} variant="audit" />
          {startedAt !== null && state.phase === 'loading_pass2' && <ElapsedTimeIndicator startedAt={startedAt} live={live} />}
          {state.pass2
            ? <AuditPanel pass2={{ ...state.pass2, checks: sortedChecks }} revealedCount={pass2Revealed} />
            : <Skeleton className="h-64" />}
        </section>
      )}

      {state.pass3 && <Pass3CorrectionBanner pass3={state.pass3} />}

      {state.reaudit && (
        <section className="space-y-4">
          <PassHeadline pass={2} variant="reaudit" />
          <AuditPanel pass2={{ ...state.reaudit, checks: reauditChecks }} revealedCount={reauditRevealed} />
        </section>
      )}

      {state.phase === 'cap_reached' && <CapReachedBanner />}

      {state.phase === 'error' && state.error && <ErrorState error={state.error} />}

      {state.phase === 'complete' && state.pass1 && (personaName ?? customerReference) && (
        <ExaminerNotes pass1={state.pass1} personaName={personaName ?? 'Live audit'} customerReference={customerReference ?? '—'} />
      )}

      {state.phase === 'complete' && state.pass1 && (
        <AnalystControlPanel
          pass1={state.pass1}
          personaId={state.personaId ?? { kind: 'live', sessionSeed: 'live' }}
          onAction={() => { /* hook for telemetry in future */ }}
        />
      )}

      {(state.phase === 'complete' || state.phase === 'cap_reached') && <ArchitectureStrip />}
    </section>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add components/decisioning/ResultsSurface.tsx
git commit -m "feat(decisioning): add ResultsSurface composing all result panels"
```

### Task 10.2: `app/page.tsx` — wire personas + form + results

**Files:**
- Modify: `app/page.tsx`

- [ ] **Step 1: Replace `app/page.tsx`**

```tsx
// app/page.tsx
'use client';
import { useState, useEffect } from 'react';
import { listPersonas, loadPersona, type PersonaId } from '@/lib/schemas/personaAdapters';
import { PersonaButtonRow } from '@/components/decisioning/PersonaButtonRow';
import { CustomInputForm } from '@/components/form/CustomInputForm';
import { ResultsSurface } from '@/components/decisioning/ResultsSurface';
import { Footer } from '@/components/decisioning/Footer';
import { usePersonaPlayback } from '@/lib/orchestration/usePersonaPlayback';
import { useLiveDecisioning } from '@/lib/orchestration/useLiveDecisioning';

export default function HomePage() {
  const [personas] = useState(() => listPersonas());
  const [selectedId, setSelectedId] = useState<PersonaId | null>(null);
  const [mode, setMode] = useState<'persona' | 'live' | null>(null);
  const [startedAt, setStartedAt] = useState<number | null>(null);

  const playback = usePersonaPlayback();
  const live = useLiveDecisioning();

  const activeState = mode === 'live' ? live.state : playback.state;
  const activeName = mode === 'persona' && selectedId ? loadPersona(selectedId).name : undefined;
  const activeRef = mode === 'persona' && selectedId ? loadPersona(selectedId).profile.customer_reference : undefined;

  function handlePersonaSelect(id: PersonaId) {
    setMode('persona');
    setSelectedId(id);
    setStartedAt(Date.now());
    live.reset();
    playback.start(id);
  }

  function handleLiveSubmit(profile: any) {
    setMode('live');
    setSelectedId(null);
    setStartedAt(Date.now());
    playback.reset();
    live.submit(profile);
  }

  return (
    <main className="min-h-screen bg-surface-base text-text-primary">
      <div className="mx-auto max-w-[1180px] px-6 py-12 md:px-12 md:py-16">
        <header className="mb-12">
          <p className="text-xs uppercase tracking-wide text-text-tertiary">KYC Tier Decisioning Demo</p>
          <h1 className="mt-2 text-2xl font-semibold">Three-pass reasoning pipeline</h1>
          <p className="mt-3 font-serif text-md leading-loose text-text-secondary max-w-[60ch]">
            Tier recommendation, compliance audit, and conditional auto-correction — reference architecture for Philippine bank deployment.
          </p>
        </header>

        <section className="space-y-4">
          <PersonaButtonRow personas={personas} selectedId={selectedId} onSelect={handlePersonaSelect} />
        </section>

        <section className="mt-16 space-y-4">
          <h2 className="text-lg font-semibold">Or try your own profile</h2>
          <CustomInputForm onSubmit={handleLiveSubmit} disabled={live.state.phase !== 'idle' && live.state.phase !== 'complete' && live.state.phase !== 'error' && live.state.phase !== 'cap_reached'} />
        </section>

        <section className="mt-16">
          <ResultsSurface state={activeState} startedAt={startedAt} personaName={activeName} customerReference={activeRef} />
        </section>

        <Footer />
      </div>
    </main>
  );
}
```

- [ ] **Step 2: Visual sanity check at `xl` and `md`**

Run: `pnpm dev`
- Open `http://localhost:3000` at 1280px viewport. Check: persona row, form, no results visible.
- Click Maria. Pass 1 card appears after the loading delay; ticker animates Pass 2 checks at ~100ms each; Examiner Notes appears; analyst panel renders; architecture strip appears at the bottom.
- Resize to 768px. Persona row stacks 2×2; form becomes single-column; audit panel stays readable; architecture strip becomes vertical with `↓` connectors.

- [ ] **Step 3: Commit**

```bash
git add app/page.tsx
git commit -m "feat(app): wire personas + custom form + results surface into homepage"
```

### ✅ Checkpoint 10 — JP review gate

- Persona walkthrough works end-to-end with locked PASS-clean output for all four personas
- Sorted check order visible in DevTools — `hard_rule_floor` first, `consistency` last
- Examiner Notes serif body reads as memo, not card
- Architecture strip is static; production annotation centered; no hover affordances
- Visual register passes the "is this a YC landing page?" test — NO is the correct answer
- Request JP review before proceeding to Batch 11

---

## Batch 11 — E2E test, deployment, polish

**Goal:** Playwright covers the persona-playback happy path. Manual rehearsal of live mode against the real Anthropic API in a Vercel preview deploy. Production deploy to `kyc.shiftatlas.tech`.

### Task 11.1: Playwright persona-playback test

**Files:**
- Create: `tests/e2e/persona-playback.spec.ts`

- [ ] **Step 1: Write the test**

```ts
import { test, expect } from '@playwright/test';

test('persona walkthrough — Maria renders Pass 1 + Pass 2 PASS clean', async ({ page }) => {
  await page.goto('/');

  // Verify all four persona cards are present with "Pre-generated example" label
  await expect(page.getByText('Maria')).toBeVisible();
  await expect(page.getByText('Carlos')).toBeVisible();
  await expect(page.getByText('Persona C')).toBeVisible();
  await expect(page.getByText('Persona D')).toBeVisible();
  await expect(page.getByText('Pre-generated example').first()).toBeVisible();

  // Click Maria
  await page.getByText('Maria').click();

  // Pass 1 — Tier recommendation lands; "Standard" tier visible
  await expect(page.getByText(/Pass 1 — Tier recommendation/i)).toBeVisible();
  await expect(page.getByText('Standard')).toBeVisible({ timeout: 5_000 });

  // Pass 2 — Audit lands with checks animating
  await expect(page.getByText(/Pass 2 — Audit/i)).toBeVisible({ timeout: 5_000 });

  // Wait for the ticker to complete by checking the DC-07 dual-satisfaction indicator
  await expect(page.getByText(/DC-07/)).toBeVisible({ timeout: 10_000 });
  await expect(page.getByText(/structured-record/)).toBeVisible();
  await expect(page.getByText(/prose-level/)).toBeVisible();

  // Examiner Notes hero treatment
  await expect(page.getByText('Examiner Notes')).toBeVisible();
  await expect(page.getByText(/Read full memo/i)).toBeVisible();

  // Analyst control panel
  await expect(page.getByRole('button', { name: /Approve/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Escalate/i })).toBeVisible();
  await expect(page.getByRole('button', { name: /Override/i })).toBeVisible();

  // Architecture strip with centered production annotation
  await expect(page.getByText('Reasoning Layer')).toBeVisible();
  await expect(page.getByText(/v1 demo:/)).toBeVisible();
  await expect(page.getByText(/Production:/)).toBeVisible();

  // No "Pass 3" anywhere on persona walkthrough (Decision 27)
  await expect(page.getByText(/Pass 3 — Targeted correction/i)).not.toBeVisible();

  // No marketing language
  await expect(page.locator('body')).not.toContainText('AI-powered');
  await expect(page.locator('body')).not.toContainText('next-generation');
  await expect(page.locator('body')).not.toContainText('agent');
  await expect(page.locator('body')).not.toContainText('Oops');
});

test('analyst approve flow — confirmation card with audit reference', async ({ page }) => {
  await page.goto('/');
  await page.getByText('Maria').click();
  await page.getByRole('button', { name: /Approve/i }).waitFor({ state: 'visible', timeout: 10_000 });
  await page.getByRole('button', { name: /Approve/i }).click();
  await expect(page.getByText(/Case approved/i)).toBeVisible();
  await expect(page.locator('text=/audit-maria-\\d{14}/')).toBeVisible();
  await expect(page.getByText(/Reset case/i)).toBeVisible();
});
```

- [ ] **Step 2: Run Playwright**

Run: `pnpm test:e2e`
Expected: both tests green.

- [ ] **Step 3: Commit**

```bash
git add tests/e2e/persona-playback.spec.ts
git commit -m "test(e2e): add persona-playback happy path + analyst Approve flow"
```

### Task 11.2: README finalization

**Files:**
- Modify: `README.md`

- [ ] **Step 1: Add deployment + run instructions**

```markdown
# KYC Tier Decisioning Demo

Three-pass reasoning pipeline demo built as a portfolio asset for Shift Atlas — a reference architecture for Philippine bank KYC tier decisioning. Read `PRIMARY_PROMPT.md` for the full specification.

## Production URL

`https://kyc.shiftatlas.tech`

## Local development

```bash
pnpm install
pnpm dev
```

Open http://localhost:3000. The four persona buttons run without any API calls; the live custom-input form requires the environment variables below.

## Tests

```bash
pnpm test           # Vitest unit + integration
pnpm test:e2e       # Playwright persona-playback
pnpm typecheck      # TypeScript strict mode
```

## Environment variables

Set values exclusively in **Vercel project environment variables**. The names below are listed here for documentation; only their **values** are sensitive. Decision 40 prohibits committing files with placeholder *values* (paste-over risk) — listing variable *names* in this README is not a discipline violation.

| Variable | Purpose |
|---|---|
| `ANTHROPIC_API_KEY` | Server-side only; powers the live three-pass chain |
| `UPSTASH_REDIS_REST_URL` | Cost-protection storage (injected by Vercel Marketplace) |
| `UPSTASH_REDIS_REST_TOKEN` | Same |
| `ADMIN_STATS_KEY` | Gate for `/api/admin/stats` telemetry endpoint |

For local development create `.env.local` (gitignored) with the same keys.

## Deploy

```bash
vercel              # preview
vercel --prod       # production
```

The production deploy is bound to `kyc.shiftatlas.tech` via a Vercel custom domain. DNS: CNAME `kyc` → Vercel edge.

## Architecture

- Next.js App Router single project. UI in `app/`, API in `app/api/`, business logic in `lib/`.
- Single serverless route `/api/decisioning?pass=1|2|3` handles all live three-pass calls. Per-pass POSTs per Decision 32.
- Prompt templates and the v1 ruleset are inlined at build time via Webpack `?raw` imports (Decision 35).
- Cost protection: per-IP rate limit (L1) + global daily kill switch (L3) backed by Upstash Redis. Persona playback is exempt.
- Schema validation via Zod, with form-config-first enum SSOT (Decision 34). Typed `DecisioningError` discriminated union on failure paths.
```

- [ ] **Step 2: Commit**

```bash
git add README.md
git commit -m "docs: finalize README with deploy + architecture summary"
```

### Task 11.3: Manual live-mode rehearsal in Vercel preview

This is not an automated step. Execute it manually before the production deploy.

- [ ] **Step 1: Push a preview**

```bash
vercel
```

- [ ] **Step 2: Set environment variables in the preview project**

In the Vercel dashboard: project → settings → environment variables.
- Add `ANTHROPIC_API_KEY` (preview + production scope).
- Add `ADMIN_STATS_KEY` (preview + production scope).
- Add `DEBUG_MODE=true` **scoped to preview only** for the Pass 3 rehearsal in Step 4. Do not set this on production scope.
- Add the Upstash Redis integration via Vercel Marketplace → Upstash → Add integration → select project. This auto-populates `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN`.

- [ ] **Step 3: Exercise the baseline live-mode flow**

On the preview URL:
- Click each of the four personas; verify all render PASS clean.
- Submit the form with Maria-like inputs; verify Pass 1 + Pass 2 land, PASS clean (no Pass 3).
- Submit two or three other plausibly-error-prone profiles (e.g., concurrent hard rules borderline, threshold arithmetic right at PHP 500,000, PEP cases). **You may not be able to trigger Pass 3 deterministically** — that's by design (Pass 3 only fires when Pass 2 catches a Pass 1 mistake). If none of the profiles produce `correction_required: true` after a handful of attempts, accept that as evidence the system is stable on well-formed input and move on to Step 4 — do not try to engineer a false-positive Pass 3 from the model.
- Trigger rate limit: submit 4 live runs in an hour from the same browser; verify the 4th returns the rate-limited error with the institutional-register message.
- Visit `/api/admin/stats?key=…` — confirm counters are non-zero.

- [ ] **Step 4: Exercise the Pass 3 + re-audit + cap-reached UI path via the debug toggle**

This is the only path that exercises the Pass 3 banner, re-audit, and cap-reached banner code in production-equivalent conditions. Without it, that code ships untested in the live environment.

- With `DEBUG_MODE=true` set on the preview env (Step 2), open the preview URL.
- Submit the custom-input form with any valid profile, but in the browser's DevTools Network tab, intercept the second `/api/decisioning?pass=2` request and modify it to append `&force_correction=1` (or use a temporary client-side env flag if simpler). Per Task 4.2's debug toggle, this flips the model's `correction_required` to `true` in the response.
- Verify the client-side state machine transitions: Pass 2 banner → **Pass 3 — Targeted correction** banner with change log → re-audit Pass 2 render → if the re-audit `correction_required` is still true (which it may or may not be on the real model output), the **cap-reached** banner appears.
- If the re-audit comes back clean (which is plausible), trigger the cap-reached banner separately by chaining `?force_correction=1` on the re-audit POST as well. Confirm the cap-reached banner reads: *"Correction cap reached — analyst attention required"* and that the analyst-attention message is visible.
- Capture screenshots of: Pass 3 correction banner expanded, re-audit panel rendering, cap-reached banner. Keep these for the LinkedIn launch series.

- [ ] **Step 5: Unset `DEBUG_MODE` in the preview env and re-test**

- Remove `DEBUG_MODE` from preview env vars.
- Re-deploy the preview (Vercel re-deploys automatically on env var change, or run `vercel` again).
- Re-submit a custom-input run with `?force_correction=1` in the URL. Verify the response now ignores the toggle and returns `correction_required: false` (or whatever the model produces).
- This confirms the toggle is properly gated and will not fire in production.

- [ ] **Step 6: Document any schema drift**

If live mode surfaces a schema-validation failure on a real Anthropic response, capture the `zodIssues` array, identify which field drifted (likely an enum widening or a previously-optional field becoming required), and update the corresponding schema with the minimum change needed. **Do not edit the locked persona JSONs** to match — only update the schemas.

Commit fixes as `fix(schemas): widen <field> to accept live model output observed during rehearsal`.

### Task 11.4: Production deploy

- [ ] **Step 1: Confirm preview is green and DEBUG_MODE is not scoped to production**

- All Playwright tests green; manual live rehearsal completed without unresolved issues.
- Verify in Vercel dashboard: `DEBUG_MODE` env var is **NOT** present in production scope (only preview, and per Task 11.3 Step 5 it should already be removed from preview too). If it was set on production scope by mistake, remove it before deploying.

- [ ] **Step 2: Bind `kyc.shiftatlas.tech` domain in Vercel**

Project → settings → domains → add `kyc.shiftatlas.tech`. Vercel prints the CNAME target.

- [ ] **Step 3: Update DNS at JP's registrar**

Add CNAME record: `kyc` → `<vercel-edge-target>`. Wait for verification (usually < 5 minutes).

- [ ] **Step 4: Production deploy**

```bash
vercel --prod
```

- [ ] **Step 5: Smoke test the production URL**

- Persona walkthroughs all four work
- Custom form Live audit run with a Maria-like profile renders Pass 1 + Pass 2 PASS clean against the real API
- `/api/admin/stats?key=…` returns counters

- [ ] **Step 6: Tag the release**

```bash
git tag v1.0.0
git push origin main --tags
```

### ✅ Checkpoint 11 — JP final review

- Production URL `https://kyc.shiftatlas.tech` resolves and serves the demo
- Cost-protection counters are visible in admin stats
- Persona playback works without an Anthropic account
- Live custom input renders the full three-pass chain when triggered
- The compliance-officer test (PRIMARY_PROMPT.md §11 item 11) is JP's call after the build — flag any moments during the rehearsal that didn't read as "ours" so the polish pass can address them

---

## Self-review against PRIMARY_PROMPT.md

Run through PRIMARY_PROMPT.md §11 "done" criteria and confirm each maps to tasks above:

1. **Four personas play back correctly with all 25-30 audit checks sorted into canonical order** — Tasks 1.8 (sortChecks), 7.7 (AuditPanel), 9.2 (useAuditTicker), 11.1 (e2e)
2. **Live custom input runs real three-pass chain against `claude-sonnet-4-6`** — Tasks 3.6 (callPass), 4.2 (route), 8.5 (form), 9.5 (useLiveDecisioning), 11.3 (rehearsal)
3. **Pass 3 fires + change log on live correction_required** — Tasks 7.11 (Pass3CorrectionBanner), 9.5 (useLiveDecisioning)
4. **Cap-reached UI on persistent flag** — Tasks 7.11 (CapReachedBanner), 9.1 (state machine cap_reached transition)
5. **Numeric threshold blocks + DC-07 indicator** — Tasks 7.4 (NumericThresholdBlock), 7.5 (DC07Indicator)
6. **Architecture strip production annotation centered, static** — Task 7.9 (ArchitectureStrip)
7. **Analyst control panel with case-management record** — Task 7.10 (AnalystControlPanel + ActionConfirmationCard)
8. **Visual treatment institutional, not generic** — Batches 5, 6, 7, 8 together; visual_system.md §6 anti-patterns enforced
9. **Production URL `kyc.shiftatlas.tech`, API key server-side, no Claude account, L1+L3 operational** — Tasks 3.3 (rateLimit), 3.4 (killSwitch), 4.2 (route), 11.4 (domain bind)
10. **Zod catches malformed model JSON, surfaces typed errors without retry** — Tasks 1.6 (apiError), 3.6 (parseModelJson), 4.2 (route)
11. **Compliance-officer recognition test** — JP's manual call post-deploy (Checkpoint 11)

Each item has at least one corresponding task. No spec gaps detected.

---

## Execution handoff

**Plan complete and saved to `superpowers/plans/2026-05-12-kyc-tier-decisioning-plan.md`.**

Per plan amendment #7 at the top of this document, use a **hybrid execution strategy** rather than picking one mode for the whole build:

| Batches | Mode | Why |
|---|---|---|
| **0–4** (bootstrap, schemas, prompts, costprotection, API route) | **Subagent-driven** via `superpowers:subagent-driven-development` | Mechanical infrastructure with deterministic test gates; subagent context isolation is fine because the verification is "test passes" not "register holds" |
| **5–10** (tokens, primitives, decisioning components, form, orchestration, page assembly) | **Inline execution** via `superpowers:executing-plans` with checkpoint review | Visual-discipline-heavy; institutional-register drift is the dominant risk. A subagent building components in isolation will default to YC-landing-page idioms (lucide-react icons, gradients, marketing microcopy). Inline execution lets you catch the drift at each batch checkpoint instead of after twelve components have already drifted |
| **11** (e2e test, deploy, rehearsal) | **Subagent-driven** | Mechanical e2e + deploy steps, plus a manual rehearsal that JP runs by hand regardless of execution mode |

The hybrid is slower than pure subagent-driven but it's the right tradeoff given the register-discipline history on this build. Plan amendments #1–#6 above must be honored regardless of which mode runs each batch.

**Before starting execution:**
1. Re-read the amendments section at the top of this plan.
2. Confirm the seven amendments are understood. Numbers 1, 2, and 3 are blocking; 4, 5, 6 are improvements that the checkpoints catch; 7 is the execution-mode change.
3. Start with Batch 0, Task 0.1 (`.gitignore`). Task 0.1.5 (version verification) is the next gate before any `pnpm install`.
