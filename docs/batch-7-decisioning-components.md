# Batch 7 — decisioning components and methodology

Reference document for Batch 8 composition (form + analyst control surfaces) and Batch 11 pre-deploy review. Captures the composition-layer findings produced across Tasks 7.1–7.6 so that Batch 8 component authors do not re-derive primitive consumption contracts under dispatch-directive time pressure, and so that pre-deploy review has a single artifact against which to verify orchestration-layer trust boundaries.

Source material: commits `d2c01f4` (Task 7.3) through `e9f37c5` (Task 7.6). Each component's docstring is the authoritative inline reference; this document is the cross-cutting view.

This document is the second in the synthesis series after `docs/batch-6-primitive-bindings.md` (commit `278a339`). Batch 6 established the primitive-layer architecture methodology; Batch 7 validates it at the composition layer and observes it scaling toward the orchestration layer that Batch 9 will introduce.

---

## Section 1 — per-component bindings

Eleven components landed in Batch 7 across `components/decisioning/`: six primary composition surfaces and five sub-components. The table summarizes spec anchors, primitives composed, and sub-component dependencies. Trust-boundary and orchestration-obligation prose follows per primary component (sub-components inherit their parent's trust boundary; their per-row treatment is brief).

| Component | Spec anchors | Primitives composed | Sub-components |
|---|---|---|---|
| AuditPanel | §5.2; Decision 27; Decision 41 (S1, S3, Path X); Amendment 4 | Card, Chip, TabularNumber | PassHeadline, ElapsedTimeIndicator, SeverityStrip, AuditCheckRow, ThresholdVerificationBlock, DC07Indicator |
| ThresholdVerificationBlock | §5.2 lines 247–261; Decision 23 | TabularNumber | — |
| DC07Indicator | §5.2 lines 263–271; Decision 25 corollary; PRIMARY_PROMPT.md §4.6; Amendment 4 | Chip ×2 | — |
| ExaminerNotes | §5.3; Decision 7; Decision 11; Decision 37; Amendment 13 | Card, ChevronDisclosure, TabularNumber | ExaminerNotesSection |
| ArchitectureStrip | §5.4; Decision 13; Decision 42; Amendment 5 | Card | — |
| Pass3CorrectionBanner | Decision 8; Decision 20; Decision 27; PRIMARY_PROMPT.md line 335 | Card, Chip, ChevronDisclosure | — |
| PassHeadline (sub of AuditPanel) | §5.2 lines 230–237; Decision 41 S3 | — | — |
| ElapsedTimeIndicator (sub of AuditPanel) | §5.2 line 234; Decision 41 S1 | TabularNumber | — |
| SeverityStrip (sub of AuditPanel) | §5.2 line 273 | TabularNumber ×3 | — |
| AuditCheckRow (sub of AuditPanel) | §5.2 lines 241–245 | Chip | — |
| ExaminerNotesSection (sub of ExaminerNotes) | Amendment 13 small-caps treatment | — | — |

### AuditPanel

Trust boundary: AuditPanel owns the per-check reveal slicing (`revealedCount` prop drives the visible window) and the consumption of Amendment 4's normalized `_dc07_structured_record` + `_dc07_prose` flags. The component does not own the canonical sort — caller passes pre-sorted checks per Decision 41 Path X. The component does not own the per-check ticking animation — Batch 9 state machine drives the cadence by incrementing `revealedCount` over time. Read-only by Decision 17 framing: no override action affordances surface in this component; the override action lives at AnalystControlPanel (Batch 8) where analyst decision authority is concentrated.

Orchestration obligations in Batch 9:
- Apply `sortChecks()` from `lib/orchestration/sortChecks.ts` once on persona load; pass the sorted `pass2.checks` array to AuditPanel.
- Drive `revealedCount` from 0 to `checks.length` over time at the Decision 41a-named pacing (80–120ms per check). Same pacing for persona playback and live mode.
- Live mode only: pass `live={true}` and `startedAt={Date.now()}` so ElapsedTimeIndicator activates per Decision 41 S1 500ms threshold. Persona playback omits both props (live defaults to false).
- Pass 2 schema validation must run through `lib/schemas/personaAdapters.ts::loadPersona` so the `_dc07_*` flags are normalized. Bypassing the normalizer (feeding raw `personasData` to AuditPanel) silently flips the DC-07 indicator halves to FAIL — caught by AuditPanel.test.tsx's negative regression guard, but composition layer should not rely on the guard to catch its mistake.

### ThresholdVerificationBlock

Trust boundary: the block trusts its caller to pass an `AuditCheck` where `check_type === 'numeric_threshold_verification'`. Status text "→ PASS" / "→ FAIL" derives from `check.status` (lowercase per Pass 2 schema). The block does not Card-wrap — it adds its own `--border-default` border for sub-block separation inside AuditPanel's existing Card per §5.2 line 247 "bordered sub-block inside the audit panel" framing.

Orchestration obligations in Batch 9:
- AuditPanel filters numeric_threshold_verification checks from the regular check list and renders ThresholdVerificationBlock instances after the regular rows. The block does not appear inline with regular AuditCheckRow rendering — different visual treatment per §5.2.
- Null defense: `profile_value`, `rule_threshold`, `comparison_result` are nullable per Pass2 schema. Block renders em-dash for null values rather than empty cells.
- Numeric formatting flows through `lib/ui/format.ts::formatPhp` for `number`-typed inputs; string inputs render verbatim. Persona JSON carries pre-formatted strings ("PHP 850,000"); the numeric path defends against live-input flows where the model may return raw numbers.

### DC07Indicator

Trust boundary: indicator renders two Chip instances per Decision 25 corollary's "don't collapse into a single status chip" discipline. Each Chip's status (PASS or FAIL) maps from a boolean prop; the chips themselves do not know they belong to a DC-07 indicator. Composition layer (AuditPanel) extracts the booleans from `pass2._dc07_structured_record` and `pass2._dc07_prose` — caller is responsible for the Amendment 4 normalizer dependency.

Orchestration obligations in Batch 9:
- The Amendment 4 normalizer dependency is enforced at the AuditPanel composite test layer (positive + negative regression guards), not at the indicator's own test. Any new orchestration consumer (e.g., Batch 9 persona playback hooks) must use `loadPersona` rather than raw `personasData` access.
- The "dual visibility is the credibility moment" discipline (§5.2 line 271) means both halves render even when both are PASS. Composition layer must not optimize the indicator out of view on the assumption that "everything passed."

### ExaminerNotes

Trust boundary: ExaminerNotes owns the collapsed/expanded state via internal `useState`. Collapsed view renders `pass1.summary_finding` (top-level 2-sentence string per Decision 11 — NOT `examiner_notes_full.decision_summary`, the paragraph inside the structured object). Expanded view renders all six sections of `examiner_notes_full` via ExaminerNotesSection iteration, with conditional null-skip on `recommended_edd_procedures` for Standard-tier personas (Maria). The component does not Tooltip-wrap inline rule IDs — rule ID mono treatment per §5.3 is the spec-named affordance; hover-definitions on rule IDs are unrequested per the field-mapping discipline.

Orchestration obligations in Batch 9:
- Component receives `pass1: Pass1Output` + `personaName` + `customerReference` props. Caller is responsible for resolving Pass 1 output through `lib/schemas/personaAdapters.ts::loadPersona` (Amendment 13's `ExaminerNotesFullSchema` validation runs in the normalizer).
- The two-layer disclosure pattern is internal to ExaminerNotes — composition layer does not pass an `open` prop or coordinate disclosure state. State machine drives persona switching, which unmounts and remounts ExaminerNotes (the disclosure state resets per persona, which is the intended behavior).

### ArchitectureStrip

Trust boundary: ArchitectureStrip owns the five-box render via internal `STRIP_BOXES` array; the strip does not take a `boxes` prop. The component is stateless (no `useState`, no `useEffect`) and fully server-renderable. The middle-box-vs-flanking distinction is encoded in the array data, not in the component's prop surface. Decision 42's static-positioning discipline is enforced at the test layer via six anti-spec regression guards (no button role, no hover utilities, no transition/animate, no SVG, no tooltip, no rounded utility).

Orchestration obligations in Batch 9:
- ArchitectureStrip is conditional on `state.phase === 'complete' || state.phase === 'cap_reached'` per plan recipe Task 9.5 reference (line 6655). Renders below the persona content; mobile responsive treatment is CSS-level via Tailwind `md:` breakpoint (no JS coordination needed).
- The component has zero data dependencies — orchestration only needs to decide whether to mount it, not what to pass it. Lightest orchestration surface in Batch 7.

### Pass3CorrectionBanner

Trust boundary: banner owns the collapsed/expanded change-log state via internal `useState`. Composition layer passes `pass3: Pass3Output`; banner renders the `change_log` array per Decision 20's field/before/after/reason format. The banner is render-context-agnostic — no `displayContext` prop, no `inModal` prop, no DOM context inspection. Banner appears identically standalone vs nested in any parent context, regression-guarded at the test layer.

**Render-context-agnostic discipline is established and regression-guarded here, but the inside-Modal placement is exercised only at Pass3RaceBanner.** Pass3CorrectionBanner always renders above the AnalystControlPanel (Batch 8) in the default case; the discipline establishment is forward-looking for Pass3RaceBanner (Batch 8 deferral), which IS the banner-inside-Modal case per §5.5 line 369. The race banner inherits the discipline at the point where it exercises the banner-inside-Modal placement. A future maintainer reading this synthesis doc should not infer that the correction banner exercises the inside-Modal case — but should infer that the regression guard at the correction banner's test layer is the discipline's enforcement mechanism, which the race banner re-uses verbatim.

Orchestration obligations in Batch 9:
- Pass3CorrectionBanner renders only when `state.pass3 != null` (live mode only per Decision 27; persona playback locks PASS clean and Pass 3 doesn't fire). Composition layer at AnalystControlPanel orchestrates the banner's parent placement; the banner does not check live-vs-playback itself.
- Banner lifecycle is owned by the parent state machine. Banner does not auto-dismiss; banner does not include an acknowledge action that mutates parent state. State changes (e.g., new persona load, re-audit completing) drive banner appearance/disappearance via parent rerender.

### Sub-component notes

**PassHeadline — sub-component of AuditPanel.** Decision 41 S3 persistent section label. Four spec-named variants (recommendation / audit / correction / reaudit) cover the full Pass 1 / Pass 2 / Pass 3 surface. h2 element with `--text-lg --font-semibold --text-text-primary --font-sans`. No state, no effects. Reusable for any pass-naming surface in Batch 9 (Pass 1 / Pass 3 panels not yet built will likely compose it).

**ElapsedTimeIndicator — sub-component of AuditPanel.** Decision 41 S1 live-mode counter. Renders nothing when `live=false`; renders nothing when `elapsed < 500ms`; otherwise renders elapsed seconds via `formatElapsed` through TabularNumber. 200ms cadence via `setInterval`. Cleanup on unmount via effect return. Live-mode *meaning* is owned by AuditPanel; ElapsedTimeIndicator consumes a `live` boolean as the activation gate. The indicator does not know what "live" means orchestrationally (live persona-input mode vs persona playback) — only whether to render.

**SeverityStrip — sub-component of AuditPanel.** §5.2 line 273 three-count strip. Stateless. Composes three TabularNumber instances for column-aligned count display. No per-category color encoding — counts read literally without status semantics (status semantics belong to the per-check chips, not the aggregate counts).

**AuditCheckRow — sub-component of AuditPanel.** §5.2 lines 241–245 per-check rendering. Grid layout with four columns (rule_id mono / status Chip / evidence_note sans / regulatory_citation mono-xs). Status mapping from lowercase persona JSON to uppercase Chip status is the row's composition responsibility (closed three-element set; no fallback needed).

**ExaminerNotesSection — sub-component of ExaminerNotes.** Amendment 13 small-caps section label + prose paragraph. Renders one section: `(label, content)` props. Caller (ExaminerNotes) handles null-skip via array filter before mapping; the section component does not check for null itself. Trust-boundary discipline propagated one layer down — null defense lives at the caller, format discipline lives at the section.

---

## Section 2 — methodology

The patterns below emerged across Tasks 7.1–7.6 and validate Batch 6's primitive-layer methodology at the composition layer. They constitute a composition-layer architectural methodology that builds on Batch 6's foundation; the two synthesis docs read as a coherent series rather than independent artifacts.

### Carry-forward from Batch 6: the three-layer trust-boundary pattern

Batch 6 established the trust-boundary pattern at the primitive layer (primitives don't enforce composition-context rules; reserved-token discipline is composition-layer responsibility). Batch 7 validates the pattern at the composition layer (composition components own per-component state and orchestration contracts; they don't reach into orchestration-layer concerns like timing animation, state machine cadence, or persona switching). Batch 9 is forecast to extend the pattern to the orchestration layer (state machine owns timing and lifecycle; it doesn't reach into composition-layer concerns like which sections render in expanded view).

The three-layer formulation: each layer trusts its consumer to provide the right context; no layer reaches into the next to enforce upward concerns. Empirical instances from Batch 7:

- Chip primitive trusts AuditCheckRow for reserved-token rules; AuditCheckRow trusts AuditPanel for the per-check ticking sequence; AuditPanel trusts the Batch 9 state machine for the `revealedCount` increment cadence.
- Card primitive trusts ArchitectureStrip for variant choice per box; ArchitectureStrip trusts the page-layout composition for mount/unmount conditional on state phase.
- ChevronDisclosure primitive trusts ExaminerNotes for the disclosed content; ExaminerNotes trusts persona-loading orchestration for the Pass 1 output.

The pattern is no longer a discipline applied in one batch — it is the operating architecture across two layers (primitive established at Batch 6, composition validated at Batch 7), with the third layer (orchestration) forecast for Batch 9 when the state machine introduces lifecycle and timing concerns.

### Family 1 — spec corpus is plural

Three findings catalyzed by separate tasks share a root: spec content lives across multiple documents in the corpus, and naive single-document spec reads produce drift.

**Cross-document spec synthesis — Pass design docs as visual-treatment reference (Task 7.1 catalyst).** `visual_system.md` is the primary visual treatment reference but not the only one. Pass-specific design docs (`05_PASS_1_DESIGN.md`, `06_PASS_2_DESIGN.md`, `07_PASS_3_DESIGN.md`) carry "What this enables in the React UI" sections that name component-level rendering specifics not in `visual_system.md` §5. The AuditPanel's overall_status chip in the header is sourced from `06_PASS_2_DESIGN.md §3`, not from `visual_system.md` §5.2 — naive reading of §5.2 alone would have classified the chip as a spec deviation when it is in fact spec-aligned content from a different file. Implementation methodology: every decisioning-component task's pre-read includes the corresponding Pass design doc's UI-enablement section alongside `visual_system.md` §5.

**Spec-reference field-name disambiguation (Task 7.4 catalyst).** When a decision doc references field content in shorthand ("summary finding", "full notes"), the schema is authoritative for which field actually holds that content. Decision 11's "summary finding" maps to `pass1.summary_finding` (top-level 2-sentence string), NOT `pass1.examiner_notes_full.decision_summary` (a paragraph inside the structured object). Same-or-similar field names across spec layers (decision doc vocabulary plus schema doc names) require explicit disambiguation; distinctive content anchors (the "2 sentences" anchor in Decision 11) are the resolution signal. Implementation methodology: at field-mapping ambiguity, the schema's field-name is the contractual identity; the decision doc's shorthand is the surface-mapping intent.

**Dispatch-directive synthesis under spec-corpus plurality (Task 7.6 catalyst).** The same cross-document discipline that applies to component implementation applies to dispatch-directive drafting. The Task 7.6 dispatch directive name-tagged "Pass 3 correction banner" (Decision 8 / Decision 20 component) but pulled in the race banner's `--violation-warn` token + banner-inside-Modal trust-boundary case + spec line citations (§5.5 lines 367, 369). Compact formulation: **spec citations in directives carry no special trust — they are subject to the same verification at the implementation layer.** A mis-cited line number plus a mis-cited token plus a mis-cited trust boundary collapsed into a conflated dispatch that would have produced the wrong implementation if the spec walk had not caught it. The spec-walk discipline is bidirectional: it protects implementation from directive errors as well as from over-specified plan recipes.

### Family 2 — discipline-as-implementation

Three findings about how spec-named disciplines become test-layer constructs. Where Batch 6 established the spec-silence regression-guard pattern at primitive scope, Batch 7 scales the pattern to full-component scope and observes its broader applicability.

**Spec-discipline regression guards at the test layer (Tasks 7.1 + 7.4 generalization).** Batch 6 established the spec-discipline regression-guard pattern at primitive scope (per the three-silence-category framework, Task 6.6 close-out, where does-not-contain assertions encode the spec-silence-as-discipline category). Batch 7 scales the pattern to full-component scope and observes its broader applicability: composition-layer disciplines that resist drift toward natural-feeling-but-wrong implementations also belong as test-layer assertions, not as code comments or docstring discipline notes. Empirical instances from Batch 7:

- AuditPanel concern-separation guard: `expect(screen.queryByRole('button', { name: /override/i })).not.toBeInTheDocument()` enforces Decision 17 boundary against a future maintainer adding an override action inside AuditPanel.
- ExaminerNotes field-mapping guard: `expect(summary_finding text).toBeInTheDocument()` plus `expect(decision_summary text).not.toBeInTheDocument()` in collapsed view enforces Decision 11's 2-sentence anchor against a future maintainer "improving" the disclosure code to render the more natural-feeling `decision_summary` paragraph.
- Anti-spec affordance prohibitions across Tasks 7.1 / 7.3 / 7.4: encoded as `not.toBeInTheDocument()` / `not.toHaveClass()` assertions.

The pattern's shape: a spec discipline that would dissolve under casual refactor becomes a structural test that survives the refactor. The test cites the spec source in the description so a future maintainer encountering the test failure understands the discipline rather than treating the test as obstacle.

**Anti-spec as load-bearing implementation (Task 7.5 catalyst).** When a component's spec is dense with explicit rejections, the test layer's positive prohibitions become the primary implementation deliverable. Decision 42 explicitly rejected three interactive treatments for the architecture strip (click-to-expand, hover-to-expand, always-expanded second tier). ArchitectureStrip's six anti-spec regression guards (no button, no hover utilities, no transition/animate, no SVG, no tooltip, no rounded utility) operationalize the rejection list — the component's "what it doesn't do" is more load-bearing than "what it does." Generalizes the Tooltip / Modal spec-positive-prohibition pattern from Batch 6 (per-affordance guards at primitive scope) to a full-component scope at Batch 7 (six guards on a single component, density proportional to the rejection list's density).

**Static positioning artifacts vs interactive components (Task 7.5 catalyst).** A distinct category: positioning surfaces (ArchitectureStrip — institutional commentary, no interaction) operate by different rules than action surfaces (AnalystControlPanel — analyst-facing, action-enabling). Decision 42's discipline of refusing affordances even where they would be technically possible is the boundary signal. The category distinction informs trust-boundary reasoning at the composition layer: positioning components have no orchestration coupling beyond mount/unmount conditional on state phase; action components have rich orchestration coupling (state machine drives lifecycle, persisting actions, transitioning UI states). Implementation methodology: at component scoping, identify the category first; the category determines what trust boundaries to establish.

### Family 3 — composition-layer judgment

Two findings about choices specific to the composition layer — neither rises from spec interpretation alone; both emerge from how the composition reads against the spec's intent.

**AuditPanel–AnalystControlPanel concern separation (Decision 17).** Decision 17 (analyst as decision authority, not final approver) implies a concern boundary between display surfaces and action surfaces; AuditPanel honors this by being read-only. Display surfaces ("what the audit found" — factual record) live in AuditPanel; action surfaces ("what the analyst decided" — judgment record) live in AnalystControlPanel per §5.5. Co-locating an override action inside AuditPanel would dissolve the boundary Decision 17 draws. Enforced by a regression-guard test in `AuditPanel.test.tsx`: `expect(screen.queryByRole('button', { name: /override/i })).not.toBeInTheDocument()`. Future composition-layer work that adds action affordances must add them at AnalystControlPanel, not AuditPanel — the test guard surfaces the violation immediately if drift occurs.

**Composition register-fitness — primitive applicability is context-sensitive (Task 7.4 catalyst).** Primitive composition fitness depends on whether the primitive's affordance matches the surface context. TabularNumber is correct in column / arithmetic contexts (SeverityStrip counts, ThresholdVerificationBlock PHP amounts, ElapsedTimeIndicator seconds) where the entire numeric value is the rendered surface; it is wrong in prose contexts (ExaminerNotes paragraph PHP amounts like "PHP 80,000/mo") where the numeric value is embedded in narrative with non-numeric suffixes that do not tolerate partial-string wrapping. The decision is not "use the primitive everywhere a number appears" — it is "use the primitive where the numeric value is the rendered surface." Same primitive, different composition contexts, different fitness. Generalizes beyond TabularNumber: any primitive's composition fitness depends on whether the primitive's affordance matches the surface context. Implementation methodology: at composition choice, identify what the primitive's affordance is for and whether the surface context demands that affordance.

### Closer — meta-pattern empirically validated

Across Batch 7, the spec-walk discipline caught three dispatch-directive errors before implementation:

- Task 7.1: spec walk caught the Button + ChevronDisclosure composition-map errors (Q1 + Q2 — Button vestigial reference, ChevronDisclosure with no spec-named expanded content). Resolved to omit before implementation.
- Task 7.4: spec walk surfaced the field-mapping ambiguity (Decision 11 "summary finding" vs `examiner_notes_full.decision_summary` schema field). Resolved by anchoring on the "2 sentences" distinctive content marker.
- Task 7.6: spec walk caught the banner-component conflation (correction banner name with race banner attributes — `--violation-warn` token and banner-inside-Modal trust boundary). Resolved by scope-correcting to the correction banner and deferring the race banner to Batch 8.

The empirical validation is not that flags exist — flags would exist in any disciplined process. The validation is that the flag step operates as a **bidirectional discipline**: it protects implementation from directive errors AND it protects directive drafting from spec-corpus conflation. Task 7.6's catch is the clearest evidence of the bidirectional read — the dispatch directive itself committed the cross-document synthesis discipline failure that Family 1's findings name, and the spec walk caught it before it propagated downward into wrong code.

The discipline is operative because the cost asymmetry holds at both directions. A flag costs one round-trip clarification. A flag-skipped implementation costs rework — primitive substitution, regression-guard recalibration, commit-body amendment for the corrected anchors, and the cognitive overhead of distinguishing what's spec-aligned from what was directive-aligned-but-spec-conflated. A flag-skipped dispatch costs ripple-effect rework across multiple components if the conflation lands in directive vocabulary that subsequent dispatches re-use. The asymmetry is large enough at both directions that the flag step pays for itself many times over.

The meta-pattern observes the methodology operating: discipline-as-implementation, spec-corpus plurality, and trust-boundary reasoning all interact at the flag step. Spec-corpus plurality surfaces directive errors (Family 1); trust-boundary reasoning identifies what was conflated (Family 3); discipline-as-implementation determines what regression guards encode the resolution (Family 2). The framework's pieces are not independent — they operate as one architectural reasoning system at the implementation-decision point. This is what makes the pattern operative for Batch 8 forward: not the individual flags but the system of reasoning the flags exercise.

---

## Things-to-Flag verifications confirmed at Batch 7 synthesis

One Batch 11 prerequisite inheritance reference was corrected at the parent-thread close-out of the prior chat. Confirming the correction matches the Batch 7 implementation evidence:

| Item | Resolved state |
|---|---|
| Tooltip mobile tap-to-dismiss (Task 6.5) | Inheritance reference updated: ExaminerNotes did NOT compose Tooltip (rule-ID hover-definitions are not a spec-named affordance; see Task 7.4 dispatch resolution). Sole composition-layer consumer is now Batch 8 `CustomInputForm` per §5.6 line 400. `04_BUILD_PLAN.md` Things-to-Flag entry reflects this. |

No new Batch 11 prerequisites surfaced during Batch 7 — composition-layer work did not introduce new spec-silent gaps requiring ratification (the three existing primitive-layer prerequisites from Batch 6 remain the active list).

---

Drafted at Task 7.6 close. Source commits: `d2c01f4` (Task 7.3), `e675df2` (Task 7.2), `92ee062` (Task 7.1), `d767ddc` (Task 7.4), `ed1204a` (Task 7.5), `e9f37c5` (Task 7.6). Synthesis-doc trigger held to batch close per the locked sequencing from Task 6.6 approval.
