# Batch 8 — composition and orchestration

Reference document for Batch 9 state-machine orchestration and Batch 11 pre-deploy review. Captures the composition-layer findings produced across Tasks 8.1–8.5 so that Batch 9 orchestration authors do not re-derive composition-consumption contracts under dispatch-directive time pressure, and so that pre-deploy review has a single artifact against which to verify orchestration-layer trust boundaries.

Source material: commits `7d54b01` (Task 8.1) through `457fe78` (Task 8.5). Each component's docstring is the authoritative inline reference; this document is the cross-cutting view.

This document is the third in the synthesis series after `docs/batch-6-primitive-bindings.md` (commit `278a339`) and `docs/batch-7-decisioning-components.md` (commit `4205ba7`). Batch 6 established the primitive-layer architecture methodology; Batch 7 validated it at the composition layer and forecast the orchestration layer for Batch 9; Batch 8 closes the form + analyst control surfaces, exercises the cross-batch discipline handoffs forecast at Batch 7 close, and produces the first primitive-layer evolution event since Batch 6 closed.

---

## Section 1 — per-component bindings

Five components landed in Batch 8: one primitive (TierBadge — Batch 7 closure-oversight resolution) and four composition surfaces. The table summarizes spec anchors, primitives composed, and sub-component dependencies. Trust-boundary and orchestration-obligation prose follows per component. The Modal primitive's banner-slot extension is documented as a discrete "primitive evolution event" subsection — first primitive modification since Batch 6 closed.

| Component | Spec anchors | Primitives composed | Composition dependencies |
|---|---|---|---|
| CustomInputForm | §5.6; Decision 37 (37a–g); Decision 27 wrapper-leakage prohibition; Decision 34 form-config-as-SSOT | Card, Button, Tooltip, TabularNumber | — |
| TierBadge | §5.1 line 221; PRIMARY_PROMPT.md §6.1 line 300; Batch 6 composition-fitness rule (docs/batch-6-primitive-bindings.md line 42) | — (primitive) | — |
| RecommendationCard | §5.1 lines 221–224; PRIMARY_PROMPT.md §6.1; Decision 11 progressive disclosure; Decision 27 schema-reading discipline; Decision 36c full-fidelity "before" rendering | Card, TierBadge (Task 8.2), TabularNumber, Chip, ChevronDisclosure | — |
| Pass3RaceBanner | §5.5 lines 366–369; visual_system.md line 84 (--violation-warn reserved-usage); Decision 36h race coordination; Decision 41c | Card | — |
| AnalystControlPanel | §5.5 lines 325–369; Decision 17 action authority; Decision 36 (36a–36h); Modal banner-slot extension (Task 8.5) | Card, Button, Modal (extended) | RecommendationCard (Task 8.3), Pass3CorrectionBanner (Batch 7), Pass3RaceBanner (Task 8.4) |

### CustomInputForm

Trust boundary: CustomInputForm owns its full validation state via react-hook-form internal state and the FormSchema → `.transform()` → re-parse through CustomerProfileSchema double-validation pipeline. The form does not pre-fetch persona data; it does not own the orchestration of what happens after submit (the Batch 9 state machine receives the validated CustomerProfile and dispatches the Pass 1 call). The form's onSubmit callback receives the validated CustomerProfile per the Decision 34 schema contract and hands it to the parent.

Wrapper-leakage prohibition (Decision 27) is structural: CustomerProfileSchema does not contain "demo intent" or "scenario type" fields and never will. Any future maintainer attempting to add them gets caught by Zod's `z.strictObject()` check; the form's regression-guard tests (`queryByLabelText(/demo intent|scenario type/)`) provide a second enforcement layer at the surface.

The mobile tooltip handling pathway is the load-bearing composition-layer affordance: all three Decision 37d mobile behaviors (tap-glyph-to-show + tap-elsewhere-to-dismiss + tap-glyph-again-to-dismiss) are implemented at this surface via a document-level `pointerdown` listener registered at form mount plus an `onClick → e.currentTarget.blur()` handler on each `?` glyph trigger. The Tooltip primitive's prop surface stays unchanged at `{content, children}`; React focus events bubble from the descendant button to the primitive's wrapper, so the primitive's hover+focus continues to handle desktop independently. This closes Batch 11 prerequisite #2 (Tooltip mobile tap-to-dismiss) at the composition layer.

Orchestration obligations in Batch 9:
- Form output (validated CustomerProfile) is dispatched directly to the Batch 9 state machine's `call_pass_1()` step. The state machine is responsible for the Pass 1 / Pass 2 / conditional Pass 3 chain; the form does not orchestrate the three-pass call.
- Form remount on persona switching is the state machine's responsibility (if persona switch occurs mid-form-fill, form state is intentionally cleared via remount, not preserved).
- The composite wire-string joining (`mixed (salary + inheritance)`, `business and remittance`, `passport (PhilSys enrollment in process)`) happens inline in the form's submit handler. No shared `lib/profile/wireVariants.ts` library exists; the directive's reference to one (Finding 2) was incorrect against the working tree.

### TierBadge

Trust boundary: TypeScript enforces the three-value union (`'SDD' | 'Standard' | 'EDD'`) at compile time at call sites; the primitive itself does no runtime enum-validation. The narrowness of the union is the load-bearing discipline: the canonical spec corpus names four values (`'SDD' | 'Standard' | 'EDD' | 'Decline'` per 05_PASS_1_DESIGN.md §2 JSON contract + ruleset_v1.md line 65 ES-04 row + line 93 Tier Decision Logic); the installed schema at [lib/schemas/pass1.ts:21](lib/schemas/pass1.ts:21) substitutes `'Hold'` for `'Decline'` (Finding 9, Batch 1 schema implementation defect, deferred for schema-correction follow-up commit). TierBadge's narrower three-value union forces a compile-time conversation at every call site where a Pass 1 with `recommended_tier === 'Decline'` (post-schema-fix; spec-corpus-correct case) or `=== 'Hold'` (current schema-defect case) attempts to compose TierBadge — surfacing the schema-vs-spec drift exactly where it would matter, per Batch 6's TypeScript-union-enforcement-of-spec-named-enumerations methodology.

Composition-fitness rule preserved from Batch 6 (docs/batch-6-primitive-bindings.md line 42): TierBadge shares the `--accent-subtle-bg` + `--accent-deep` color family with Chip variant="accent" but differs in size (large vs regular), font (mono vs sans), and content (tier label vs arbitrary status). A future composer reaching for `Chip variant="accent"` to display a tier should encounter the primitive's docstring rule and switch to TierBadge.

This component is the resolution of a Batch 7 closure oversight: the Batch 6 synthesis doc anticipated TierBadge as a Batch 7 primitive ("`TierBadge` is a separate Batch 7 primitive — NOT a chip variant"), but the component was dropped from the Batch 7 implementation set and surfaced during Task 8.1 dispatch-prep. The landing at Task 8.2 mid-sequence (rather than at Batch 7 close-out via amendment) is itself a methodology data point: oversights anchored in prior synthesis docs are catchable at next-batch dispatch-prep without requiring out-of-band amendment.

Orchestration obligations in Batch 9:
- TierBadge is not directly consumed by Batch 9 orchestration; consumption flows transitively through RecommendationCard. No standalone TierBadge call sites exist in the locked spec at Batch 8 / Batch 9 / Batch 10.

### RecommendationCard

Trust boundary: RecommendationCard owns the "Why this tier" expanded/collapsed state via internal `useState`. The card does not own persona switching (parent state machine handles unmount/remount on persona change — same pattern as ExaminerNotes Task 7.4). The card does not own the Override modal "before" rendering directly — Decision 36c re-renders RecommendationCard inside the post-Override-submit view at the AnalystControlPanel layer, but RecommendationCard itself is render-context-agnostic.

Schema-reading discipline is the load-bearing regression-guarded contract: hold_reason rendering is keyed off `decision.hold_reason !== null`, NOT off `decision.onboarding_hold === true`. The schema field is authoritative for what content exists; the boolean is separate orchestration state about onboarding workflow. Persona C is the canonical exercise of the partial-hold case (onboarding_hold: false paired with populated hold_reason for ES-08 tier-finalization-only hold). The regression-guard quartet — positive (Persona C), negative (Maria), and two independence guards on synthetic fixtures (boolean true + null content; boolean false + populated content) — encodes the discipline against future maintainers conflating the two fields.

Two schema-drift casts acknowledge Batch 1 implementation defects at the call-site boundary:
- `recommended_tier as 'SDD' | 'Standard' | 'EDD'` — narrows the schema's incorrect Hold/Decline-drift union to TierBadge's spec-corpus-aligned three-value union (Finding 9).
- `(pass1 as unknown as { recommended_edd_procedures?: EddProcedure[] }).recommended_edd_procedures` — reads canonical persona-JSON top-level field name + structured shape `Array<{procedure_id, description, regulatory_basis}>` per 05_PASS_1_DESIGN.md §2, bypassing the schema's wrong-name + wrong-shape `edd_requirements: string[]` declaration (Finding 10).

Both casts will become unnecessary when the schema correction follow-up commit lands; both are explicit at the call-site as audit trails for the deferred fix.

RecommendationCard is the third composition-layer consumer of ChevronDisclosure (after ExaminerNotes Task 7.4 and Pass3CorrectionBanner Task 7.6). The Decision 11 progressive-disclosure pattern reuses cleanly across hero surfaces where structured detail benefits from disclosure — three concrete consumption instances confirm the pattern as a reusable composition idiom, not a one-off ExaminerNotes affordance.

Orchestration obligations in Batch 9:
- RecommendationCard receives `pass1: Pass1Output` and is composed by the Batch 9 state machine at the top of the decisioning surface for persona playback + live mode alike. Same component, same prop shape, different data source — the two-data-flow UI pattern (per Decision 27 / PRIMARY_PROMPT.md §5.4).
- The render-context-agnostic discipline is exercised at Task 8.5: AnalystControlPanel re-renders RecommendationCard inside the post-Override-submit "Superseded by analyst override" view. This is the third exercise point for the discipline established at Pass3CorrectionBanner Task 7.6.

### Pass3RaceBanner

Trust boundary: Pass3RaceBanner is fully render-context-agnostic. The component does not check its parent context (no `displayContext` prop, no DOM inspection, no `inModal` boolean). The component accepts non-nullable `pass3: Pass3Output` matching Pass3CorrectionBanner sibling-precedent (per Finding 14 disposition A); the prop's *presence* signals AnalystControlPanel mounted the banner in response to a race condition, *contents* are not read by this component — the rendered message is the verbatim static string from §5.5 line 368 (*"Audit findings revised after your previous action. Action surface reset; please review the corrected recommendation."*). The render-context-agnostic regression guard re-uses verbatim from `Pass3CorrectionBanner.test.tsx` lines 132–151.

This component is the canonical and sole consumer of `--violation-warn` (visual_system.md line 84 reserved-usage rule). The color-token-family disambiguation discipline is encoded here: `--violation-warn` (red, #C84937, reserved for race banner) is distinct from `--status-warning-bg` (amber, used by Chip QUALITY status) — different reserved-usage color families serving different purposes. The directive's "Chip with warn variant" framing conflated the two families; Finding 13 disposition omitted the severity chip entirely per the spec's silence on chip composition at this surface.

Pass3RaceBanner is the first component to actually render in both placement contexts per Decision 36h. Pass3CorrectionBanner (Task 7.6) *established* the render-context-agnostic regression guard but never exercised banner-inside-Modal placement (the correction banner always renders above AnalystControlPanel). Pass3RaceBanner moves the discipline from forward-looking establishment to load-bearing contract-verification.

Composition pattern data point: Pass3CorrectionBanner and Pass3RaceBanner share the non-nullable prop signature but diverge in role semantics — Pass3CorrectionBanner's `pass3` is both trigger AND content source (reads `change_log` for the inline change-log table per Decision 20); Pass3RaceBanner's `pass3` is trigger ONLY (presence signals the race; contents are unread per §5.5 line 368's static verbatim message). Prop-role is determined by what the spec emits at the surface, not by the type signature. The same non-nullable signature serves both roles; role semantics are surface-contextual.

Orchestration obligations in Batch 9:
- Batch 9 state machine signals "this pass3 is a race condition" via the explicit `raceTrigger: boolean` prop to AnalystControlPanel (Finding 16 disposition A: parent decides race, panel decides placement). Pass3RaceBanner itself does not receive `raceTrigger` — it only receives `pass3`.
- The state machine drives Pass 3 firing (Decision 27 live-mode-only behavior); Pass3RaceBanner mounts and unmounts as a function of `raceTrigger && overrideModalOpen` orchestration at AnalystControlPanel.

### AnalystControlPanel

Trust boundary: AnalystControlPanel owns the three-action state machine (`'idle' | 'approved' | 'escalated' | 'overridden'`), Override modal open/closed state, audit reference generation at the moment of action (Decision 36g), race banner *placement* decision per Decision 36h, and persona switching reset via `useEffect` keyed on `personaId` (Decision 36e). The component does NOT own the Pass 3 firing decision (Batch 9 state machine drives Pass 3 via `pass3` prop) nor race-condition *detection* (parent signals via explicit `raceTrigger: boolean` prop per Finding 16 disposition A; panel does not self-detect via pass3 object-identity comparison).

The Decision 17 corollary discipline is operative here: AnalystControlPanel HAS the action affordances (counterpart to AuditPanel's `expect(screen.queryByRole('button', { name: /override/i })).not.toBeInTheDocument()` regression guard at AuditPanel.test.tsx:96 — display surface's inverse boundary against action affordance creep). AnalystControlPanel's own regression-guard test asserts positive presence of all three action buttons at this surface, completing the action/display-surface boundary pair.

All eight Decision 36 sub-decisions land at this surface end-to-end:
- 36a Approve confirmation block: `--surface-elevated` Card with six field rows (Analyst / Timestamp / Tier / Decisive rules / Audit reference / production-preview microcopy) per §5.5 lines 342–353.
- 36b Escalate concordance signaling: pre-click Escalate label flips to "Confirm Escalation" when `senior_approval_required: true` (Carlos in locked personas); Approve gets `opacity-50 border-text-secondary` de-emphasis. Post-click confirmation block heading reads "Escalated" without parenthetical — concordance cue lived in the pre-click button label per §5.5 line 337.
- 36c Override modal with full-fidelity "before" rendering: Modal primitive handles textarea + buttons + APG dialog patterns. On submit (Finding 17 disposition A), modal closes and post-action "Superseded by analyst override" view renders below the panel — composed of the original RecommendationCard re-rendered render-context-agnostically. Treatment mirrors the approved/escalated below-buttons confirmation pattern.
- 36d Post-action button state lockdown: all three buttons disabled (Button primitive's `disabled:opacity-50 disabled:cursor-not-allowed`); Reset case link in `--text-tertiary --text-sm` appears underneath; click returns to idle.
- 36e Persona switching reset: `useEffect` keyed on `personaId` clears action state, modal open state, and confirmation record when persona changes.
- 36f Modal cancellation paths: Escape + backdrop click + Cancel button all dismiss the modal without recording action (Modal primitive handles all three internally per its Task 6.6 docstring).
- 36g Audit reference: `generateAuditReferenceId(personaId | sessionSeed, now=Date)` produces `audit-{id}-{YYYYMMDDHHMMSS}`. Generated at the moment of action (click), captured in the ConfirmationRecord, and persists with the post-action state through render cycles. Test fixture uses `vi.useFakeTimers + vi.setSystemTime` to assert exact format.
- 36h Race coordination: `raceTrigger` prop signals race; placement orchestration above panel by default; inside Modal banner slot when `overrideModalOpen && raceTrigger`. `raceTrigger` transition false→true while action recorded resets `actionState` to idle (action surface reset per §5.5 line 369) but does NOT close the Override modal (preserves typed-but-not-submitted analyst reasoning).

AnalystControlPanel is the canonical (and currently sole) consumer of Modal's banner slot (see primitive evolution event below).

Orchestration obligations in Batch 9:
- Batch 9 state machine passes `pass3` and `raceTrigger` to AnalystControlPanel. State machine decides whether a given pass3 represents an initial correction (Pass3CorrectionBanner above panel) or a post-action race (Pass3RaceBanner above panel or inside modal); panel orchestrates placement based on `overrideModalOpen` internal state.
- `personaId` and `personaName` are derived from the state machine's currently-selected persona; in live mode, parent passes session-scoped string equivalents.
- Live mode replaces `personaId` with a session-scoped short hash via `auditRefSource: {kind: 'live', sessionSeed}` per the audit-reference helper's existing API.

### Modal primitive evolution event (Task 8.5)

First primitive-layer modification since Batch 6 closed. The extension is the contemplated path from Modal's original Task 6.6 docstring: "extend this primitive deliberately or build a sibling primitive. Don't pre-build variant surface for Override-only use." Checkpoint approval was the Task 8.5 dispatch-prep exchange resolving Finding 15.

Contract:
- One optional prop added: `banner?: React.ReactNode`, rendered between the title (h2) and the textarea label inside the dialog box.
- Modal's single-purpose Override-Modal contract (textarea + Cancel + Submit override + WAI-ARIA APG dialog patterns) stays unchanged. The banner slot is auxiliary.
- Focus-trap behavior is unaltered: the textarea remains the first focusable element on open per WAI-ARIA APG, validated by a new test asserting `document.activeElement?.tagName === 'TEXTAREA'` even when a focusable element is passed in the banner slot.

Canonical consumer: AnalystControlPanel injecting `<Pass3RaceBanner pass3={pass3} />` when `raceTrigger && overrideModalOpen` per Decision 36h's inside-Modal placement requirement. The extension exists specifically to satisfy this requirement; no other Batch 8 / 9 / 10 consumer is forecast.

Admissibility under the three-criteria framework articulated in Section 2 Family 3 (original docstring contemplated path; downstream composition need spec-named; extension preserves single-purpose contract) — all three criteria met here.

This is a primitive-layer evolution event, not a new spec-silent gap. Documented inline in Modal's updated docstring; not added to the Batch 11 Things-to-Flag prerequisite list.

---

## Section 2 — methodology

The patterns below emerged across Tasks 8.1–8.5 and extend the methodology framework established at Batches 6 + 7. Where Batch 7 validated the primitive→composition trust-boundary scaling, Batch 8 produces three new methodology data points: cross-batch discipline handoff validation, primitive evolution as composition-driven event, and the bidirectional discipline framework operating across five surfaces (one more than Batch 7's four-surface formulation).

### Carry-forward from Batches 6 + 7: the three-layer trust-boundary pattern

Batch 6 established the trust-boundary pattern at the primitive layer. Batch 7 validated it at the composition layer. Batch 8 produces the first cross-batch exercise instance: Pass3CorrectionBanner's render-context-agnostic discipline (Task 7.6) was forward-looking, and Pass3RaceBanner (Task 8.4) is the actual exercise point. The Batch 7 synthesis doc closer was explicit that this handoff was forecast; the doc's prediction matched what Batch 8 produced. This is the first empirical validation that disciplines survive batch boundaries intact — not just established once and consumed, but established in one batch and exercised forward across the boundary with no contract erosion.

A third exercise point of the same discipline lands at Task 8.5: RecommendationCard re-rendered post-Override-submit inside the "Superseded by analyst override" view. The discipline now has three concrete exercise points across two batch boundaries (Task 7.6 establishment → Task 8.4 primary exercise → Task 8.5 third exercise), validating it as an empirically reusable architectural pattern, not a one-time forecast→exercise pair.

The three-layer formulation continues to hold. Empirical instances from Batch 8:
- Modal primitive trusts AnalystControlPanel for banner-slot content; AnalystControlPanel trusts the Batch 9 state machine for `raceTrigger` signaling; the state machine trusts the Pass 3 backend dispatch for emission semantics.
- TierBadge primitive trusts its TypeScript union for spec-corpus tier alignment; RecommendationCard trusts the schema-vs-spec-drift cast for narrowing at the boundary; the schema correction follow-up commit will resolve the drift at the source.
- Pass3RaceBanner trusts AnalystControlPanel for placement orchestration; AnalystControlPanel trusts the state machine for race signaling.

### Family 1 — spec corpus is plural

Three new findings extend the family with a corpus-member class not present in Batch 7's instances: **the schema itself is a corpus member that can drift from the canonical spec**. Batch 7's Family 1 findings catalyzed on cross-document spec reads producing the right answer; Batch 8's findings catalyze on schema-vs-spec-corpus mismatch where the schema was the wrong source.

**Schema-corpus drift class (Findings 9 + 10 — reproducibility confirmed within Batch 8).** Two distinct Batch 1 schema implementation defects surfaced via Batch 8 dispatch-prep spec walks:
- Finding 9: [lib/schemas/pass1.ts:21](lib/schemas/pass1.ts:21) declares `recommended_tier: z.enum(['SDD', 'Standard', 'EDD', 'Hold'])`; canonical corpus (05_PASS_1_DESIGN.md §2 JSON contract, ruleset_v1.md line 65 + line 93, pass_1_system_prompt.md Decision Logic) names the fourth value `'Decline'` (ES-04 sanctions hit → DECLINE + file STR). Surfaced at Task 8.2 TierBadge spec walk.
- Finding 10: schema declares `edd_requirements: z.array(z.string()).optional()`; canonical persona-JSON top-level field is `recommended_edd_procedures: Array<{procedure_id, description, regulatory_basis}>` per 05_PASS_1_DESIGN.md §2. Both field-name AND field-shape drift in a single defect. Surfaced at Task 8.3 RecommendationCard spec walk.

Both defects are reproducible instances of the prior-batch-implementation-drift surface (the fourth bidirectional surface forecast at Task 8.1). Neither persona exercises the affected fourth-tier or structured-EDD-procedures paths in ways that would surface the drift at integration test time — only the deliberate corpus-alignment check at dispatch-prep surfaced them. The catch mechanism is reproducible across error instances within a single batch, not just demonstrably effective once.

Implementation methodology: schemas are corpus members, not just contracts. Dispatch-prep spec walks must verify schema declarations against canonical content (system prompts, ruleset, persona JSON, design docs) and treat schema-vs-corpus mismatch as a finding equal in weight to spec-corpus cross-document drift.

**Color-token family disambiguation (Finding 13 catalyst).** Reserved-usage rules can split a single-word color descriptor across two different token families. `--violation-warn` (red, #C84937, reserved for Pass 3 race banner per visual_system.md line 84) and `--status-warning-bg` (amber, used by Chip QUALITY status) both occupy the "warning" lexical neighborhood but are semantically distinct: violation-warn signals "audit findings revised, action surface reset" (different from "this is a compliance violation"); status-warning-bg signals quality-flag-only Pass 2 audit status. A naive "warn variant" framing conflates them. The directive's "Chip with warn variant" composition map specified a chip variant that doesn't exist in the closed Chip status set AND that would have used the wrong color family if it did. The corpus disambiguates via the reserved-usage rule's reading; naive single-token lexical reading misses it.

**Cross-pass field migration (Finding 11 catalyst).** A field's location in the corpus may shift between pass layers. `regulatory_citation` lives at Pass 2 `checks[].regulatory_citation`, not at Pass 1 `rules_fired[].regulatory_citation`. Pass 1 rules_fired carries `rule_id, rule_name, category, weight, trigger_evidence, tier_impact` only. A dispatch directive specifying "rule_id (mono), tier_impact (sans prose), regulatory_citation (mono-xs)" for the Pass 1 expanded view assumed the field was at Pass 1 when it was at Pass 2 — cross-pass field confusion. Resolution: examiner-grade rationale ("TE-02 — Standard profile baseline" + tier_impact prose) lands per the actual Pass 1 contract; regulatory_citation surfaces at the AuditPanel layer per its actual contract.

### Family 2 — discipline-as-implementation

Two new findings extend the family with implementation-pattern observations that operate as visible discipline at the code surface.

**Cast-at-the-boundary as visible-deferral pattern (Findings 9 + 10 implementation).** Schema-vs-spec drift requires either schema correction (in-scope schema gardening) or deferral (out-of-scope for the current task). The cast-at-the-boundary pattern — explicit `as` casts at the composition call site with docstring acknowledgment of the boundary — is the right resolution for deferral cases. Two cast sites in RecommendationCard.tsx ([line 115](components/decisioning/RecommendationCard.tsx:115) narrowing the tier union; [line 121](components/decisioning/RecommendationCard.tsx:121) reading via looseObject passthrough) make the deferred fix visible in the code. The cast IS the audit trail. Both casts will become unnecessary once the schema correction follow-up commit lands; their removal is a small, deterministic edit at known locations.

Generalizes: visible-deferral over silent-acceptance. Where a deferred fix needs forward acknowledgment, an explicit cast with inline docstring reasoning serves better than a silent assumption. A future maintainer encountering the cast immediately sees the boundary; a future maintainer encountering an implicit pass-through must reconstruct the boundary from absence.

**Institutional-register transparency discipline (Finding 12 catalyst).** Where spec is silent on conditional rendering of zero-value or absent data points, the institutional register defaults to transparency over de-cluttering. visual_system.md §5.1 line 222 names category-breakdown chips for the risk score but is silent on whether zero values are suppressed. Per institutional register (examiner reads each category's contribution including absence of contribution), all three category chips render uniformly with their values including zeros. Regression guard at the test layer encodes the discipline: Maria's all-zero category_breakdown still renders three chips with explicit "0" values; a future maintainer "improving" the rendering by suppressing zero chips for visual minimalism gets caught by the test.

Generalizes the spec-silence-as-discipline framework from Batch 6: when spec is silent on conditional-render behavior at a data-visualization surface, the institutional-register default is transparency. The silence IS the discipline — the answer is "render everything, including the absence."

### Family 3 — composition-layer judgment

Three new findings extend the family with composition-layer architectural decisions specific to Batch 8's heavier orchestration density.

**Double-validation pattern (Finding 8).** Where form-control structural validation diverges from canonical schema shape, the right pattern is two-layer validation with explicit re-parse: FormSchema (zodResolver-bound for form-control validation including composite parts as separate fields, occupation_kind discriminator) → `.transform()` to CustomerProfile-shape → re-parse through CustomerProfileSchema (applies Decision 37b OccupationField guards: trim + case-insensitive enum match + lowercase normalization). Both layers fire on every submit. The form layer handles structural fitness; the schema layer handles canonical normalization. The directive's "sharing CustomerProfileSchema" framing was structurally optimistic — direct resolver-binding to CustomerProfileSchema was never possible because the schema's canonical-string shape is incompatible with multi-field form-control input. The pattern that landed preserves both Decision 34's form-config-as-SSOT contract and the symmetry with the API handler's POST validation: the form's final transformed output validates against CustomerProfileSchema exactly as the API POST handler does.

Generalizes: at composition surfaces where form-control structure diverges from data-contract shape, two-layer validation with explicit re-parse is preferred over single-schema-binding workarounds.

**Prop-role distinction — same signature, different role semantics.** Pass3CorrectionBanner and Pass3RaceBanner share the non-nullable `pass3: Pass3Output` prop signature but diverge in role semantics:
- Pass3CorrectionBanner: `pass3` is trigger AND content source — reads `pass3.change_log` to render the inline change-log table per Decision 20.
- Pass3RaceBanner: `pass3` is trigger ONLY — presence signals the race condition; contents are unread because the verbatim race-coordination message is static per §5.5 line 368.

Prop-role is determined by what the spec emits at the surface, not by the type signature. The same non-nullable signature serves both roles; role semantics are surface-contextual. A future composer encountering a similar "banner emits when X fires" pattern should resolve prop-role by reading the spec's emission semantics at that specific surface, not by inferring from prop type.

**Primitive evolution as composition-driven event (Finding 15 / Modal banner slot).** Primitives may need to evolve to admit new composition consumption. Modal's original Task 6.6 docstring explicitly contemplated this path ("extend this primitive deliberately or build a sibling primitive... checkpoint approval"). The Task 8.5 banner-slot extension is the first instance of the contemplated evolution since Batch 6 closed. The extension is minimal (one optional prop + one render slot), preserves the primitive's single-purpose contract (textarea + buttons + APG dialog patterns unchanged), and the extension's tests assert that the addition doesn't break existing contract (focus-trap still seats textarea as first focusable on open even with banner injection).

Generalizes: primitive evolution is admissible when (a) the original docstring contemplated the path, (b) the composition need is spec-named at a downstream surface that the original primitive could not satisfy, and (c) the extension preserves the primitive's single-purpose contract. The Modal extension meets all three; future primitive evolutions should be evaluated against the same criteria.

### Closer — meta-pattern empirically reproducible

Across Batch 8, the spec-walk discipline produced six catches across two surfaces — substantively more than Batch 7's three. The distribution across surfaces:

| Catch | Surface | Class |
|---|---|---|
| Finding 1 (stale directive path: `lib/profile/formConfig.ts` → `lib/forms/profileFormConfig.ts`) | directive-at-drafting | path drift |
| Finding 2 (absent file: `lib/profile/wireVariants.ts` does not exist) | directive-at-drafting | reference framing error |
| Finding 3 (Tooltip primitive mobile-tap behavior misframed) | directive-at-drafting | primitive contract misframing |
| Finding 13 (Chip warn variant doesn't exist; color-token family conflation) | directive-at-drafting | primitive contract misframing |
| Finding 14 (prop nullability divergence from sibling-precedent) | directive-at-drafting | sibling-precedent divergence |
| Persona D EDD-procedures shape conjecture (Task 8.3) | pre-implementation re-verification | parent-thread reasoning shortcut |

The table above covers catches at the directive-at-drafting and pre-implementation re-verification surfaces. Implementation-time judgments where the directive's framing required composition-layer adjustment (Finding 8 double-validation pattern; Findings 13 and 14 chip/prop dispositions surfaced at dispatch-prep and resolved at composition design) are recorded in Family 2/3 sections, not in the directive-catch count.

Six catches across the directive-at-drafting and pre-implementation-re-verification surfaces. The catch count doubled batch-over-batch (Batch 7: 3 → Batch 8: 6) under heavier compositional density. The directive-at-drafting class is the largest contributor (5 catches), expected given Batch 8's scope; the pre-implementation re-verification class produced one catch (the Persona D EDD-procedures conjecture) that propagated into a test-fixture design assumption before the verification step caught it.

The five-surface bidirectional discipline framing now lands:

1. **Plan-recipe errors at dispatch time.** The original surface from Batch 7's framing.
2. **Dispatch-directive errors at dispatch time.** The companion surface that emerged when dispatch-prep spec walks began catching directive errors before implementation.
3. **Dispatch-directive errors at drafting time.** Surfaced during Batch 8 as the parent-thread directive errors that Code's spec walks caught against the locked corpus + existing primitive contracts (Findings 1, 2, 3, 13, 14).
4. **Prior-batch defects via dispatch-prep spec walk.** Two error classes within: closure oversight (TierBadge anticipated in Batch 6 synthesis, dropped from Batch 7 implementation) and implementation drift (Hold/Decline + recommended_edd_procedures schema defects sitting unnoticed since Batch 1). Findings 9 + 10 are the empirical reproducibility datum within Batch 8.
5. **Parent-thread conjectural assertions at pre-implementation verification.** Surfaced at Task 8.3 — the Persona D EDD-procedures shape conjecture that the load-bearing pre-implementation re-verification step caught before propagating to test fixture design.

Single flag step, five surfaces, multiple error classes per surface. Cost-asymmetry rationale holds at all five: each surface's catch cost dwarfs the round-trip clarification cost. The discipline is operative because each surface's catch averts a different production-time failure mode (schema mismatches → runtime errors; primitive contract mismatches → test-failure cascades; closure oversights → multi-batch rework; etc.).

Beyond the directive-catch metric, Batch 8 produced two empirical instances of cross-batch architectural discipline survival — the methodology framework's first concrete validations of patterns surviving batch boundaries with no contract erosion.

**Render-context-agnostic discipline cross-batch handoff validated.** Three exercise points across two batch boundaries:
- Pass3CorrectionBanner (Task 7.6) — establishment (forward-looking forecast that the inside-Modal case would land at Pass3RaceBanner).
- Pass3RaceBanner (Task 8.4) — primary exercise (above-panel + inside-Modal placements).
- RecommendationCard re-rendered post-Override-submit (Task 8.5) — third exercise inside the "Superseded by analyst override" view.

Three exercise points validates the discipline as empirically reusable, not just established. Most architectural disciplines do not survive a batch boundary intact; this one did, and exercised three times. Worth recording as the canonical instance of the three-layer trust-boundary pattern operating as designed across batch boundaries.

**Modal primitive evolution as composition-driven event.** First primitive-layer modification since Batch 6 closed. The extension followed the contemplated path from Task 6.6's docstring exactly: checkpoint approval at Task 8.5 dispatch-prep, banner slot added between title and textarea, single-purpose Override-Modal contract preserved, focus-trap behavior unaltered. Primitive evolution is admissible under the three-criteria framework (original docstring contemplated path, downstream composition need spec-named, extension preserves single-purpose contract); this instance meets all three. The methodology framework's "primitives are not immutable, they are versioned by deliberate composition-driven evolution" reading lands with empirical support.

---

## Things-to-Flag verifications confirmed at Batch 8 synthesis

The Batch 11 prerequisite list is updated at Batch 8 close. One prereq closed at Task 8.1; two new prereqs surfaced at Task 8.2 spec-silence-as-gap derivations; two prereqs carry forward unchanged from Batch 6.

| Item | Resolved state |
|---|---|
| Tooltip mobile tap-to-dismiss (prereq #2, Task 6.5) | **Closed at Task 8.1**: CustomInputForm composition-layer ownership of all three mobile tooltip behaviors (tap-to-show + tap-elsewhere-to-dismiss + tap-glyph-again-to-dismiss). Tooltip primitive's prop surface stays unchanged at `{content, children}`; React focus events bubble from the descendant button to the primitive's wrapper. Path A empirical validation per Finding 3 disposition. |
| Button focus-ring (prereq #1, Task 6.4) | **Carry-forward.** Unchanged. 2px `--accent-primary` outline with 2px offset on `focus-visible` (keyboard-only) — derived under spec silence at Batch 6, awaiting Batch 11 ratification. |
| Modal body-scroll-lock (prereq #3, Task 6.6) | **Carry-forward.** Unchanged. `document.body.style.overflow = 'hidden'` on open, restore prior value on close — derived under spec silence at Batch 6, awaiting Batch 11 ratification. (The Task 8.5 Modal banner-slot extension does NOT modify this derivation.) |
| TierBadge padding derivation (prereq #4, **new at Task 8.2**) | Spec-silence-as-gap. visual_system.md §5.1 line 221 says "large, prominent visual treatment" without naming px values. Current derivation: `px-3 py-1.5` — larger than Chip's `px-2 py-0.5` (size differentiation per the Batch 6 composition-fitness rule), smaller than Card's `p-6` (TierBadge nested inside Card surfaces). Resolution path: ratify into visual_system.md as a new §X tier-badge-sizing section, OR lock as a project-knowledge decision in 03_DESIGN_DECISIONS.md. |
| TierBadge text-size derivation (prereq #5, **new at Task 8.2**) | Spec-silence-as-gap. Same anchor (§5.1 line 221 "large, prominent"); current derivation: `text-lg` (18px) — visibly larger than chip/button `text-sm` and field-label `text-base`; reserves `text-xl` for the risk score numeric per Batch 6 doc precedent. Same resolution paths as #4. |

Net Batch 11 prerequisite count: **4 open** (was 3 going into Batch 8; 1 closed at Task 8.1; 2 new at Task 8.2; 2 unchanged carry-forward). The schema-correction follow-up (Findings 9 + 10 Hold/Decline + recommended_edd_procedures) is **NOT** a Batch 11 prerequisite — it is a small deferred commit at parent-thread discretion, distinct from spec-silent-gap ratification.

No other Batch 11 prerequisites surfaced during Batch 8. The Modal primitive extension (Task 8.5 banner slot) is a primitive-evolution event, not a spec-silent gap — documented inline in the primitive's docstring; not added to the prerequisite list.

---

Drafted at Task 8.5 close. Source commits: `7d54b01` (Task 8.1 CustomInputForm + OccupationField guard chain), `d2f7678` (Task 8.2 TierBadge primitive), `a0f9626` (Task 8.3 RecommendationCard composition), `88ba60e` (Task 8.4 Pass3RaceBanner composition), `457fe78` (Task 8.5 AnalystControlPanel + Modal banner-slot extension). Synthesis-doc trigger held to batch close per the locked sequencing carried forward from Task 6.6 approval and Batch 7 precedent.
