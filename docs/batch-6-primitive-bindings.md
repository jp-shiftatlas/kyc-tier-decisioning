# Batch 6 — primitive bindings and methodology

Reference document for Batch 7 composition and Batch 11 pre-deploy review. Captures the spec-walk artifacts produced across Tasks 6.1–6.7 so that Batch 7 component authors do not re-derive primitive-to-spec bindings under dispatch-directive time pressure, and so that pre-deploy review has a single artifact against which to verify composition-layer trust boundaries.

Source material: commits `3a6d3bd` (Task 6.1) through `c0dfc62` (Task 6.7). Each primitive's docstring is the authoritative inline reference; this document is the cross-cutting view.

---

## Section 1 — primitive bindings

Nine primitives landed in Batch 6 (excluding the `cx` + `format` utilities from Task 6.1, which are not visual primitives). The table summarizes spec anchors, the spec-named variant set, and the spec-silence regression guards each primitive enforces. Trust-boundary and composition-layer-obligation prose follows per primitive.

| Primitive | Spec anchors | Variants | Guard vectors |
|---|---|---|---|
| Card | §2 surface + border tokens; §4 line 194 padding; §5.1, §5.4, §5.5, §5.6 | `elevated`, `recessed` | no border-radius |
| Chip | §2 token usage rules (lines 82–86); §5.1 line 222; §5.2 line 243; §5.2 line 275 | status `PASS`/`FAIL`/`QUALITY`; variant `accent`/`neutral` | no border-radius, no hover, no shadow, no transition / animate |
| Button | §2 line 92 hover contract; §4 line 120 UI chrome typography; §5.5 lines 329–332; §5.5 line 362 disabled spec; §5.6 line 415; §6 line 464 transition allowance | `primary`, `outline`, `subtle` | no border-radius, no shadow, no scale or transform, no animate-* (transition-colors permitted) |
| Tooltip | §5.6 lines 398–410 (Decision 37d) | none — single use case | no border-radius, no shadow, no transition / animate, no click trigger |
| Modal | §5.5 lines 355–360 (the one allowed semi-transparent overlay) | none — single use case | no border-radius on dialog, no shadow on dialog, no animate / transition |
| ProgressBar | §5.8 lines 433, 438 | none — single use case | no border-radius, no shadow, no animate-* (transition-[width] is spec-intended motion) |
| Skeleton | §5.8 line 434; §6 line 464 | none — single use case | no border-radius, no animate-*, no gradient, no opacity utility, no transition-* |
| ChevronDisclosure | §5.1 line 223; WAI-ARIA APG disclosure pattern | none — single use case | no border-radius, no shadow, no transition / animate on chevron |
| TabularNumber | §3 type discipline; §5.1, §5.2, §5.6 numeric references; globals.css `--font-numeric` token comment | none — semantic wrapper | no border-radius, no transition / animate |

### Card

Trust boundary: variant context is the caller's responsibility. Card does not know whether it is rendering as a §5.1 recommendation surface or a §5.4 architecture-strip side box; the caller passes `variant='elevated'` or `variant='recessed'` per spec mapping.

Composition-layer obligations in Batch 7:
- `RecommendationCard` (§5.1) wraps content in `<Card variant="elevated">`. The recommendation surface is also the locus for the tier badge, risk score, and ChevronDisclosure-controlled "Why this tier" expandable.
- `ArchitectureStrip` (§5.4) renders four `<Card variant="recessed">` side boxes plus one middle box that overrides via className for the `--accent-primary` background. The middle-box treatment is the only spec-named place where the recessed/elevated dichotomy is broken; document the className override at the call site.
- `AnalystControlPanel` (§5.5) confirmation block is `<Card variant="elevated">`.
- `CustomInputForm` (§5.6) field groups are each `<Card variant="elevated">`.

### Chip

Trust boundary: §2 reserved-token rules (lines 82–86) are composition-layer obligations, not primitive-level guards. `--violation-primary` is reserved for Pass 2 violation contexts; `--status-warning` for quality flags only; `--status-success` for PASS clean only. The chip primitive does not enforce these — it renders whatever `status` the caller passes.

Composition-layer obligations in Batch 7:
- `AuditCheckRow` (composed inside `AuditPanel` per §5.2) renders `<Chip status={check.status === 'pass' ? 'PASS' : check.status === 'fail' ? 'FAIL' : 'QUALITY'}>`. Per-check `status` is lowercase in the locked persona JSON (Finding 2 in `docs/design-decisions.md`); use `isPass()` from `lib/schemas/personaAdapters.ts` for case-insensitive comparison where appropriate.
- Violation-categories chip strip (§5.2 line 275) renders one `<Chip variant="accent">` per non-zero category count.
- `TierBadge` is a separate Batch 7 primitive — NOT a chip variant. It shares the `--accent-subtle-bg` + `--accent-deep` color family with `variant="accent"` chips but differs in size, font (mono), and content (tier label).

### Button

Trust boundary: active/pressed state is not applied at the primitive layer despite `--accent-deep` being a `§2` token. The caller wires `onClick` and may override via `className` if a context genuinely demands per-variant active styling.

Composition-layer obligations in Batch 7:
- `AnalystControlPanel` (§5.5) renders three buttons: `<Button variant="primary">Approve</Button>`, `<Button variant="outline">Escalate</Button>`, `<Button variant="subtle">Override</Button>`.
- `CustomInputForm` (§5.6) submit button is `<Button variant="primary">Run three-pass analysis</Button>`.
- Concordance signaling on `Escalate` (when Pass 1 set `senior_approval_required: true`): the composition layer changes the Escalate label to "Confirm Escalation" pre-click and de-emphasizes the Approve button via className override (reduced opacity, `--text-secondary` border) per §5.5 line 336.
- Post-action state (§5.5 line 362): the composition layer sets `disabled` on all three buttons; Button's disabled state spec (opacity 0.5, cursor not-allowed) renders automatically.
- Per-variant focus-ring override: not currently needed; the uniform `--accent-primary` outline serves all three variants. Add only with checkpoint approval.

### Tooltip

Trust boundary: content scope is regulatory citations only (FATF references, MORB sections, BSP circular numbers). Caller does not pass general help text or feature explanations.

Composition-layer obligations in Batch 7 / Batch 8:
- `CustomInputForm` (§5.6 line 400) renders `<Tooltip content="...citation...">?</Tooltip>` on four spec-named fields: `pep_status`, `high_risk_jurisdiction_connection`, `source_of_funds`, `customer_type`. The `?` glyph is the visible trigger in `--text-tertiary` per §5.6 line 400.
- Mobile tap-to-dismiss-on-outside: spec-described at §5.6 line 406 but intentionally deferred from the primitive layer. Batch 8 form composition adds explicit `pointerdown` handling at the document level, or a deliberate primitive extension lands the touch logic with checkpoint approval. Flagged as Things-to-Flag item.

### Modal

Trust boundary: validation contract is owned by the primitive, not the composition. Submit is disabled until the textarea contains non-whitespace; trimmed content is emitted via `onSubmit(basis)`. The composition layer does not validate textarea content.

Composition-layer obligations in Batch 7:
- `AnalystControlPanel` renders `<Modal open={overrideOpen} onClose={...} onSubmit={...} title="Override Maria Lavarra's recommendation" />` when the Override button is clicked. The title is per-persona contextual; the textarea prompt and button labels are spec-fixed inside the primitive.
- On `onSubmit(basis)`: composition layer persists the override basis, transitions the UI to the "Superseded by analyst override" view per §5.5 line 358, and renders the original AI recommendation alongside the analyst's documented basis.
- Discipline boundary — "the one allowed semi-transparent overlay" (§5.5 line 355): no other Batch 7+ component may add a semi-transparent overlay treatment. A future proposal to do so should fail review citing this constraint. The `.modal-backdrop` utility (defined in `app/globals.css` per Batch 5) is the only spec-sanctioned semi-transparent overlay.
- Body-scroll-lock derivation: flagged as Things-to-Flag item. Spec is silent; primitive applies `document.body.style.overflow = 'hidden'` on open and restores prior value on close. Awaiting Batch 11 ratification.

### ProgressBar

Trust boundary: progress value is the caller's responsibility; primitive clamps to [0, 100] to defend against caller bugs but does not interpret semantics.

Composition-layer obligations in Batch 7:
- `AuditPanel` and other panels in loading state (§5.8) render `<ProgressBar progress={pct} />` at the top of the panel. Progress is deterministic during persona playback (timed) and indeterminate during live generation (composition decides update cadence — likely an interval-driven estimate or a discrete 0/33/66/100 stepped progression keyed to pass completion).
- ProgressBar is distinct from `ElapsedTimeIndicator` (Batch 7, Decision 41) — the bar is the visual; the indicator is the text counter. Both render concurrently during live generation per §5.8.

### Skeleton

Trust boundary: dimensions are composition-layer concerns. Skeleton provides only the `--surface-recessed` surface treatment; the caller sizes via className.

Composition-layer obligations in Batch 7:
- During panel loading (§5.8 line 434), the composition renders multiple `<Skeleton className="h-N w-M" />` instances laid out to match the loaded content's structural footprint (e.g., five skeleton rows for the audit panel's first five check rows).
- No animate-pulse, no shimmer, no gradient. The institutional contract is "loading state visible, no performance theater." This is the strictest guard floor in Batch 6 — six regression guards on Skeleton specifically because consumer-app skeleton drift is the highest visible-surface risk.

### ChevronDisclosure

Trust boundary: disclosed content is rendered by the caller, not by the primitive. ChevronDisclosure is the trigger widget only; the expandable body lives in the composition.

Composition-layer obligations in Batch 7:
- `RecommendationCard` (§5.1 line 223) "Why this tier" expandable renders `<ChevronDisclosure label="Why this tier" open={open} onToggle={setOpen} />` followed by the rationale prose body conditionally based on `open`. Rationale prose uses serif body type per §5.1 line 223.
- `aria-controls` linking the trigger to the disclosed content is the composition's responsibility if ARIA traceability is required. The primitive does not assume an id structure.

### TabularNumber

Trust boundary: value is a pre-formatted string. The primitive does not format numbers, currencies, durations, or thresholds — composition uses `formatPhp()`, `formatElapsed()`, or direct formatting at the call site.

Composition-layer obligations in Batch 7:
- `ElapsedTimeIndicator` renders `<TabularNumber value={formatElapsed(ms)} className="text-sm text-text-tertiary" />` per Decision 41 audit-panel ticking pace.
- `RiskScore` inside `RecommendationCard` (§5.1 line 222) renders `<TabularNumber value={score} className="text-xl" />`.
- `ThresholdVerificationBlock` (§5.2 line 247) renders TabularNumber for each PHP amount and threshold; mono font is applied via the surrounding block's `font-mono` class on the block, not on each TabularNumber.

---

## Section 2 — methodology

The patterns below emerged across Tasks 6.2–6.7 and now constitute a primitive-layer architectural methodology. They are reusable beyond this engagement: any future spec-bound build that walks a visual system into primitives can apply them directly.

### Three silence categories

Spec silence on a primitive's property is not uniform. Three distinct categories surfaced during Batch 6, each requiring a different response:

**Spec-silence-as-discipline.** The spec is silent because the discipline is "no affordance." Examples: Card border-radius (spec doesn't name a corner radius, institutional register defaults to crisp 90° corners); Chip drop shadow (spec doesn't name shadow, status indicators are read not pressed). Response: encode the unspoken default as a does-not-contain regression guard against the className (e.g., `expect(el.className).not.toMatch(/\brounded(-|\b)/)`). The negative assertion turns silence into a checkable constraint that resists future drift.

**Spec-silence-because-standard-pattern-exists.** The spec is silent because a recognized accessibility or interaction standard applies and the spec author did not need to restate it. Example: Modal focus trap (spec doesn't describe Tab cycling within the dialog; WAI-ARIA Authoring Practices Guide for dialog-modal is canonical); ChevronDisclosure activation (spec doesn't describe keyboard handling; the WAI-ARIA APG disclosure pattern with native `<button>` is canonical). Response: cite the standard's URL in the primitive's docstring header. Implementation is non-derived; future maintainers must not read it as a flexible default.

**Spec-silence-as-gap.** The spec is silent because the spec author did not address the question and the primitive must derive a treatment to function correctly. Examples: Button focus ring (spec doesn't name a button focus treatment; accessibility requires a positive treatment); Modal body-scroll-lock (spec doesn't name scroll behavior when modal is open; missing it is a register failure). Response: derive a defensible default, document the derivation in the commit body, flag for Batch 11 ratification. Resolution paths are either ratification into the spec proper or locking as a project-knowledge decision.

These three look identical in code (the spec says nothing about X) and have opposite meanings. Conflating them produces either over-guarded primitives (treating gap-silence as discipline-silence yields broken accessibility) or under-guarded primitives (treating discipline-silence as gap-silence introduces drift that future maintainers cannot trace).

The operational mapping — which category produces which response — is what makes the framework actionable rather than descriptive:

| Silence category | Primitive-layer response | Forensics trail |
|---|---|---|
| spec-silence-as-discipline | does-not-contain regression guard against the className | inline in primitive's test file |
| spec-silence-because-standard-pattern-exists | cite the standard's canonical URL (W3C APG, etc.) in the primitive's docstring header | inline in primitive's source file |
| spec-silence-as-gap | derive a defensible default; document derivation + alternatives considered in commit body; flag for Batch 11 ratification | commit body + Things-to-Flag list in `04_BUILD_PLAN.md` |

### Spec-positive prohibitions encoded as regression guards

Where the spec explicitly excludes a behavior, encode the exclusion as a test, not as a code comment. Tooltip's "hover OR focus triggers; no click required" (§5.6 line 400) excludes click; the regression test `fireEvent.click(trigger); expect(tooltip).not.toBeInTheDocument()` is the codified form. Modal's "the one allowed semi-transparent overlay" (§5.5 line 355) excludes cross-component overlay reuse; the regression test on the `.modal-backdrop` utility ties the discipline boundary to a testable constraint. The pattern generalizes: spec-positive prohibitions and spec-positive disciplines share the same testing surface as spec-silence regression guards.

### Multi-anchor synthesis

Composition primitives synthesize multiple spec sections rather than binding to a single anchor. Card cites six anchors (§2 surface tokens, §2 border tokens, §4 line 194 padding, §5.1, §5.4, §5.5, §5.6); Chip cites seven anchors (the §2 token reservation rules at lines 82–86, §5.1, §5.2 line 243, §5.2 line 275). The pattern reflects how the spec actually works — token definitions live in §2, padding rules in §4, component constraints in §5 — and how primitives composing those rules need to reference each layer independently. Docstring back-references list all of them; commit messages cite the most load-bearing anchor in the subject line.

### TypeScript union enforcement of spec-named enumerations

Where the spec names a finite set of values, encode them as a TypeScript union type, not as a string with runtime validation. `type Status = 'PASS' | 'FAIL' | 'QUALITY'` (Chip) and `type Variant = 'primary' | 'outline' | 'subtle'` (Button) make drift visible in the diff: a future maintainer wanting `status="INFO"` or `variant="destructive"` must edit the union, which surfaces explicitly during code review and forces a checkpoint conversation. The discipline is structural, not aspirational — the type does the enforcement, not the convention.

### Reserved-token / composition-layer trust boundaries

The primitive's runtime trusts its caller for context-correct values; the composition layer enforces context. §2 reserves `--violation-primary` for Pass 2 violations only, `--status-warning` for quality flags only; Chip does not refuse to render `status="FAIL"` outside a Pass 2 context because the primitive does not know its context. The composition layer (`AuditCheckRow` in `AuditPanel`) is where this gets enforced. Modal exhibits the inverse pattern: it owns the validation contract (submit disabled until non-whitespace) because the override-reason text input is part of the modal's spec contract; the composition does not validate. Each primitive's docstring names its trust boundaries explicitly so future maintainers don't drift toward primitive-layer composition-context enforcement or composition-layer primitive-internal validation.

### Functional-vs-theater motion distinction

Motion is not uniformly permitted or forbidden — the test is whether the motion communicates state. Three distinct motion treatments in Batch 6 demonstrate this. ProgressBar uses `transition-[width] duration-300`: width is continuous, smooth motion between adjacent values is the §5.8 "Simulated loading" implicit contract, motion is functional. Button uses `transition-colors` on hover: hover transitions are spec-allowed per §6 line 464, color shift signals interactivity. ChevronDisclosure uses no transition on rotation: rotation is binary state indication between two discrete positions, transitioning between them is theater not state. Skeleton uses no animation: animate-pulse is performance theater, the loaded-vs-loading distinction is communicated by the placeholder surface alone. The distinction is hardest to recover after the fact and most valuable to preserve in documentation.

### Testing-pattern footnotes

Two jsdom-specific quirks surfaced during Task 6.7 and are worth recording for Batch 7 (where Architecture Strip and other Decision 42 components are likely to render SVG):

**Regex word-boundary on bracketed Tailwind utilities.** The regex `/\btransition-\[width\]\b/` does not match `transition-[width]` because `\b` between `-` (non-word) and `[` (non-word) is not a word boundary. Use `/transition-\[width\]/` without the boundary anchors. Applies to any Tailwind utility with bracket syntax in regex matchers.

**SVG `.className` returns `SVGAnimatedString`.** Accessing `.className` on an `<svg>` or `<path>` element returns an `SVGAnimatedString` object, not a plain string. Regex matchers against `.className` will fail with a type error. Use `element.getAttribute('class') ?? ''` to obtain the raw class string for regex regression guards. `@testing-library/jest-dom`'s `toHaveClass` matcher handles SVG correctly and is the preferred path when asserting positive class presence; the workaround is only needed for negative regex assertions against the class string.

---

## Cross-reference: Batch 11 prerequisite list (Things-to-Flag)

Three primitive-layer derivations await ratification before production deploy. Each is documented in its primitive's docstring and in the relevant commit body, and is summarized here for the Batch 11 review pass:

| Primitive | Silence category | Current derivation | Resolution path |
|---|---|---|---|
| Button (Task 6.4) | spec-silence-as-gap | 2px `--accent-primary` outline + 2px offset on `focus-visible` (keyboard-only) | Ratify into `visual_system.md` §X focus-treatment section, OR lock as project-knowledge decision |
| Tooltip (Task 6.5) | spec-described, primitive-deferred | hover + focus only; mobile tap-to-dismiss-on-outside not implemented | Composition-layer implementation in Batch 8 form work, OR deliberate primitive extension with checkpoint approval |
| Modal (Task 6.6) | spec-silence-as-gap | `document.body.style.overflow='hidden'` on open, restore prior value on close | Ratify into `visual_system.md` §X scroll-behavior section, OR lock as project-knowledge decision |

These are design decisions deferred to Batch 11, distinct from operational prerequisites (Vercel provisioning, Upstash credential rotation, DEBUG_MODE unset). Both categories live in `04_BUILD_PLAN.md` under separate subheadings.
