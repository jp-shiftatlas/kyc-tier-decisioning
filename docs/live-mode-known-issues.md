# Live Mode — Known Issues (Batch 12 demo-prep findings)

**Status as of 2026-05-22:** Live mode (`Enter your own profile` path) is **hidden** behind the `NEXT_PUBLIC_LIVE_MODE_ENABLED` env var pending prompt/schema reconciliation work. Persona-mode playback for the four locked personas (Maria, Carlos, Convergent Hybrid, Documentation-Process) remains fully functional and is the demo's primary surface.

This document captures the prompt/schema drift findings surfaced during JP's Batch 12 live-mode walkthrough on the deployed Vercel preview, so the next code session can pick up the diagnostic thread without re-deriving the diagnosis.

---

## TL;DR for the next session

Live mode triggers a cascade of model-behavior inconsistencies that surface as UI failures:

1. **Pass 1 rules_fired entries lack `rule_name` + `tier_impact`** (Path Q schema is strict; model omits looseObject fields the curated personas carry). **Mitigated** by `lib/decisioning/ruleCatalog.ts` static fallback.
2. **Pass 1 emits self-contradicting risk scores** — the structured `risk_score.total` and `category_breakdown.tier_eligibility` don't reconcile with `sum(rules_fired[].weight)`. Pass 2 catches this as a material violation; Pass 3 sometimes corrects only the JSON without updating the examiner_notes prose, which produces re-audit re-flagging.
3. **Pass 1 fires rules whose trigger conditions are unmet** ("business-owner-adjacent" reasoning to fire TE-09 when `occupation_type: 'employed'`). Pass 2 catches this; Pass 3 may or may not actually remove the misfired rule from the corrected output.
4. **Pass 2 returns `correction_required: false` despite material findings** — internal inconsistency. **Mitigated** by route-layer reconciliation (`reconcilePass2CorrectionRequired` in `app/api/decisioning/route.ts`).
5. **Pass 3 partial corrections** — the model fixes the structured JSON but leaves contradictory prose in `examiner_notes_full.decision_summary`, so the re-audit catches the prose inconsistency and routes to `correction_failed_surfaced` (cap-reached UI). This is correct UX behavior but maps to a 100% failure rate on live custom inputs that trigger Pass 3.
6. **Pass 2 re-audit occasionally fails schema validation entirely** (one observed instance) — `Model output did not match the expected schema` from `parseModelJson`. **Mitigated UX-wise** by `friendlyMessageForModelError` wrapper but the underlying schema/prompt drift remains.

---

## Observed walkthrough — JP submission, 2026-05-22

**Profile submitted:** custom (business owner / employed mismatch, ~PHP 850K/mo volume, new relationship).

### Pass 1 output (live model)

- `recommended_tier: EDD`
- `risk_score.total: 45`
- `risk_score.category_breakdown.tier_eligibility: 45`
- `rules_fired: [TE-05, TE-09, DC-01, DC-07]`
- `decision_basis: hard_rule`
- `decisive_rule_ids: [TE-05]`

**Issue:** sum of `rules_fired[].weight` is 15 + 5 + 0 + 0 = 20, not 45 as reported. The model fabricated the score in the structured `risk_score` field.

**Issue:** TE-09 fired with profile `occupation_type: 'employed'`, but TE-09's trigger condition requires `Occupation = 'business owner'`. The model's reasoning explicitly characterized the profile as "business-owner-adjacent" — analogical firing, not permitted by the ruleset.

### Pass 2 original audit (live model)

- `overall_status: FAIL`
- `severity_counts: { critical: 0, material: 2, quality: 0 }`
- Findings:
  - `CHK-TE09-FIRING` (severity: material) — TE-09 misfiring on employed occupation
  - `score_arithmetic` (severity: material) — 45 ≠ sum(weights)=20
- `correction_required: false` ← inconsistent with the material findings; **server-side reconciliation now overrides to true**

### Pass 3 correction (live model)

- Pass 3 fired (after reconciliation override).
- `corrected_pass_1_output`: structured `risk_score.total` corrected to `15` (after removing TE-09 contribution).
- However, `examiner_notes_full.decision_summary` was NOT corrected — still references "composite risk score of 45 with tier_eligibility contribution of 45" and "score independently falls in the 31+ EDD band."

### Pass 2 re-audit (live model)

- `overall_status: FAIL`
- `severity_counts: { critical: 0, material: 2, quality: 0 }`
- Findings:
  - `score_arithmetic` — examiner_notes prose says 45, structured JSON says 15 (internal inconsistency Pass 3 introduced by partial correction)
  - `score_band_mapping` — prose claims 31+ band, structured says 11-30 band
- `correction_required: true` (or reconciled to true)
- Routes to `correction_failed_surfaced` (cap-reached UI with 4-section layout).

### UX outcome

The cap-reached UI surfaces successfully and renders the 4 sections (Original recommendation / Original audit / Correction attempted / Re-audit findings). The state-machine + cap-reached layout work correctly. **The problem is that nearly every live custom input lands in cap-reached** because Pass 3 partial-correction is the dominant failure mode.

---

## Root-cause hypotheses (prompt + schema)

### Pass 1

- The Path Q template (Batch 11A Phase 2) constrains output to declared schema fields, omitting `rule_name` + `tier_impact` per rule. The locked personas carry these via looseObject passthrough.
- **No prompt-level guard against fabricated scores.** The model is asked to compute `risk_score.total` but the prompt doesn't explicitly require reconciliation against `sum(rules_fired[].weight)`. Result: model emits a plausible-sounding number that doesn't math out.
- **No prompt-level guard against analogical rule firing.** The model is asked to "fire rules whose trigger conditions are met" but the prompt doesn't explicitly say "do not fire rules whose triggers are unmet, even if related." Result: model fires TE-09 on "business-owner-adjacent" reasoning.

### Pass 2

- **`correction_required` is not derived from check severities.** The prompt asks the model to set `correction_required` based on findings, but provides no explicit rule like "set correction_required: true if and only if any check has severity 'critical' or 'material'". Result: model can return material findings + `correction_required: false`.
- **No prompt-level guard against the schema-validation gap.** Occasional `Model output did not match the expected schema` (one observed during re-audit) means the model emits structurally invalid JSON on edge cases.

### Pass 3

- **The prompt allows partial correction.** The system prompt asks Pass 3 to correct Pass 1's flaws based on Pass 2's findings, but the correction can target the structured decision OR examiner notes OR both. Result: the model fixes the structured `risk_score.total` field but leaves contradictory prose in `examiner_notes_full.decision_summary` — both literally claiming different scores.
- The `change_log` doesn't enforce "if you change a structured value, you must also update any prose that references the old value."

---

## Mitigations already landed (this batch)

| Mitigation | File | Commit |
|---|---|---|
| Rule name/impact fallback catalog | `lib/decisioning/ruleCatalog.ts` + `components/decisioning/RecommendationCard.tsx` | `412ccc1` |
| Live-mode loading indicators (Pass 1/2/3 in-flight states) | `components/screens/AuditScreen.tsx` | `412ccc1` |
| Pass 2 `correction_required` server-side reconciliation | `app/api/decisioning/route.ts` (`reconcilePass2CorrectionRequired`) | `1a02f34` |
| Friendly error messages for model-output failures | `app/api/decisioning/route.ts` (`friendlyMessageForModelError`) | `1ef5bc4` |
| Top-level try-catch around POST handler (no more HTML error pages) | `app/api/decisioning/route.ts` | `662d302` |
| `RATE_LIMIT_HOURLY` bump 3 → 5 (demo headroom) | `lib/costprotection/rateLimit.ts` | `360c1a8` |
| Rate-limit + kill-switch scope to pass=1 only (count per run, not per call) | `app/api/decisioning/route.ts` | `e222c3b` |
| Live mode hidden behind `NEXT_PUBLIC_LIVE_MODE_ENABLED` env var | `components/screens/PersonaSelectScreen.tsx` | _this commit_ |

---

## Open work — prompt/schema side (JP's durable-state surface)

These changes touch `prompts/*.md` and require ratification on JP's parallel-thread surface. **Code session should NOT edit these directly** — surface a draft and let JP commit verbatim.

### Decision 53 candidate (Pass 2 prompt strengthening)

Add to `prompts/pass_2_system_prompt.md` an explicit derivation rule:

> **Critical: set `correction_required` based on check severities.**
> Set `correction_required: true` if any check in the `checks` array has `severity: 'critical'` or `severity: 'material'`. Set `correction_required: false` only if every check has `severity: 'quality'` or null. Do not infer `correction_required` from your overall judgment; derive it mechanically from the per-check severity values you assign.

The server-side reconciliation in `reconcilePass2CorrectionRequired` is defensive — should remain even after the prompt fix lands, as a belt-and-suspenders measure.

### Decision 54 candidate (Pass 1 score-arithmetic discipline)

Add to `prompts/pass_1_system_prompt.md` a reconciliation guard:

> **Critical: risk_score.total MUST equal the sum of rules_fired[].weight.**
> Before emitting your JSON, verify that `risk_score.total` equals the arithmetic sum of every `weight` value in your `rules_fired` array. Verify that `risk_score.category_breakdown.tier_eligibility` equals the sum of weights from rules with `category: 'tier_eligibility'`. Verify the corresponding sums for `escalation_triggers` and `documentation_process`. If your computed totals disagree, regenerate before output — do NOT emit a JSON where these reconciliation checks would fail.

### Decision 55 candidate (Pass 1 rule-firing discipline)

Add to `prompts/pass_1_system_prompt.md`:

> **Critical: do not fire rules whose trigger conditions are unmet.**
> Each rule in the ruleset has a literal trigger condition (e.g., TE-09 requires `Occupation = 'business owner'`). Fire a rule only when the profile's field values strictly match the trigger as written. Do not fire rules on the basis of analogical reasoning ("business-owner-adjacent", "approximately a PEP", "implicitly satisfies the trigger"). Risk observations and tensions between profile fields belong in the `rule_application_and_risk_pattern` examiner-notes section, NOT in `rules_fired`. If you find yourself reasoning that a rule "should" fire despite a trigger mismatch, the right surface is the risk pattern analysis or the compounding factors discussion — not a rules_fired entry.

### Decision 56 candidate (Pass 3 full-cascade correction)

Add to `prompts/pass_3_system_prompt.md`:

> **Critical: corrections must cascade to all affected fields.**
> When you correct a structured value (e.g., `risk_score.total`, `rules_fired`), you MUST also update any prose in `examiner_notes_full` that references the old value. Pass 2's re-audit will catch internal inconsistencies between structured fields and examiner-notes prose as new material findings. Use the `change_log` to enumerate every field touched, including prose sections. If you change the structured `risk_score.total` from 45 to 15, the `examiner_notes_full.decision_summary` must also be updated to remove or restate the "45" reference. If you remove a rule from `rules_fired`, the `examiner_notes_full.rule_application_and_risk_pattern` must also be updated to remove that rule's discussion.

The above three Pass 1 changes (Decisions 54 and 55) are the most impactful because they prevent the Pass 2 → Pass 3 → re-audit cascade from triggering in the first place. Decision 56 addresses the Pass 3 partial-correction problem when it does trigger.

---

## How to re-enable live mode for testing

Set the env var in your `.env.local` (local) or Vercel project settings (preview / production):

```
NEXT_PUBLIC_LIVE_MODE_ENABLED=true
```

Then walk through the live path. Submissions still hit the real Anthropic API; cost protection (L1 hourly + L3 daily kill switch) applies per Decision 33.

When the prompt-side fixes (Decisions 53–56) land and live mode is reliable, drop the env var (unset = hidden by default), or flip default behavior in `PersonaSelectScreen.tsx` to render the tile unconditionally and treat the env var as a kill switch instead.

---

## File-pointer index for the next session

- **Route handler:** `app/api/decisioning/route.ts`
- **Anthropic client wrapper:** `lib/anthropic/client.ts` (parseModelJson + callPass)
- **State machine (Pass 3 gate):** `lib/orchestration/stateMachine.ts:285` — reads `parsed.data.correction_required`
- **Pass 2 schema:** `lib/schemas/pass2.ts`
- **Pass 1 schema:** `lib/schemas/pass1.ts`
- **Pass 3 schema:** `lib/schemas/pass3.ts`
- **Audit screen state-driven render:** `components/screens/AuditScreen.tsx`
- **Persona-mode simulation phase:** `components/screens/AuditScreen.tsx` (~line 90; sim-pass-1, sim-pass-2, reveal)
- **Rule catalog fallback:** `lib/decisioning/ruleCatalog.ts`
- **Live-mode tile gate:** `components/screens/PersonaSelectScreen.tsx` (`LIVE_MODE_ENABLED` constant)
- **Prompt sources (JP's surface):** `prompts/pass_1_system_prompt.md`, `prompts/pass_2_system_prompt.md`, `prompts/pass_3_system_prompt.md`
