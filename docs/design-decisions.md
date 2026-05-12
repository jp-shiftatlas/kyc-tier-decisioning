# Design Decisions Log

Durable record of architectural decisions, drift findings, and rationale that doesn't fit in commit messages, source code comments, or the implementation plan. Read this alongside `PRIMARY_PROMPT.md` (the locked spec), `superpowers/plans/2026-05-12-kyc-tier-decisioning-plan.md` (the implementation plan with amendments 1–13), and `visual_system.md` (the visual register).

Entries are ordered most-recent-first within each section.

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

## Categories for future entries

- **Schema vs locked-persona reality** — when persona JSON drives schema changes that the plan's recipe didn't anticipate (this section).
- **Plan-as-written vs runtime reality** — when tool/framework behavior surfaces drift only at execution (e.g., Amendment 12: Turbopack vs webpack `?raw`).
- **Strategic register/discipline calls** — when visual or institutional-register decisions need their rationale captured.
- **Rejected paths** — when an obvious-looking simplification was considered and dropped, with the reason.

Add new entries with a date, the finding, the resolution, and the downstream-impact paragraph. Keep entries surgical — this is a decision log, not a tutorial.
