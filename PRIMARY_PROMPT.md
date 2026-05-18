# PRIMARY_PROMPT — KYC Tier Decisioning Demo Build

**For Claude Code. Read this file first.** It frames the build, points to the supporting files, and establishes the disciplines that govern this work.

---

## 1. What you're building

A live web demo of a three-pass KYC tier decisioning pipeline, deployed to Vercel as a public URL at **`kyc.shiftatlas.tech`**. The demo takes a customer profile (synthetic — never real customer data) and walks the viewer through three sequential reasoning passes against an Anthropic API model: Pass 1 generates a tier recommendation with examiner-grade narrative rationale, Pass 2 audits the Pass 1 output against the full ruleset, Pass 3 conditionally corrects Pass 1 when audit catches material flaws.

The demo has two data flows in the same UI:

- **Persona playback** — four pre-generated example personas with locked Pass 1 and Pass 2 outputs, embedded as JSON, that simulate loading on click.
- **Live custom input** — viewer fills in the profile form themselves; the serverless function backend runs real Pass 1 → Pass 2 → conditional Pass 3 → re-audit calls against the Anthropic API and streams results back.

This is **not a SaaS product** and **not for sale**. It is a portfolio asset and discovery-call prop for JP Reyes / Shift Atlas demonstrating the architectural pattern that would be deployed inside a Philippine bank as a consulting engagement. Framing throughout the build (microcopy, footer language, component naming) should reflect that. The pitch is "this is the pattern we'd build for your bank, on your AWS, using your actual policy" — never "this is software you can buy."

The audience is Philippine bank compliance officers and BFSI tech leaders. Institutional register, not consumer app register.

---

## 2. The file set

This prompt set is seven files. Read them in this order:

1. **`PRIMARY_PROMPT.md`** (this file) — entry point and synthesis
2. **`visual_system.md`** — design tokens, type system, layout grid, component constraints
3. **`personas.json`** — four locked customer profiles + their pre-generated Pass 1 + Pass 2 outputs; embed as frontend constants at build time
4. **`prompts/pass_1_system_prompt.md`** — Pass 1 system prompt with embedded JSON contract; sent on every live Pass 1 call
5. **`prompts/pass_2_system_prompt.md`** — Pass 2 system prompt with embedded JSON contract; sent on every live Pass 2 call (note Pass 2 protocol below)
6. **`prompts/pass_3_system_prompt.md`** — Pass 3 system prompt with embedded JSON contract; sent on conditional live Pass 3 calls
7. **`ruleset_v1.md`** — the 25-rule ruleset for inline injection into Pass 1's system prompt

The JSON contracts for all three passes live inside their respective system prompt files. Don't extract them into a separate spec — the system prompts are authoritative and the contracts are already specified there with full schema detail. Runtime Zod validation against derived TypeScript types is specified in §4.7.

When you need deeper rationale on any architectural choice, the underlying project files (in JP's Claude Project knowledge — not part of this prompt set) contain the design history. The most consequential design decisions for this build are 1, 7, 8, 11, 13, 16, 17, 21, 22, 23, 25, 25 corollary, 27, 28, 29, 30, 31, 32, 33, 34, 35, 36, 37, 38, 39, 40, 41, and 42. You don't need to reproduce that decision history; you do need to honor the architectural commitments it produced. Those are summarized in §4.

---

## 3. Build approach: multi-session with Superpowers

This build is structured to run across 4–8 Claude Code sessions over 3–5 days, not one marathon session. The Superpowers plugin is the discipline layer; install it before opening the first session:

```
/plugin marketplace add obra/superpowers-marketplace
/plugin install superpowers@superpowers-marketplace
```

Expected session pattern:

- **Session 1 — `/superpowers:brainstorm`** — read this file and the supporting files, surface any spec gaps via Socratic questioning, produce a design document for JP to sign off on before any code is written
- **Session 2 — `/superpowers:write-plan`** — produce the implementation plan (architecture, file layout, implementation order) for sign-off
- **Sessions 3+ — `/superpowers:execute-plan`** — run the plan in batches with review checkpoints between batches
- **Session N — `/superpowers:debug`** for issues, `/superpowers:code-review` for the pre-deploy review against spec and code quality

This prompt set cooperates with the multi-session pattern. Treat each session as picking up from a checkpoint rather than re-loading the full context. If you find yourself drifting mid-session, run `/using-superpowers` to re-anchor.

**Note on brainstorm status:** the brainstorm phase for this project is complete. Eleven architectural decisions (32-42) were surfaced and resolved across collaboration between JP, this Claude Code build sequence, and JP's Claude.ai project. Those decisions are synthesized into §4-§7 below. Next session should run `/superpowers:write-plan` against this updated prompt set.

---

## 4. Architectural non-negotiables

These constraints are load-bearing. Not preferences — commitments the build must honor.

### 4.1 Three-pass reasoning pipeline, never "agents" or "agentic"

The architecture is consistently called a **three-pass reasoning pipeline** in every UI surface, microcopy string, comment, and variable name. Not "agents," not "agentic," not "AI agents." This is a deliberate positioning choice for the Philippine BFSI buyer audience — NPC Advisory 2024-04 creates regulatory sensitivity around autonomous AI decisioning, and "agent" framing reads as triggering that concern. "Reasoning pipeline" reads as architectural discipline.

The three passes are: **Pass 1 — Tier Recommendation (Generate)**, **Pass 2 — Compliance Audit**, **Pass 3 — Auto-Correction (Conditional)**.

### 4.2 Persona walkthrough does not exercise Pass 3

All four pre-generated personas (Maria, Carlos, Persona C, Persona D) lock at PASS clean — Pass 2 returns no critical or material flags, so Pass 3 does not fire. This is empirically validated across five end-to-end Pass 1 + Pass 2 chains; it is the architecture's actual behavior on well-formed inputs, not a demo limitation.

The Pass 3 correction banner UI, the re-audit panel, and the cap-reached UI are **still required and must be built**. They exercise on **live custom input only** — when a real user's profile produces a Pass 1 output that Pass 2 catches.

When implementing the persona playback flow:

- Render Pass 1 → render Pass 2 (PASS clean) → done
- Do not render a Pass 3 banner on personas
- Do not pre-stage a "correction applied" treatment on personas

When implementing live custom input:

- Render Pass 1 → render Pass 2 → if Pass 2 returns critical or material findings, fire Pass 3 → re-audit via Pass 2 → if re-audit still flags, surface cap-reached UI with full state visible and explicit analyst-attention banner
- 1-attempt Pass 3 cap for v1 demo; production talking point is 2-attempt cap

### 4.3 Pass 2 protocol: customer profile alongside Pass 1 output

Every Pass 2 call must inject **both the customer profile and the Pass 1 output** as separate inputs to the Pass 2 system prompt. Not just the Pass 1 output. The audit needs the original profile to verify rule firings against the source data — particularly the `numeric_threshold_verification` checks per Decision 23.

Pass 1 receives just the profile. Pass 2 receives profile + Pass 1 output. Pass 3 receives profile + Pass 1 output + Pass 2 output.

### 4.4 Two render-time normalizations

Two of the four personas have cosmetic schema variations from the canonical shape. Both are locked as-is at the data layer; the React orchestration normalizes at render time.

**Pass 2 normalization (Persona C):**
```ts
function normalizePass2(p2: any) {
  return {
    ...p2,
    generated_at: p2.generated_at ?? p2.audit_generated_at,
    target_check_ids: p2.target_check_ids ?? p2.target_violations,
    regeneration_scope: p2.regeneration_scope ?? "none",
    // audited_persona field on Persona C is ignored
  };
}
```

**Pass 1 normalization (Carlos and Persona C):**
```ts
function normalizePass1(p1: any) {
  return {
    ...p1,
    rules_fired: p1.rules_fired.map((r: any) => ({
      ...r,
      category: r.category === "escalation" ? "escalation_triggers" : r.category,
    })),
  };
}
```

Apply these adapters when reading from `personas.json`. The canonical shapes are what live API calls produce going forward; the normalization is for the locked persona JSON only.

### 4.5 Model ID

`claude-sonnet-4-6` for all three passes. This is the current Sonnet 4.6 model identifier as of May 2026, used in all the locked persona pre-generation. Do not substitute. If you need to verify the current model ID against Anthropic API documentation, run a web search rather than asserting from training data — see §8 on standing disciplines.

### 4.6 The audit's two "show the math" moments

Two specific audit-panel surfaces are the credibility moments that distinguish this demo from generic AI tooling. Build them with deliberate care:

**Numeric threshold verification blocks** — for every fired rule with a numeric trigger condition, Pass 2 emits a check with three fields: `profile_value`, `rule_threshold`, `comparison_result`. Render these as a small visible block inside the audit panel with a `→ PASS|FAIL` indicator on the right. This is the audit's arithmetic visibility — examiners can see the math, not infer it.

**DC-07 dual-satisfaction indicator** — DC-07 is the rule that makes NPC Advisory 2024-04 satisfaction visible in the audit trail. It has two halves: structured-record (rule appears in `rules_fired`) and prose-level (substantive `audit_trail` text). The Pass 2 audit checks both. Render the indicator as showing both halves checked, not collapsed into a single status.

These are the moments a Philippine bank compliance officer will recognize as "this person knows what an examiner asks for."

### 4.7 Schema architecture and runtime validation (Decision 34)

Runtime validation lives in Zod schemas under `lib/schemas/`. The customer profile schema's enum source of truth is `lib/forms/profileFormConfig.ts` (form-config-first, not persona-first); persona JSONs validate as subsets of the form-defined enums. A `DecisioningError` discriminated-union schema is the typed error contract returned by the API route on validation failure or model malformed-JSON. **No automatic retry in v1.**

**Schema files:**
- `lib/schemas/customerProfile.ts` — the 13-field profile shape, with enums imported from `lib/forms/profileFormConfig.ts`
- `lib/schemas/pass1.ts`, `pass2.ts`, `pass3.ts` — the three pass output schemas
- `lib/schemas/apiError.ts` — the `DecisioningError` discriminated union
- `lib/schemas/personaAdapters.ts` — exports `loadPersona(id)` which reads raw persona JSON, applies the §4.4 adapters, validates with Zod, returns typed output

**Strict/passthrough strategy:**
- `.strict()` on Pass 1 structural fields (`decision`, `risk_score.category_breakdown`, the four risk categories, trigger condition shapes) — uniformly canonical across all four personas
- `.passthrough()` on Pass 2 `metadata`, Pass 2 `pass_3_targeting`, and `rules_fired[].category` field acceptance — these absorb the locked Persona C and Carlos/Persona C variations per Decisions 28 and 29

**Typed error contract:**
```typescript
DecisioningError = {
  pass: 1 | 2 | 3 | 're-audit',
  errorType: 'malformed_model_json' | 'validation_failed' | 'upstream_timeout' | 'rate_limited' | 'cap_reached',
  zodIssues?: ZodIssue[],
  message: string,    // institutional-register, user-facing
  retryable: boolean
}
```

No automatic retry on malformed model JSON in v1. Fail visibly, log the error, surface the typed error to the UI. The first three error types are transient and surface `retryable: true`; the last two are gating and surface `retryable: false` with the institutional-register messages from §4.8.

### 4.8 Cost protection architecture (Decision 33)

The `/api/decisioning` route is protected by two composable layers — per-IP rate limiting (L1) and a global daily kill switch (L3). Bot wall (L2, Cloudflare Turnstile) is deferred to a Week-3 add-on if abuse materializes. Storage is Upstash Redis via the Vercel Marketplace integration. **Persona playback is exempt from all protection layers** (no API calls fire).

The cost protection layer sits at route entry as a single chokepoint — rate limit check, kill switch check, and telemetry increment all execute before pass dispatch. `ANTHROPIC_API_KEY` lives in Vercel project environment variables, accessed server-side only.

**L1 — Per-IP rate limit:**
- 3 live runs / IP / hour (key: `ratelimit:ip:{ip}:hour:{YYYYMMDDHH}`)
- 10 live runs / IP / day (key: `ratelimit:ip:{ip}:day:{YYYYMMDD}`)
- Returns `DecisioningError` with `errorType: 'rate_limited'`, `retryable: false`, institutional-register message

**L3 — Global daily kill switch:**
- 50 live runs / day-UTC global cap (key: `killswitch:day:{YYYYMMDD}`)
- Per-day-UTC reset at 00:00 UTC, not rolling — the "try again tomorrow" message must match actual reset behavior
- Returns `DecisioningError` with `errorType: 'cap_reached'`, `retryable: false`, institutional-register message

**Telemetry:**
- Same Upstash Redis instance holds daily-rollup counters — live runs/day, L1 hits, L3 triggers, error counts
- Exposed at `/api/admin/stats?key={env-var-secret}` for dashboard access

**Footer microcopy on live custom input panel:**
> "Live generation is rate-limited per session. Pre-generated examples are not affected."

The second sentence is load-bearing: it tells users persona buttons stay responsive even if L3 fires.

**L2 deferral plan:** If abuse materializes during the first 30 days post-launch (sustained rate-limit hits, kill-switch triggers from rotating IPs), add Cloudflare Turnstile in invisible mode at the `/api/decisioning` entry point. Not in v1 scope.

### 4.9 Orchestration shape — per-pass POSTs, single route (Decision 32)

The frontend orchestrates the three-pass pipeline through per-pass POSTs to a **single Vercel serverless route** (`/api/decisioning?pass=1|2|3`), with a `pass` query parameter branching handler logic. Each pass is a discrete HTTP call. UI renders incrementally as each call returns. Pass 3 + re-audit add two more calls in worst case (Pass 1 → Pass 2 → Pass 3 → re-audit, four sequential POSTs).

**The client-side state machine** implements the pseudocode in `07_PASS_3_DESIGN.md` §5, with each `call_pass_N()` becoming a `fetch()` to the single route with the corresponding `pass` parameter.

Re-audit reuses the `pass=2` path with the corrected Pass 1 output as input — no separate `re-audit` parameter needed; the route doesn't distinguish between original audit and re-audit (per the design discipline that re-audit is a fresh Pass 2 call with no signaling).

This pattern makes the "audit you can trust, with correction available when needed" pacing visible architecturally, not just visually. The user sees Pass 1 land, then Pass 2 start. That's not a UI flourish — it's the actual network sequence.

### 4.10 Build-time prompt and ruleset injection (Decision 35)

Prompt and ruleset injection happens at **build time** via Next.js Webpack `?raw` import suffix, not at runtime.

**Mechanism:**
```typescript
import pass1SystemPrompt from '@/prompts/pass_1_system_prompt.md?raw';
import pass2SystemPrompt from '@/prompts/pass_2_system_prompt.md?raw';
import pass3SystemPrompt from '@/prompts/pass_3_system_prompt.md?raw';
import rulesetV1 from '@/ruleset_v1.md?raw';
```

Configure Next.js Webpack to support `?raw` imports. The build inlines the prompt content as JS string constants in the function bundle. No runtime filesystem I/O.

**Marker handling — M1 pattern:**
- The source `.md` files contain descriptive prose markers (e.g., `[FULL RULESET v1 INSERTED HERE — all 25 rules with IDs, triggers, tier impacts, citations, and weights. Plus the Tier Decision Logic section verbatim from 02_RULESET_v1.md.]`)
- A `lib/prompts/markers.ts` constants file mirrors them; injection uses `String.replace()` to substitute content
- **No edits to the locked source `.md` files**
- A build-time invariant test (`lib/prompts/invariants.test.ts`) enforces three assertions:
  1. Each marker constant appears exactly once in its corresponding source prompt file
  2. Each injection content source (ruleset, customer profile, prior pass output) is non-empty after load
  3. The set of markers replaced by the injection function exactly matches the set of markers found in the source prompt files (bidirectional check — catches orphan markers)

The injection function lives in `lib/prompts/inject.ts` and exports `injectPrompt(passNumber, ruleset, profile, priorPassOutput?)` returning the fully-composed prompt string for the Anthropic API call.

### 4.11 Render-time canonical check ordering (Decision 41 Path X)

The audit panel reveal logic sorts checks into canonical order before animating, in **both persona playback and live mode**. The sort lives in `lib/orchestration/sortChecks.ts` alongside the schema normalizers.

**Sort key:** `check_type` in canonical order:
1. `hard_rule_floor`
2. `rule_firing`
3. `numeric_threshold_verification`
4. `score_arithmetic`
5. `score_band_mapping`
6. `decision_basis_consistency`
7. `pattern_substance`
8. `dc07_documentation`
9. `register_compliance`
10. `consistency`

Then by `rule_id` within each type.

**Render-time sort, not source-edit sort.** Locked persona JSON stays byte-frozen with existing tail-end orderings (Decisions 28, 29 byte-frozen discipline preserved). Three of four personas (Maria, Carlos, Persona C) have non-canonical tail-end orderings in their authored JSON; the sort normalizes them at render time. A future maintainer must not "fix" the persona JSON to match canonical order — that would inadvertently edit locked content.

---

## 5. Three data flows

The UI components are shared. The data sources differ.

### 5.1 Persona playback

- **Source:** `personas.json` bundled with the frontend at build time as a JS import (`import personasData from '@/data/personas.json'`). The locked JSON file at `08_PERSONA_OUTPUTS.md` is the source; the JSON extraction lands during Step 4 mechanical extractions of the build plan.
- **Flow:** viewer clicks one of four persona cards → simulated loading animation on Pass 1 → render Pass 1 result → simulated loading animation on Pass 2 → render Pass 2 (PASS clean) → done
- **No real API calls**
- **Mode-disclosure label** on each card: **"Pre-generated example output"** (small caption-style, readable but not visually heavy)
- All four personas ship visually equal-weight — no fourth-persona deprioritization

### 5.2 Live custom input

- **Source:** viewer fills in the profile form
- **Flow:** form submit → POST `/api/decisioning?pass=1` → render Pass 1 (elapsed-time indicator during call, ticking animation after) → POST `?pass=2` with profile + Pass 1 output → render Pass 2 → if Pass 2 returns `correction_required: true`, POST `?pass=3` → render correction banner with before/after change-log → POST `?pass=2` again for re-audit → render re-audit → if re-audit still flags, render cap-reached UI with full state visible
- 1-attempt Pass 3 cap per Decision 21
- **Real API calls** via the Vercel serverless function backend (API key server-side)
- **Mode-disclosure label:** **"Live audit"**
- **Pass-naming headlines** persist as section labels throughout:
  - "Pass 1 — Tier recommendation"
  - "Pass 2 — Audit"
  - "Pass 3 — Targeted correction"
  - "Pass 2 — Re-audit"

### 5.3 Failure path (live mode only)

When `/api/decisioning` returns a `DecisioningError` (typed contract per §4.7), the React orchestration layer renders the error in place of the pass output that would have followed. No animation per §6.2's animation discipline. The pass-naming headline stays visible as the section label, with the error rendered below in `--violation-primary` typography.

**Five error types per §4.7:**
- `malformed_model_json` — transient, `retryable: true`
- `validation_failed` — transient, `retryable: true`
- `upstream_timeout` — transient, `retryable: true`
- `rate_limited` — gating, `retryable: false`, message from §4.8
- `cap_reached` — gating, `retryable: false`, message from §4.8

Error handling is a designed surface, not an afterthought. The institutional register applies: no "Oops! Something went wrong" messaging, no apologetic tone, just clear typed-error rendering with appropriate next-step microcopy.

### 5.4 What "same UI components" means concretely

Build the recommendation card, audit panel, examiner notes section, architecture strip, and analyst control panel as components that take `pass_1` and `pass_2` (and optionally `pass_3`) props. The persona playback flow passes pre-generated objects (after applying the §4.4 adapters and the §4.11 canonical sort). The live custom input flow passes live API responses (validated through Zod per §4.7 and sorted per §4.11). Neither flow has its own bespoke rendering path.

---

## 6. UI surfaces

### 6.1 Recommendation card

- Recommended tier with prominent visual treatment (slate-blue accent on tier badge)
- Risk score (0–100) with category breakdown (escalation_triggers / tier_eligibility / documentation_process)
- "Why this tier" expandable rationale
- Suggested EDD requirements if escalated

### 6.2 Compliance audit panel — loading animation behavior (Decision 41)

The hero UI moment per the reframed Differentiator #2 ("audit you can trust, with correction available when needed"). Animation behavior is **symmetric between persona playback and live mode**.

**Per-check animation:**
- Visible rule-by-rule check at **80–120ms per check** ticking pace
- Applies in both modes — the animation IS the credibility moment; the audit panel's rule-by-rule check is what compliance officers recognize as "this is what an examiner asks for"
- Failure path skips animation per §5.3 — animation is the rendering of successful audit findings, not the rendering of failure

**Elapsed-time indicator (live mode only):**
- Appears after **500ms threshold** — fast warm-cache responses transition directly to ticking without flashing a "0.1s elapsed" indicator
- Updates at ~200ms cadence
- Format: "Pass 2 — 4.2s elapsed" in `--text-tertiary`
- Sits below the pass-naming headline as the dynamic element

**Pass-naming headlines as persistent section labels:**
- "Pass 1 — Tier recommendation"
- "Pass 2 — Audit"
- "Pass 3 — Targeted correction"
- "Pass 2 — Re-audit"
- Headlines persist throughout the pass as section labels — not transient status messages, not verb framing like "Auditing recommendation..."

**Other audit panel elements:**
- Overall status: PASS / PASS_WITH_QUALITY_FLAGS / FAIL
- Per-rule check: rule ID, status, brief evidence note, regulatory citation
- **Numeric threshold verification blocks** — see §4.6
- **DC-07 dual-satisfaction indicator** — see §4.6
- Severity counts strip: critical / material / quality
- Violation categories chip strip
- Independence attestation indicator
- Pass 3 correction actions when Pass 3 fires (live input only) — explicit before/after change-log expandable
- Cap-reached UI when re-audit catches a remaining flaw after Pass 3 (live input only) — full state visible, explicit analyst-attention banner

### 6.3 Examiner Notes section (HERO TREATMENT)

- Compliance-memo register, not bullet points — serif body type
- 4–6 paragraphs across a memo structure: Decision Summary / Profile Analysis / Rule Application / Considered Alternatives / Recommended EDD Procedures / Audit Trail
- Two-layer progressive disclosure: summary finding visible by default, full memo expandable
- This is the differentiator made visible — what a compliance officer would submit to a BSP examiner

### 6.4 Architecture strip — static positioning artifact (Decision 42)

Visual diagram with five boxes left to right: **Identity Verification › AML Screening › [Reasoning Layer] › Case Management › Core Banking**.

**Static treatment — no interactive disclosure:**
- No click-to-expand on the Reasoning Layer middle box
- No hover state on any box
- The annotation does the "what's inside" work
- Light chevrons (`›`) in `--text-tertiary` between boxes — sequence-suggestive without imposing strict topology
- Middle box (Reasoning Layer) highlighted in slate accent, others muted grey

**Production annotation — centered under the strip, not under the middle box:**

> *v1 demo: single-model with independent re-derivation.*
> *Production: multi-model audit on Bedrock with redacted input.*

Two parallel lines. `v1 demo:` and `Production:` labels in `--text-tertiary`; body in `--text-secondary`. The annotation's scope is the entire pipeline as a v1/production split, not just the Reasoning Layer — centered placement reads as "this is the annotation for the diagram," not "this is the annotation for one component."

This annotation is load-bearing — it answers the production-hardening question without prompting and signals architectural literacy.

**Mobile treatment (<768px):** five-box horizontal stack becomes vertical column. Chevrons become `↓` connectors. Annotation moves below the vertical stack. Layout change only; no interactivity added.

### 6.5 Analyst control panel — production-preview framing (Decision 36)

Primary action surface, not footer afterthought. Lives directly below the Examiner Notes section.

**Three buttons:** Approve / Escalate / Override.

**Approve confirmation block** (renders below the analyst panel on click):

```
Case approved
Analyst: Demo Analyst
Timestamp: [now ISO 8601]
Tier: [from Pass 1]
Decisive rules: [from decision.decisive_rule_ids]
Audit reference: audit-{persona_id}-{YYYYMMDDHHMMSS}
```

Microcopy underneath in `--text-tertiary`:
> *Production: this record persists to your case management workflow. Demo: this record is not retained.*

**Escalate with concordance signaling:**
- When `senior_approval_required: true` was set by Pass 1 (PEP cases like Persona C), the Escalate button **pre-click** reads **"Confirm Escalation"** instead of "Escalate," and Approve is visually de-emphasized
- Post-click confirmation block reads "Escalated" without parenthetical — the concordance cue lived in the pre-click button labeling where the analyst was actually deciding

**Override modal:**
- Click opens a modal (the one allowed semi-transparent overlay per visual_system §2)
- Required textarea: *"Document the basis for overriding the AI recommendation."*
- Submit disabled until non-whitespace content entered
- On submit: original AI recommendation renders in its **full original visual form** (same typography, field layout, risk-score treatment) with a **"Superseded by analyst override"** header strip, alongside the analyst's documented basis. Treatment mirrors the Pass 3 change-log's before/after disclosure (Decision 20)
- Escape key, click on backdrop, and explicit Cancel button all dismiss the modal without recording an override

**Post-action button state:**
- After any of the three actions, all three buttons disable
- A "Reset case" link appears underneath in `--text-tertiary` for demo re-runs
- Persona switching mid-action resets all action state; persona button functions as case-selector

**Pass 3 fires after analyst action (live mode only):**
- If a re-audit completes after the analyst has already clicked Approve/Escalate/Override on the original (uncorrected) output, the action state resets and a banner appears: *"Audit findings revised after your previous action. Action surface reset; please review the corrected recommendation."*
- If Pass 3 fires while the Override modal is open, a banner appears inside the modal but the modal does not auto-close — discarding typed-but-not-submitted analyst reasoning is the kind of small UX disrespect compliance officers notice

**Audit reference generation:** client-side at render time as `audit-{persona_id}-{YYYYMMDDHHMMSS}` using readable timestamp format (not epoch). For live custom-input runs, replace `persona_id` with a session-scoped short hash.

### 6.6 Custom input form (Decision 37)

The 13-field profile form. Control types calibrated to input character; layout follows regulatory function, not data type.

**4-group regulatory-function layout:**

```
┌─────────────────────────────────────────────────────┐
│ Customer identity                                    │
│   customer_reference, identity_document_type,        │
│   residency_status, customer_type                    │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ Account & behavior                                   │
│   occupation_type, source_of_funds, account_purpose, │
│   expected_monthly_volume_php                        │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ Risk indicators                                      │
│   pep_status, sanctions_screening,                   │
│   high_risk_jurisdiction_connection, adverse_media   │
└─────────────────────────────────────────────────────┘
┌─────────────────────────────────────────────────────┐
│ Relationship                                         │
│   years_with_bank                                    │
└─────────────────────────────────────────────────────┘
```

Each group is a `--surface-elevated` card with 24px internal padding. Section labels in `--text-tertiary`.

**Composite-prone fields — sub-control pattern:**

Three fields require composite input. Primary select renders cleanly; selecting a compose option (or hitting "+ Add another") reveals secondary controls. UI joins to canonical wire string on submit:

- `source_of_funds` — Primary single-select (salary / business / investments / inheritance / remittance / unclear) + optional "+ Add additional source" link revealing secondary select with remaining options. Joins to `"mixed (salary + inheritance)"` on submit.
- `account_purpose` — Same pattern. Joins to `"business and remittance"` on submit.
- `identity_document_type` — Primary select (PhilSys / passport / driver's license / other government ID) + checkbox "PhilSys enrollment in process" (active only when primary ≠ PhilSys). Joins to `"passport (PhilSys enrollment in process)"` on submit.

Wire format remains string to match locked persona JSON; the sub-control is purely a UI affordance over the underlying canonical string.

**`occupation_type` — enum-or-free-text union:**

Schema accepts either an enum value (employed / self-employed / business owner / student / OFW) or a free string. Three guards on the free-text branch:
1. `z.string().min(3)` — prevents single-character or accidental input
2. Enum-match normalization — if user types "Employed" in the free-text branch, normalize silently to the enum value rather than rejecting
3. Trim and case-normalize before validation

**Numeric field — `expected_monthly_volume_php`:**
- "PHP" prefix label in `--text-tertiary`
- Tabular-figures display
- Format-on-blur with thousand separators ("PHP 850,000")
- Internal state holds integer; display formats

**Regulatory citation tooltips — always on, restrained:**

`?` glyph in `--text-tertiary` next to field labels on four non-obvious fields: `pep_status`, `high_risk_jurisdiction_connection`, `source_of_funds`, `customer_type`. Hover or focus triggers the tooltip; no click required. Citation-only content, no explanation or marketing language.

Example for PEP: *"Person currently or formerly in a prominent public function, or their family / close associates — FATF R.12, MORB §923."*

Mobile treatment: tap `?` glyph → tooltip appears, tap elsewhere or glyph again → dismisses.

**Form validation:**
- React Hook Form + Zod resolver, sharing `CustomerProfileSchema` from `lib/schemas/customerProfile.ts` (same schema the API handler validates against on POST)
- All fields required; numeric > 0; composite fields require minimum 1 selection
- Inline error messages in `--violation-primary --text-sm` below each field, appearing on blur after first interaction (no eager error spam)

**Submit button:** "Run three-pass analysis" in `--accent-primary`, full-width on mobile, right-aligned on desktop.

**Mode-disclosure label above the form:** "Live audit" in `--text-tertiary --text-xs`.

**Open verification before form implementation:** `years_with_bank` field type — confirm against `personas.json` whether numeric or enum. If numeric, render as integer input in the Relationship group rather than enum dropdown.

### 6.7 Footer

- Regulatory citation block — pull current citations from `ruleset_v1.md`
- "Reference architecture: deployed via Amazon Bedrock in client AWS environment"
- "Customer data never leaves client infrastructure"
- "Final decision authority rests with the compliance analyst"
- Shift Atlas attribution

The DPA / data residency objection-handling is encoded in the footer language plus the architecture strip's production annotation. Together they answer the buyer's #1 anxiety without prompting.

---

## 7. Deployment specifics

Per Decision 30, the deployment surface is Vercel + Claude Code build (not a Claude artifact).

### 7.1 Project shape

- **Framework:** Next.js with App Router
- **Frontend:** `/app` directory
- **Backend serverless function:** `/app/api/decisioning/route.ts`
- **Single Vercel project** — no monorepo split, no separate frontend/backend repos
- **Schemas:** `/lib/schemas/`
- **Form config:** `/lib/forms/profileFormConfig.ts`
- **Prompt injection:** `/lib/prompts/`
- **Orchestration utilities:** `/lib/orchestration/`
- **Persona data:** `/data/personas.json`

### 7.2 API key and environment

- `ANTHROPIC_API_KEY` is set in **Vercel project environment variables**, accessed server-side only via `process.env.ANTHROPIC_API_KEY` from inside the serverless function
- **Never** in frontend code, **never** in the repo, **never** in `.env` files committed to git
- `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` injected by Vercel Marketplace integration for cost-protection storage
- The viewer does not need a Claude account — the demo URL works for anyone

### 7.3 URL — `kyc.shiftatlas.tech` (Decision 38)

- Production URL: **`kyc.shiftatlas.tech`** — subdomain of JP's existing `shiftatlas.tech` brand domain
- Development: Vercel-default `*.vercel.app` URL during build phase
- DNS: Add `kyc.shiftatlas.tech` as a domain in Vercel project settings; CNAME record at DNS provider points `kyc` to Vercel's edge
- SSL: automatic via Let's Encrypt through Vercel
- Production URL binding lands at production deploy step; build proceeds on default URL

### 7.4 Deployment workflow

- Vercel CLI: `vercel` for preview deploys, `vercel --prod` for production
- Preview deployments per branch are useful during multi-session build for sharing in-progress versions
- Hobby tier is sufficient for v1 launch; upgrade to Pro is straightforward if usage exceeds Hobby caps
- The production URL must be **stable** — it's referenced across a multi-post LinkedIn series (Decision 31), and the URL changing mid-series breaks the content cadence

### 7.5 Anthropic API specifics

- Endpoint: standard `/v1/messages` on `api.anthropic.com`
- Model: `claude-sonnet-4-6` for all three passes
- Standard request shape — no streaming required for v1 (loading animations on the frontend cover the wait)
- Errors from the API (rate limits, content filtering, transient failures) must surface as typed `DecisioningError` per §4.7 — not generic "something went wrong" messages

If anything in this section conflicts with current Anthropic API documentation or Vercel deployment behavior, **the documentation wins** — search and verify rather than asserting from training data. See §8.

### 7.6 Mobile floor — three-tier hierarchy (Decision 39)

Three viewport tiers govern the responsive behavior:

| Tier | Breakpoint | Behavior |
|---|---|---|
| **Primary design target** | ≥ 1280px | Full intended treatment; viewport 1280px with 1180px content max-width and 50px gutters |
| **Holding target** | ≥ 1024px | Design holds: audit panel density preserved, architecture strip horizontal, two-column form preserved. No reflow. |
| **Functional floor** | ≥ 768px | Content reflows: audit panel becomes scrollable list, architecture strip stacks vertically, custom-input form becomes single-column. No design breakage, no horizontal scrolling. |
| **Degraded** | < 768px | Readable, not impressive. No phone-native styling. |

**Tailwind-aligned breakpoint mapping:**
```
sm: 640px   - degraded mobile (no design budget)
md: 768px   - functional floor (single-column reflow, must not break)
lg: 1024px  - holding target (design holds, audit panel density preserved)
xl: 1280px  - primary design target (full intended treatment)
```

Each component built is tested at `xl`, expected to hold at `lg`, required to not break at `md`. The compliance officer reviewing on a desktop is the dominant case; phone-share-from-LinkedIn just needs to not be broken.

### 7.7 Repo discipline (Decision 40)

**Git initialization is deferred to the design-doc commit step** in the build sequence, not performed at build folder creation. The first commit contains the seven spec files (PRIMARY_PROMPT.md, ruleset_v1.md, the three pass system prompts, personas.json, visual_system.md), the design doc itself, and a complete `.gitignore`.

**`.gitignore` content:**
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
```

**Secret hygiene:**
- `ANTHROPIC_API_KEY` lives exclusively in Vercel project environment variables
- **No `.env.example` with placeholder keys** is ever committed — the paste-over failure mode is well-documented as a real key-leak path
- Key documentation lives in README only with explicit "set this in Vercel env vars" instruction

---

## 8. Standing disciplines for this build

### 8.1 Search before asserting

For any factual question about Anthropic API behavior, model IDs, pricing, Vercel platform behavior, Next.js framework conventions, BSP regulatory citations, Upstash Redis integration, or any library version — **search the web before asserting**. Training data goes stale. JP's standing discipline is search-first; carry that into Claude Code sessions.

This applies particularly when:
- Verifying the current Anthropic model ID matches `claude-sonnet-4-6`
- Checking Next.js API route conventions (App Router vs Pages Router patterns shift)
- Verifying Vercel environment variable behavior and Marketplace integrations
- Confirming Upstash Redis client API for current SDK version
- Confirming any regulatory citation matches current BSP / FATF source documents

### 8.2 No real customer data, ever

All inputs are synthetic personas. The four pre-generated personas are synthetic by construction. Live custom input is filled by the viewer themselves, treated as session-scoped, never persisted, never logged with PII. DPA violation risk is non-negotiable.

### 8.3 Institutional register

No decorative icons. No generic dashboard tropes (sparkline strips across the top, KPI cards with arrows, decorative gradients). No buzzword density in microcopy. No emoji in the UI. No marketing voice. Slate-blue accent is restrained — it's the "pop," used sparingly. See `visual_system.md`.

### 8.4 Never call it an agent

Re-stating §4.1 as a discipline because it's easy to slip on under cognitive load: the architecture is a three-pass reasoning pipeline. Not agents. Check microcopy, comments, variable names, file names, and console output before commit.

### 8.5 Locked artifacts stay locked

The byte-frozen discipline applies to:
- The four locked persona JSONs (Decisions 28, 29) — variant shapes get normalized at render time per §4.4, not edited at source
- The three pass system prompts (`prompts/pass_*.md`) — injection scaffolding lives in `lib/prompts/markers.ts`, not in the source prompts (per §4.10)
- The 25-rule ruleset in `ruleset_v1.md`

When a build choice would require editing a locked artifact, the right answer is almost always an adapter, normalizer, or constants file — not a source edit.

---

## 9. Bank engagement reuse appendix

This file set is not just the demo build prompt — it is the architectural pattern Shift Atlas would deploy inside a Philippine bank as a consulting engagement. The reuse framing matters because it informs how microcopy reads, how the architecture strip annotation is worded, and how the production talking points show up in the discovery-call conversations the demo seeds.

**What's reusable across bank engagements:**

- The three-pass reasoning pipeline architecture (generate → audit → conditional correct, with re-audit loop and analyst-surfacing on cap-reached failure)
- The audit schema with `numeric_threshold_verification` enforcement (Decision 23) and DC-07 dual-satisfaction enforcement (Decision 25 corollary) — these are production-hardening templates, not demo-specific
- The orchestration architecture (per-pass POSTs, single API route, client-side state machine) — production-ready pattern
- The schema architecture (Zod validation, form-config-first enum source of truth, typed error contract) — applies to any compliance-decisioning system
- The ruleset translation methodology — taking a bank's actual CDD policy and producing a structured ruleset with categorical conventions, severity stratification, regulatory citations, and threshold-arithmetic discipline
- The prompt strengthening pattern surfaced empirically through Step 4.5's pre-generation forcing function (five qualitatively-distinct findings: Decisions 23, 25, 25 corollary, 26, 27)
- The two-data-flow UI pattern (pre-generated example outputs alongside live generation) for buyer-facing demos
- The "audit you can trust, with correction available when needed" framing for differentiator positioning

**What would be customer-specific in a bank engagement:**

- The bank's actual CDD policy translated into a ruleset (their thresholds, their EDD triggers, their senior-approval routing)
- Integration with their existing identity verification, AML screening, case management, and core banking systems
- Their AWS environment (regional endpoint, IAM patterns, audit logging conventions)
- Their compliance analyst workflow (how Approve / Escalate / Override fits into their case management; persistence layer for the action records)
- The visual treatment may match the bank's brand or stay neutral per their preference

**Production architecture talking points (encoded in microcopy and footer):**

- Customer data never leaves the bank's AWS infrastructure
- Anthropic does not see prompts or responses (Bedrock private endpoint pattern)
- Audit trail is immutable and regulatory-examination-ready
- Multi-model audit hardening available in production (e.g., Opus auditing Sonnet on redacted input — Decision 13)
- Shift Atlas delivers methodology and architecture; the bank's IT team or a partner systems integrator handles AWS deployment

When you're writing microcopy or component naming during the build, default to language that would still make sense if this exact codebase were the starting point for a bank engagement next month. That's the test.

---

## 10. Decision-history pointers

You don't need to reproduce the decision history. You do need to know it exists and consult it when a question arises that the prompt set above doesn't answer. The decisions most likely to come up during build:

**Foundational (Decisions 1-31):**
- **Decision 1** — Slate-blue accent rationale and color tokens
- **Decision 7** — Examiner Notes hero treatment
- **Decision 8** — Pass 3 correction banner UI
- **Decision 11** — Two-layer progressive disclosure on Examiner Notes
- **Decision 13** — Single-model architecture for v1, multi-model audit for production
- **Decision 16** — "Three-pass reasoning pipeline," not agents
- **Decision 17** — Analyst as decision authority, not final approver
- **Decision 21** — Re-audit loop architecture, 1-attempt cap for demo, cap-reached UI requirement
- **Decision 22** — Original four-persona structure (amended by Decision 27)
- **Decision 23** — Structural enforcement of numeric threshold checks via `numeric_threshold_verification` schema field
- **Decision 25** — Ruleset edit for PEP senior management approval (ES-02, ES-03)
- **Decision 25 corollary** — DC-07 dual-satisfaction prompt strengthening
- **Decision 27** — Visible self-correction repositioned to opportunistic-on-live-input; all four personas at PASS clean; Pass 3 not exercised on persona walkthrough
- **Decision 28** — Persona C Pass 2 schema-shape variation; render-time adapter
- **Decision 29** — Pass 1 `rules_fired[].category` field convention variation; render-time adapter
- **Decision 30** — Vercel + Claude Code deployment surface
- **Decision 31** — Multi-post LinkedIn content series

**Architecture decisions (Decisions 32-42 — incorporated above):**
- **Decision 32** — Orchestration shape: per-pass POSTs, single route with `pass` parameter (§4.9)
- **Decision 33** — Cost protection: L1 + L3 with Upstash Redis (§4.8)
- **Decision 34** — Schema architecture: Zod + form config as enum SSOT + typed errors (§4.7)
- **Decision 35** — Prompt template injection: build-time via `?raw` Webpack rule, M1 markers (§4.10)
- **Decision 36** — Analyst control panel: ephemeral with production-preview framing (§6.5)
- **Decision 37** — Custom input form: composite sub-controls + 4-group layout + regulatory tooltips (§6.6)
- **Decision 38** — URL: `kyc.shiftatlas.tech` via Vercel subdomain (§7.3)
- **Decision 39** — Mobile floor: three-tier hierarchy (§7.6)
- **Decision 40** — Repo discipline: deferred git init + strict secret hygiene (§7.7)
- **Decision 41** — Loading animation: symmetric with architectural narration; canonical sort at render time (§6.2, §4.11)
- **Decision 42** — Architecture strip: static positioning artifact (§6.4)

If a build choice arises that touches one of these, the design rationale is in `03_DESIGN_DECISIONS.md` (in JP's Claude Project knowledge — ask JP if you need the relevant excerpt).

---

## 11. What "done" looks like for this build

The build succeeds when:

1. The four pre-generated personas play back correctly, all rendering at PASS clean with all 25–30 audit checks visible per persona, sorted into canonical order per §4.11
2. Live custom input runs the real three-pass chain end-to-end against `claude-sonnet-4-6` via the Vercel serverless function
3. When live custom input produces a Pass 1 output that Pass 2 catches as material, Pass 3 fires and the correction banner renders the before/after change-log
4. When Pass 3 + re-audit cannot resolve a flaw, the cap-reached UI surfaces with full state visible
5. The numeric threshold verification blocks and DC-07 dual-satisfaction indicator render as substantive audit artifacts, not decorative status chips
6. The architecture strip's production annotation is visible and readable, centered under the strip
7. The analyst control panel is a primary action surface with production-preview case-management record artifacts on action, ephemeral demo state disclosed in microcopy
8. The visual treatment reads as institutional financial-publication, not generic AI-generated
9. The production URL is `kyc.shiftatlas.tech`, the API key is server-side only, viewers do not need a Claude account, and the cost-protection layers (L1 + L3) are operational
10. The Zod validation pipeline catches malformed model JSON and surfaces typed errors without retry
11. A Philippine bank compliance officer who opens the URL recognizes the ruleset as plausibly aligned with their actual CDD policy and the audit panel as the kind of artifact a regulatory examiner would want to see

The first ten are buildable. The eleventh is the test JP runs after the build.

---

**Begin with `/superpowers:write-plan` (brainstorm phase is complete; decisions are synthesized above).**
