# Design Decisions Log

Durable record of architectural decisions, drift findings, and rationale that doesn't fit in commit messages, source code comments, or the implementation plan. Read this alongside `PRIMARY_PROMPT.md` (the locked spec), `superpowers/plans/2026-05-12-kyc-tier-decisioning-plan.md` (the implementation plan with amendments 1–13), and `visual_system.md` (the visual register).

Entries are ordered most-recent-first within each section.

---

## Pass 1/2/3 prompt template embedding (Batch 11A Phase 2, 2026-05-17)

Batch 11 rehearsal of the deployed Vercel preview against the live Anthropic API on `claude-sonnet-4-6` surfaced a reproducible Pass 1 schema mismatch: `Pass1OutputSchema.parse()` failed with `decision: undefined` and `examiner_notes_full: string` on every custom-input form submission, regardless of profile. The four locked personas continued to PASS clean because the locked-persona playback path is JSON-replay against `data/personas.json` content and does not exercise the live API.

### The empirical Phase 1 finding (raw response vs schema)

Phase 1 diagnostic capture (`/tmp/diagnose_pass1.mjs`, executed against the live API by JP in a parallel session) produced two structural mismatches plus several spontaneous-field additions:

1. **Flat decision fields.** The model emitted `recommended_tier`, `decision_basis`, `decisive_rule_ids`, `senior_approval_required`, `onboarding_hold`, and `hold_reason` at the document root rather than nested under a `decision` object. `Pass1OutputSchema` is `z.looseObject`, so the flat fields were silently absorbed without producing additional issues, but the required `decision` key was absent and tripped the strictObject check inside `DecisionSchema`.
2. **`examiner_notes_full` as a prose string.** The model emitted the examiner notes as one ~500-word prose blob rather than a six-key object with `decision_summary` / `profile_analysis` / `rule_application_and_risk_pattern` / `considered_alternatives` / `recommended_edd_procedures` / `audit_trail` sub-fields. The UI renderer (`components/decisioning/ExaminerNotes.tsx`) iterates those six keys directly, so a string-shaped value breaks the entire panel even before the schema check.
3. **Field-name variants.** The model emitted `senior_management_approval_required` (instead of `senior_approval_required`) and `hold_onboarding` (instead of `onboarding_hold`) at the flat decision-fields level. These would have continued silently absorbed by `z.looseObject` if the wrapping `decision` key had been present at all.
4. **Spontaneous metadata.** The model also emitted `pass`, `customer_reference`, `timestamp_utc`, `rules_considered_not_fired` (with renamed shape), `compounding_pattern_*` fields (`compounding_pattern_present`, `compounding_factors`, `compounding_interpretation`), and `score_vs_decision_note` — all outside the schema's declared fields.

Root cause: the Pass 1 system prompt described the output shape in prose ("Layer 1 — Structured Decision (JSON)" / "Layer 2 — Examiner Notes (Prose)" / "Layer 3 — Summary Finding") but never embedded a literal JSON template the model could conform to. "Conform exactly to the schema provided" pointed at a schema that wasn't actually inlined. The locked-persona JSONs were manually curated from prose-then-JSON Claude chat sessions during persona generation (`08_PERSONA_OUTPUTS.md` provenance), which masked this underspecification during Batches 1–10 — every test of the Pass 1 contract before Batch 11 used the curated JSON, never live model output.

### Path Q rationale: constrain, don't expand

Two directions were considered for the v1 fix:

- **Path P (expand schema).** Adopt the spontaneous fields the model actually produced — add `compounding_pattern_*` to the schema, accept `score_vs_decision_note`, etc. This would have aligned schema to model behavior and unlocked the model's natural emit pattern.
- **Path Q (constrain prompt).** Tighten the prompt to instruct the model to emit ONLY the schema's declared fields, with the exact field names and structure. Schema stays as v1 source of truth; spontaneous fields are excluded.

Path Q chosen because (i) the locked personas are the canonical v1 contract for the UI rendering layer and downstream Pass 2 / Pass 3 inputs — adopting spontaneous fields would invalidate the persona lockfile or require dual-shape handling everywhere; (ii) the spontaneous fields are useful but unproven — adopting them in v1 without dedicated UI / schema modeling would create a "loosely defined" surface that downstream consumers cannot rely on; (iii) the existing 671-test surface is built around the strict-shape Pass 1 contract — expanding schema would require touching the entire test surface, not just the prompts.

### Fields the model produced but we explicitly did NOT adopt (deferred to v1.1)

These are reasonable additions that the model surfaces spontaneously. Preserving the rationale here for future v1.1 consideration:

- **`compounding_pattern_present` (boolean) + `compounding_pattern_factors` (array of contributing-factor objects) + `compounding_pattern_interpretation` (prose explanation).** The Pass 1 prompt has substantial "Risk Pattern Analysis — Critical Instruction" guidance that the model is correctly applying. Without these fields in the schema, the analysis collapses into the `rule_application_and_risk_pattern` prose paragraph (which is correct rendering behavior for v1 but loses the structured signal). v1.1 could add a top-level `risk_pattern_analysis: { compounding_pattern_present, contributing_factors[], pattern_interpretation }` object and have the UI surface it as a dedicated panel below the rules-fired list.
- **`score_vs_decision_note` (prose, inside `risk_score`).** The model uses this to flag cases where the score-based tier and the operative tier diverge (e.g., Maria: score 0 → SDD-eligible band, but TE-02 volume-band governs Standard). The locked persona JSON for Maria already carries this field; the schema's `risk_score: z.looseObject` absorbs it. v1.1 could promote it to a declared field with a typed annotation for the UI's reasoning-transparency panel.
- **`rules_considered_not_fired` (array, with shape `{rule_id, fired:false, exclusion_reason}`).** The schema declares this as `considered_rules` with field `confidence_basis`. The model's spontaneous shape is more semantically accurate (a rule was considered and explicitly excluded; `exclusion_reason` reads better than `confidence_basis`). v1.1 should rename `considered_rules → rules_considered_not_fired` and `confidence_basis → exclusion_reason` for the canonical shape, OR add the renamed shape as a sibling and deprecate the old one.
- **`pass`, `customer_reference`, `timestamp_utc` (top-level metadata).** Useful for audit-trail wiring; v1 routes the audit-reference-id through orchestration context and timestamps responses at the route handler. v1.1 could add a top-level `metadata: { pass, customer_reference, timestamp_utc, ruleset_version, model_id }` object — the locked persona JSON for Maria has a `metadata` block carrying these.

The v1 prompts now explicitly tell the model to OMIT these fields. v1.1 work will revisit which of them belong in the schema and add them under controlled types, with corresponding UI surfaces.

### Pass 2 and Pass 3 — preventive scope (Amendment 4)

The same template-embedding pattern was applied to Pass 2 and Pass 3 prompts even though the live-API failure surfaced only on Pass 1. Reason: the locked personas for all three passes share the same provenance (manual curation from prose-then-JSON Claude chat sessions), so all three carry the same latent prompt/schema gap. Pass 2 and Pass 3 would have failed on their next live-API tests for the same reasons. Fixing all three in one dispatch prevents a cascade of follow-up batches.

### Pass 3 specifically — schema-vs-prompt nested-envelope deferral

The Pass 3 prompt previously had a `# Output Schema` section describing a NESTED envelope (`{ corrected_pass_1_output, correction_metadata: { change_log, addressed_violations, ... }, metadata: { ... } }`) while `Pass3OutputSchema` is FLAT (`{ correction_against_audit_id, correction_attempt_number, corrected_pass_1_output, change_log }` at root). This is the gap documented in Findings 4/5 above. The Batch 11A Phase 2 template embedding uses the FLAT shape — matching what the schema currently accepts — and explicitly removes the prior nested-envelope `# Output Schema` section. The schema-vs-prompt tightening question (rewrite `Pass3OutputSchema` to nested, or keep flat as canonical?) is deferred to a separate dispatch per JP's Phase 2 directive: "the schema-tightening to nested envelope per the build plan's deferred Resolution(Batch 11) is out of scope for this dispatch — defer."

Concurrently with the FLAT-shape template, three secondary edits in the Pass 3 prompt reconcile prior prose with the schema's field names:

- The "every entry must populate `cascade_basis`" instruction was softened to "Apply this cascade discipline conceptually when deciding which fields belong in your `change_log`" — the schema has no `cascade_basis` field; cascade rationale now goes in the entry's `reason` field.
- The "Cascade basis" instruction in the `full_regeneration` scope was reworded similarly.
- The Register Requirements section's reference to `change_log[].rationale` was corrected to `change_log[].reason` to match `ChangeLogEntrySchema`.

### Regression guards

Three invariants tests added to `lib/prompts/invariants.test.ts` (invariant D — JSON output template embedded per pass), one per pass. Each asserts (i) a fenced ```json block is present in the stripped prompt, (ii) every schema-required top-level field name appears literally in the template, (iii) the Path Q "Do NOT add fields not in this template" instruction is present. The Pass 3 invariant additionally asserts the template does NOT contain `correction_metadata` — the nested-envelope shape that the schema rejects.

Nine live-API smoke tests added at `tests/smoke/pass{1,2,3}.live.smoke.test.ts` (three per pass), gated on `INTEGRATION=real` per existing smoke-test convention. The Pass 1 tests exercise three real profiles (clean baseline, foreign PEP self, OFW + minor adverse media). The Pass 2 tests feed locked-persona Pass 1 outputs (Maria / Carlos / persona_c) as the audit-input. The Pass 3 tests pair locked-persona Pass 1 with synthetic Pass 2 fixtures that drive each of the three correction scopes (`structured_decision_only`, `examiner_notes_only`, `full_regeneration`). The synthetic Pass 2 fixtures are plausible but non-load-bearing — only response-shape conformance against `Pass3OutputSchema` is asserted.

### Locked-persona provenance note (why this wasn't caught earlier)

The four locked persona JSONs in `data/personas.json` (Maria / Carlos / persona_c / persona_d) were generated by manual curation from prose-then-JSON Claude chat sessions during persona generation (per the `08_PERSONA_OUTPUTS.md` provenance trail), NOT by live API calls against the v1 prompts. The persona generation process was: prose-only Claude session produces the analysis narrative for the persona; a separate JSON-shaping step converts the narrative to the canonical schema shape. The resulting JSON was schema-valid by construction because the JSON-shaping step targeted the schema, not the prompt.

This curation flow was efficient for v1 demo readiness — locked personas exercise the full UI / state-machine / orchestration path without burning live API tokens during development — but it concealed the prompt/schema gap. The first live API call against the v1 prompts is, by design, the Batch 11 deployed-preview rehearsal; that rehearsal exposed the gap. Future personas should be generated by live API calls against the v1 prompts (then locked) so the prompt-vs-schema integrity is verified at persona creation time, not Batch 11.

### Amendment 5 dropped (defensive prose-stripping unnecessary)

The Phase 1 raw response capture showed `stop_reason=end_turn` with clean JSON-only output and no prose preamble. The existing "No preamble, no explanation outside the JSON" instruction at the prompt level is empirically working. The proposed Amendment 5 (defensive prose-stripping in the route handler before `JSON.parse()`) was dropped — the `parseModelJson` helper at `lib/anthropic/client.ts:34` already handles the markdown-fence edge case (`stripped.trim().replace(/^```(?:json)?...$/...)`) which is the only stripping the live responses need.

### Ratification ledger G6 (post-launch disclosure tightening)

The route handler at `app/api/decisioning/route.ts` currently returns Zod issue detail in the body of 400 responses (`{ pass, errorType, zodIssues, message, retryable }`). This is an information-disclosure smell for production — internal schema field paths and expected-type strings are visible to any client. Acceptable for v1 methodology demo (the response body is what enabled the Phase 1 diagnostic without an `ANTHROPIC_API_KEY` in the diagnosing session's subprocess env), but should be tightened post-launch: return a generic 400 to the client; log the zodIssues to Vercel function logs (or an external observability sink) for operator-side debugging. Added to ratification ledger Part G as G6.

---

## Decision ratifications (Batch 11A Dispatch 1, 2026-05-19)

Decisions 36–45 are captured in the project-knowledge build plan; only Decisions 46 and 47 land in this repo file as part of Batch 11A Dispatch 1. See the project-knowledge `04_BUILD_PLAN.md` Batch 11 Ratification Ledger for the broader numbered sequence.

### Decision 46 — Orchestration & State-Machine Behavior (Batch 11A, 2026-05-19)

- **46a. Inter-pass timing — Option A (instantaneous resolution).** Persona playback resolves passes instantaneously rather than introducing synthetic delays. Persona-mode is a documentary of a prior decision, not a re-enactment; synthetic delays would inject consumer-app pacing into an institutional-register surface.
- **46b. Mid-flight persona-switch behavior.** Switching personas mid-flight resets state cleanly via `useEffect [mode]` explicit `reset()` on the previous machine. Future maintainers should not interpret the reset as a bug.
- **46c. Terminal-state headline behavior.** `passHeadlineMap` returns `null` at terminal state; consumers render no headline. Do not substitute a fallback string.
- **46d. "Pass 2 — Re-audit" microcopy.** Short form canonical over "Pass 2 — Audit after correction" or longer alternatives.
- **46e. 41-sublabel notation.** `41a–e` is canonical; do not introduce `41 S1/S2/S3/Path X` alternatives. Aligns with how `36a–h` is used elsewhere in this doc.
- **46f. Network-failure → `upstream_timeout` mapping.** Network failures are synthesized into a canonical `upstream_timeout` error shape. Future debug sessions should know that an `upstream_timeout` in logs may be a real timeout or a synthesized one from a lower-layer network failure.
- **46g. Two-IDs-decoupled (audit_id semantics).** Server-side `audit_id` (Pass 3 orchestration correlation key) and client-side analyst-receipt identifier (generated at click time in AnalystControlPanel) are decoupled by design. They serve different stakeholders and need not correlate. AnalystControlPanel generates its own audit reference at click time from an `auditRefSource` seed supplied by orchestration; orchestration does not propagate a pre-generated ID downward.
- **46h. `'failed'` state + fourth silence category.** The `'failed'` state in the state machine is a project addition over the original spec. Its addition surfaced a fourth spec-silence category — `spec-silence-because-happy-path-assumed` — joining the three existing categories (silence-as-discipline, silence-because-standard-pattern-exists, silence-as-gap). The four-category framework is promoted from build-findings-log to project-knowledge.

### Decision 47 — Page-Level UX & Microcopy Ratifications (Batch 11A, 2026-05-19)

- **47a. PageHeader tagline.** Canonical: "Three-pass reasoning pipeline — Shift Atlas consulting methodology demonstration." Load-bearing for the consulting-vs-product framing.
- **47b. Header: scrollable, not sticky.** Institutional-register convention. Regression-guard via absence of `sticky` / `fixed` classes in PageHeader.
- **47c. Viewport gutter behavior (1024–1280px).** `max-w-[1180px] mx-auto + xl:px-0` pattern; 50px gutter at the 1280px design target. Specific implementation of Decision 39's three-tier viewport hierarchy.
- **47d. AnalystControlPanel mid-flight mounting from `pass_2` onward.** Render-timing decision affecting demo pacing.
- **47e. `pass1` prop dual-mode.** Mid-flight: reads original Pass 1. Terminal: reads corrected Pass 1 if Pass 3 fired, else original. Preserves Decision 36h sub-case (a) "acted on uncorrected output" semantics.
- **47f. `'idle'` state prompt.** Canonical: "Select a persona or fill the custom case form to begin."
- **47g. Cap-reached layout — Option 1 (four stacked sections).** When L1/L3 cost protection triggers, the page renders four labeled sections in order: "Original recommendation" / "Original audit" / "Correction attempted" / "Re-audit findings." Load-bearing for the credibility narrative (the demo's failure mode is intentional and named).
- **47h. Live-mode `'Custom case'` microcopy.** Mode-disclosure label distinguishing custom submissions from persona playback. Substitutes for `customer_reference` in surfaces where mode disclosure outweighs identifier disclosure.
- **47i. CustomInputForm canonically single-column at all viewports.** Closes the ninth-sub-class methodology drift (spec-implies-unimplemented-baseline). Decision 39's "single-column at functional floor" framing is a no-op for this form; the form is canonically single-column. Do not introduce a two-column variant without revisiting this decision.

---

## Schema vs locked-persona reality (Batch 1 findings, Checkpoint 1, 2026-05-12)

Six findings surfaced during Batch 1 from real persona-JSON inspection. JP approved the resolutions at Checkpoint 1. Each entry below captures what was resolved, why, and what downstream tasks should know.

### Pass 2 status case asymmetry (Finding 2)

The locked persona JSON uses **lowercase `"pass"`** for per-check `status` (88 occurrences, zero uppercase) but **uppercase `"PASS"`** for top-level `overall_status`. `Pass2OutputSchema` reflects this asymmetry verbatim:

- `AuditCheckSchema.status`: `z.enum(['pass', 'fail', 'quality'])`
- `Pass2OutputSchema.overall_status`: `z.enum(['PASS', 'PASS_WITH_QUALITY_FLAGS', 'FAIL'])`

**Why preserved (not normalized):** asymmetric values are observable in the locked JSON and likely reflect the prompt's actual output shape — normalizing would mask a real signal. The `isPass()` helper in `lib/schemas/personaAdapters.ts` does case-insensitive comparison for per-check status; downstream code should follow the same pattern OR assert at the level appropriate for the field.

**How to apply downstream:** UI components asserting equality against the literal string `"PASS"` must use the right case for the field's level. `AuditCheckRow` (Task 7.6) compares `check.status === 'pass'` (lowercase). `RecommendationCard` (Task 7.3) or any component reading `pass2.overall_status` uses uppercase.

### Amendment 1 deviation — `extractRuleId` added in Task 1.4, not Task 1.7 (Finding 3)

Plan Amendment 1 said `personaAdapters.ts` lands in Task 1.2.5 (pure normalizers) and is extended additively in Task 1.7 (typed loaders). Task 1.4 (Pass 2 schema) deviated from this: the verbatim test asserts `c.rule_id === 'DC-07'` on Pass 2 checks, but the locked persona JSON has `check_id` (e.g., `"rule_check_DC-07"`) with no `rule_id`. The Task 1.4 implementer extended `normalizePass2` with an `extractRuleId()` helper that surfaces `rule_id` from `check_id` patterns.

**Why accepted:** the alternative was deviating from the verbatim test (which the plan's self-review forbids). The extension is purely additive — existing exports from Task 1.2.5 are untouched. Task 1.7's additive append still works cleanly on top.

**How to apply downstream:** treat `personaAdapters.ts` as ground truth for normalization, not the plan's task-by-task breakdown. If a later task needs to add another normalizer, append; don't rewrite. Document the addition here.

### Pass 3 schema is provisional (Finding 4) — Batch 11 will tighten to live prompt verbatim

The plan's Task 1.5 recipe modeled `Pass3OutputSchema` as a **flat shape** `{correction_against_audit_id, correction_attempt_number, corrected_pass_1, change_log}` with `ChangeLogEntry { field, before, after, reason }`. Inspection of `prompts/pass_3_system_prompt.md` §"Output Schema" revealed the live prompt asks for a **nested envelope** with:

- `correction_metadata` (wraps `change_log`)
- `corrected_pass_1_output` (renamed from `corrected_pass_1`)
- `metadata` block carrying `correction_against_audit_id` / `correction_attempt_number`
- `ChangeLogEntry { field_path, change_type, cascade_basis, rationale }` — different vocabulary, not extension
- Additional sections: `regeneration_scope_applied`, `addressed_violations[]`, `correction_summary`, `preservation_attestation`

**Resolution (Batch 1):** Task 1.5 kept the plan's flat shape with `z.looseObject` tolerance, and added the prompt-contract optional fields at top level. No persona exercises Pass 3 (Decision 27 — all four are PASS clean), so this schema is exercised only by synthetic fixtures until live Pass 3 traffic arrives.

**Resolution (Batch 11):** the Pass 3 schema **will tighten to the live prompt contract verbatim** when live Pass 3 traffic appears during rehearsal. The plan's flat shape is **provisional, not preserved** — Batch 11 will either:
(a) rewrite `Pass3OutputSchema` to match the nested envelope exactly, with `ChangeLogEntry` using `field_path / change_type / cascade_basis / rationale`, OR
(b) keep the flat compatibility shape and add the nested envelope as a typed sibling that translates between them.

The decision between (a) and (b) depends on whether the model emits the nested envelope reliably under temperature/prompt drift. Option (a) is preferred if reliable.

### CustomerProfile wire-variant normalization (Finding 5 → Path B)

Task 1.2 admitted three values to the form-config enum to make locked personas validate. JP's Path B resolution at Checkpoint 1: revert the additions and normalize wire variants → canonical at load time. Implemented in Batch 1.5 follow-up with this nuance: of the three additions, only two were true wire synonyms.

| Field | Persona value | Canonical | Resolution |
|---|---|---|---|
| `pep_status` | `"close associate"` | `"family/close associate"` | Normalize in `normalizeWireVariants` |
| `high_risk_jurisdiction_connection` | `"business"` | `"business operations"` | Normalize in `normalizeWireVariants` |
| `adverse_media` | `"unclear"` | `"unclear"` | **Keep in enum** — canonical per ruleset_v1.md ES-08 (`adverse media = unclear` → Standard minimum, human review). The original three-value enum `['no', 'minor flags', 'material concerns']` was incomplete from the start; `"unclear"` is a real ruleset category, not a wire variant. |

**Why preserved with this nuance:** Path B's premise is that form-config-as-SSOT is broken if the dropdown carries synonyms. That holds for the two synonyms. But `"unclear"` carries information the canonical-three-value enum cannot represent — ES-08 fires on it specifically. Reverting it would silently drop the persona's ability to surface adverse-media uncertainty to the model, which would mask a real audit category. The form config now has four `adverse_media` options (one more than the plan recipe started with) and the live custom-input form will accept all four.

**How to apply downstream:** `loadPersona` in `personaAdapters.ts` is the authorized entry point for persona data. It runs `normalizeWireVariants` before `CustomerProfileSchema.parse`. Any future task that wants to consume persona JSON directly (bypassing `loadPersona`) must also call `normalizeWireVariants` first, OR run through `loadPersona` (preferred). Live custom-input traffic does not need normalization — the live form will only emit canonical values because the dropdown is built from `profileFormConfig.<field>.options`.

### DC-07 heuristic refined past two spec bugs (Finding 6 — note on Amendment 4)

Plan Amendment 4 specified data-driven DC-07 dual-satisfaction flag computation in `normalizePass2`. The recipe contained two latent bugs the Task 1.2.5 implementer caught against real persona JSON content:

1. **Status case mismatch.** Spec wrote `c?.status === 'PASS'` but personas use lowercase `'pass'`. With the spec verbatim, no check would have matched the status guard — both `_dc07_structured_record` and `_dc07_prose` would resolve to `false` for every persona, and the `anyPass`-driven fallback would also fail (it uses the same broken guard). The architectural intent of Amendment 4 (data-driven detection, not theater) would have silently degraded to all-false output.

   **Resolution:** added `isPass()` helper that compares `status.toUpperCase() === 'PASS'` — admits both 'pass' and 'PASS'.

2. **Maria's structured-record check has metadata-only signal.** Maria's first DC-07 entry (`check_id: rule_check_DC-07`, `check_type: rule_firing`) does not contain `rules_fired`, `structured-record`, `audit_trail`, `prose-level`, or `substantive` anywhere in its `evidence_note`. The signal lives only in metadata. The spec regex would have missed it and the fallback would have produced a wrong answer.

   **Resolution:** broadened structured-record detection to include `check_type === 'rule_firing'` and `check_id === 'rule_check_DC-07'` metadata signals. Broadened DC-07 detection filter to also pick up `check_id === 'rule_check_DC-07'`. Used case-insensitive regex with hyphen-or-space variants for robustness.

**Verification:** all four personas now resolve `_dc07_structured_record=true, _dc07_prose=true` directly — no fallback path needed. The Task 7.7 regression guard tests (positive: `loadPersona` produces ✓✓; negative: raw JSON lacks flags) remain valid.

**Why logged here:** these refinements are not a deviation from Amendment 4's intent — they are the implementation that makes Amendment 4's intent actually work. The spec recipe was an inference; the locked persona JSON was the source of truth. Same pattern as Findings 1, 3, 4 in this section.

### `examiner_notes_full` is a structured six-section object (Finding 1 → Amendment 13)

Task 1.3 revealed `examiner_notes_full` in the locked persona JSON is not a string but a structured object with six narrative sub-sections. New `ExaminerNotesFullSchema` export from `lib/schemas/pass1.ts`. `recommended_edd_procedures` is nullable — null for Standard-tier personas (Maria) where EDD operational requirements do not apply.

**Why preserved:** the structured shape carries information that a single string blob discards (which sub-section a given paragraph belongs to). The Pass 1 system prompt's "Output: Two Layers" requirements specify six labeled sections; the persona JSON faithfully encodes that. Flattening to a string would lose the structure that the rendering layer needs.

**Resolution:** Amendment 13 updates Task 7.8 `ExaminerNotes` to render six labeled sections with small-caps section headers, conditionally omitting `recommended_edd_procedures` when null. See plan amendments section.

---

---

## Plan-as-written vs runtime reality

### Decision 35 invariants — strip-known-markers-then-check-residual (Batch 2, Task 2.3)

The plan's Task 2.3 recipe for the A→B direction of the bidirectional marker-set invariant used a per-match check: extract every `[…INSERTED HERE…]` regex match from the source, then assert each match is present in `MARKERS`. Two Pass 3 markers are key-value-style (`correction_against_audit_id: [STRING INSERTED HERE]` and `correction_attempt_number: [INTEGER INSERTED HERE]`). The `ORPHAN_PATTERN` regex `\[[^\]]*INSERTED HERE[^\]]*\]` matches the inner bracket `[STRING INSERTED HERE]` independently, while the canonical `MARKERS.correction_audit_id` entry includes the `correction_against_audit_id: ` prefix. The per-match check would either falsely fail on legitimate key-value markers OR have to weaken to a substring check that wouldn't catch a stray bracket disconnected from its prefix.

**Resolution (Task 2.3 implementer):** **strip-known-markers-then-check-residual.** Build a `stripKnownMarkers(source, knownKeys)` helper that removes every MARKERS entry from a copy of the source, then assert `match(ORPHAN_PATTERN)` on the residual returns empty.

```ts
// Approximate shape:
const known = PASS3_MARKERS.map((k) => MARKERS[k]);
let residual = p3;
for (const k of known) residual = residual.split(k).join('');
expect(residual.match(ORPHAN_PATTERN) ?? []).toEqual([]);
```

**Why strictly stronger than the plan recipe:**
- The full prefixed marker gets stripped as one unit — key-value markers handled correctly.
- A new marker added to the source (drift) cannot match any known string and remains in the residual → orphan pattern catches it → test fails with a clear diagnostic.
- Cannot be fooled by partial-substring matches (the per-match check is vulnerable to this when markers share a common bracketed suffix).

**Why preserved:** Decision 35's three-invariant architecture (A: uniqueness, B: non-empty, C: bidirectional) is unchanged. Only the C-A→B implementation is stricter than the plan recipe could have anticipated — the recipe was written before the marker key-value shape was visible. The B→A direction (every MARKERS entry present in source) is also implemented per the plan, unchanged.

**How to apply downstream:** any future task that adds new markers to `MARKERS` and/or new injection sites in `prompts/pass_*.md` must keep both directions of the invariant green. If a new pass file is added, extend the per-pass marker assignments in `lib/prompts/invariants.test.ts` (`PASSN_MARKERS` constants). The coverage check ensures every MARKERS key belongs to at least one per-pass set.

---

---

## Build Findings Log (Batch 4, 2026-05-12)

Empirical resolutions of deferred questions surfaced during earlier batches. Each entry records what was uncertain, what the verification revealed, and what (if any) code remains contingent on the finding.

### Back-references to spec rules in utility docstrings (Batch 6, Task 6.1)

Pure-function utilities in `lib/ui/` — and by generalization, all Batch 6+ utilities and primitives — cite the `visual_system.md` section or numbered Decision they exist to serve in their docstring header.

Example: `formatElapsed` in `lib/ui/format.ts` cross-references `visual_system.md` §3 (tabular-nums pairing) and Decision 41 (audit-panel ticking pace). `formatPhp` cross-references §3 type discipline as the consumer-site pairing. `cx` in `lib/ui/classnames.ts` states the call-site idiom it's built to enable (`cx('base', active && 'is-active')`) so a future reader understands why the falsy-filter shape is load-bearing rather than incidental.

**Why this discipline:** the back-reference trail resists drift during refactor. A future maintainer cannot repurpose `formatElapsed` for a non-ticking context (e.g., a duration label in a static report) without noticing the Decision 41 anchor and either updating the anchor or choosing a different formatter. Without the anchor, the function name alone admits silent re-use that would propagate ticking-pace semantics into contexts where they don't apply.

**Scope:** utility-layer and primitive-layer discipline. Not required at composition-layer components (e.g., `RecommendationCard`, `AuditPanel`) where the spec link is implicit in the component's visual treatment and the layout grid it occupies. The cost of citing every anchor in a composition component would dilute the signal; the cost of failing to cite anchors in a primitive is silent semantic drift one layer down.

### Upstash wire format

`@upstash/redis` client returns JavaScript `number` type for `incr`, `get`, and `mget` operations on numeric-stored values. Verified empirically via `tests/smoke/upstash-wire-format.smoke.test.ts` against real Upstash database `wired-drake-102218` (Singapore, `ap-southeast-1`).

The `Number(values[i] ?? 0)` coercion in `lib/costprotection/telemetry.ts` is therefore **belt-and-suspenders, not load-bearing** at current client version (`@upstash/redis@1.38.0`). Coercion retained for two documented reasons:

1. Defense against future `@upstash/redis` major-version deserialization changes that could return strings to match raw Redis wire protocol.
2. The `?? 0` portion is **independently load-bearing for the mget-missing-key case** — `mget` on a missing key returns `null`; `Number(null)` is `0` but `null` cannot be added arithmetically without the coercion.

**Do not refactor the expression out as dead code.** Re-verify wire format on any `@upstash/redis` major-version upgrade.

### Vitest 4 exclude config overrides positional path arguments

`vitest run <path>` does NOT override the `exclude` array in `vitest.config.ts`. A path argument matching an excluded directory yields `No test files found, exiting with code 1` rather than running the explicitly-pointed tests.

**Workaround:** use `vitest run --dir <path>` instead. The `--dir` flag overrides the exclude.

Applied at: `package.json` `scripts.test:smoke = "INTEGRATION=real vitest run --dir tests/smoke"`. Workaround documented inline in `tests/smoke/README.md`.

**Re-verify on Vitest upgrade.** If a future Vitest version changes positional-path-vs-exclude precedence (e.g., positional path wins, as a casual reader would expect), the `--dir` workaround becomes unnecessary and the script can revert to `vitest run tests/smoke`. Cheap insurance against silent breakage.

### Font-family verification — name collision between loaded primary and inline fallback (Batch 5, Task 5.3)

When the next/font-loaded family name equals the `@theme` inline `var()` fallback name, first-position parsing of `getComputedStyle(el).fontFamily` cannot distinguish "bridge variable populated → loaded family rendering" from "bridge variable undefined → @theme inline fallback rendering." Both states produce the same first token.

This is the case for Inter (loaded as `Inter`; `@theme` declares `var(--font-sans-loaded, 'Inter')`) and JetBrains Mono (loaded as `JetBrains Mono`; `@theme` declares `var(--font-mono-loaded, 'JetBrains Mono')`). It is NOT the case for Source Serif 4, where the loaded family name (`Source Serif 4`) differs from the `@theme` inline fallback (`'Source Serif Pro'`) — first-position parsing distinguishes the two states.

**Implication:** for verification tests that must fail loudly when the bridge breaks silently, first-position assertion alone is insufficient on Inter and JetBrains Mono. The test would pass under either state because both produce first token `Inter` / `JetBrains Mono` respectively.

**Discriminator:** next/font generates a metric-adjusted fallback family per loaded family — `Inter Fallback`, `Source Serif 4 Fallback`, `JetBrains Mono Fallback`. These names exist ONLY when next/font's CSS Modules class is applied to `<html>`; they are absent from the `@theme` inline fallback chain. Asserting `chain.includes('<Family> Fallback')` is a reliable discriminator regardless of name collision.

**Pattern applied:** `tests/e2e/font-verification.spec.ts` uses a dual assertion on every font test:
```ts
const tokens = parseFontFamily(getComputedStyle(el).fontFamily);
expect(tokens[0]).toBe(targetFamily);                    // first-position primary
expect(tokens).toContain(`${targetFamily} Fallback`);    // bridge-actually-populated discriminator
```

**Why both:** the first-position check handles the Source Serif 4 case where the loaded name and inline fallback differ. The `Fallback`-suffix check handles the Inter / JetBrains Mono collision case. Either alone has a hole; together they cover both cases uniformly so the same test shape applies to every family. The cost is one extra `.toContain()` per test — cheap insurance against the silent-fallback-shadowing failure mode.

**When this matters:** any future visual-system change that adds a new font family (or renames a current one) needs the test pattern preserved. If a family is added whose loaded name happens to differ from its inline fallback (like Source Serif 4), the first-position check is sufficient — but apply the dual pattern anyway for uniformity and as a regression guard against future inline-fallback rename drift.

---

## Categories for future entries

- **Schema vs locked-persona reality** — when persona JSON drives schema changes that the plan's recipe didn't anticipate (this section).
- **Plan-as-written vs runtime reality** — when tool/framework behavior surfaces drift only at execution (e.g., Amendment 12: Turbopack vs webpack `?raw`).
- **Strategic register/discipline calls** — when visual or institutional-register decisions need their rationale captured.
- **Rejected paths** — when an obvious-looking simplification was considered and dropped, with the reason.

Add new entries with a date, the finding, the resolution, and the downstream-impact paragraph. Keep entries surgical — this is a decision log, not a tutorial.
