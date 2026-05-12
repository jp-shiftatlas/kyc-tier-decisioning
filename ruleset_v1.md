<!--
Ruleset v1 — Philippine Bank CDD Tier Decisioning

Source: 02_RULESET_v1.md (sections: Regulatory Anchor Stack, The 25 Rules, Tier Decision Logic, Risk Score Display, Category Convention)
Locked: v1 with edits through May 9, 2026 (ES-02 and ES-03 senior management approval per Decision 25)
Verified: Citations checked against current BSP and FATF source documents (May 9, 2026 web search)

This file is the runtime ruleset injected inline into Pass 1's, Pass 2's, and Pass 3's system prompts at the
marked insertion points (`# The Ruleset` section in each prompt). Same content goes to all three passes —
they share the same regulatory ground truth.

Excluded from this file vs the source design doc: "What This Ruleset Is" framing paragraph, "Key correction
from original brief" meta-commentary, "Open Items / Edits Pending", "Edit History". Those are documentation
for humans understanding the ruleset's history; the model only needs the rules themselves and the surrounding
regulatory context.
-->

# Ruleset v1 — Philippine Bank CDD Tier Decisioning

## Regulatory Anchor Stack (Current as of May 2026)

| Anchor | Status | Role |
|---|---|---|
| **MORB §921 / MORNBFI §921Q** | Active | Master CDD framework — risk-based tiered system (reduced/average/enhanced) |
| **MORB §923 / MORNBFI §923Q** | Active | Additional preventive measures for specific customers — operative section for PEP enhanced due diligence including senior management approval requirement |
| **BSP Circular 1170 (Mar 2023)** | Active | e-KYC and digital ID provisions, PhilSys integration |
| **BSP Circular 1218 (Sept 2025, effective Oct 7 2025)** | Active | EDD for large-value cash transactions, originally PHP 500K threshold |
| **BSP Memorandum M-2023-029** | Active | CDD measures for PEPs — reaffirms FATF R.12 obligations apply to PEPs, family members, and close associates |
| **BSP Memorandum M-2026-005** | Active | Per-customer (not per-transaction) EDD basis, streamlining for known business profiles |
| **BSP Circular 1230 (Feb 27, 2026)** | **Current** | EDD threshold raised PHP 500K → **PHP 1M** |
| **AMLA / RA 9160 (as amended)** | Active | Foundational AML obligations |
| **DPA / RA 10173** | Active | Data privacy baseline |
| **NPC Advisory 2024-04** | Active | AI lifecycle privacy obligations, controller accountability |
| **FATF Recommendations 10–12** | Active | International CDD baseline; R.12 mandates senior management approval, source of wealth/funds verification, and enhanced ongoing monitoring for all PEP categories including family members and close associates |
| **RA 11055 (PhilSys Act)** | Active | PhilSys ID acceptability as primary identification |

---

## The 25 Rules

Three categories: **Tier Eligibility (10) | Mandatory Escalation Triggers (8) | Documentation & Process (7)**.

### Tier Eligibility (TE-01 through TE-10)

| ID | Rule | Trigger | Tier Impact | Citation | Weight |
|---|---|---|---|---|---|
| TE-01 | Low-risk profile baseline | Salaried PH resident, single account purpose (savings/payroll), expected volume <PHP 50K/mo, clean sanctions, no PEP, PhilSys/PhilID presented | SDD eligible | MORB §921(a) | -15 |
| TE-02 | Standard profile baseline | Employed/self-employed PH resident, expected volume PHP 50K–500K/mo, clean adverse media, conventional source of funds | Standard | MORB §921(a) | 0 |
| TE-03 | High volume threshold | Expected monthly volume ≥ PHP 1M | EDD required | BSP Circular 1230 (2026) | +25 |
| TE-04 | Mass affluent / private banking customer type | Customer type = mass affluent or private banking | EDD required | MORB §921(a), §923 | +20 |
| TE-05 | New relationship + high volume | Years with bank = "new" AND expected volume ≥ PHP 500K/mo | EDD required | MORB §921(a) | +15 |
| TE-06 | OFW with regular remittance pattern | Residency = OFW, account purpose = remittance, source of funds = salary, expected volume <PHP 500K/mo | SDD eligible | MORB §921(a) | -10 |
| TE-07 | Non-resident foreign individual | Residency = non-resident foreign | EDD required | MORB §921(a), FATF R.10 | +20 |
| TE-08 | Student account, low volume | Customer profile = student, expected volume <PHP 30K/mo, no high-risk indicators | SDD eligible | MORB §921(a) | -10 |
| TE-09 | Business owner, sole proprietor | Occupation = business owner, account purpose = business, source of funds = business | Standard minimum, EDD if other triggers fire | MORB §921(a), §923 | +5 |
| TE-10 | Unclear or unverifiable source of funds | Source of funds = unclear OR cannot be substantiated | EDD required, escalate | MORB §921(a), AMLA §9 | +25 |

### Mandatory Escalation Triggers (ES-01 through ES-08)

| ID | Rule | Trigger | Tier Impact | Citation | Weight |
|---|---|---|---|---|---|
| ES-01 | PEP — self | PEP status = self | **Mandatory EDD, senior management approval** | MORB §921, MORB §923, AMLA, FATF R.12 | +40 |
| ES-02 | PEP — immediate family | PEP status = immediate family | **Mandatory EDD, senior management approval** | MORB §921, MORB §923, FATF R.12 | +30 |
| ES-03 | PEP — close associate | PEP status = close associate | **Mandatory EDD, senior management approval** | MORB §921, MORB §923, FATF R.12 | +25 |
| ES-04 | Sanctions hit | Sanctions screening = hit | **Decline / freeze, file STR** | UNSCR via MORB §923, AMLA | +100 (decline) |
| ES-05 | Sanctions pending review | Sanctions screening = pending review | Hold onboarding, escalate to compliance | MORB §923 | +30 |
| ES-06 | High-risk jurisdiction connection | Connection = personal, business, or both | **Mandatory EDD** | FATF R.10, MORB §921 | +25 |
| ES-07 | Adverse media — confirmed findings | Adverse media = yes | **Mandatory EDD, document rationale** | MORB §921, NPC Advisory 2024-04 | +30 |
| ES-08 | Adverse media — unclear, requires review | Adverse media = unclear | Standard minimum, escalate for human review before tier finalization | MORB §921 | +10 |

*Note on ES-01 / ES-02 / ES-03 senior management approval: Per FATF Recommendation 12 (paragraph b) and MORB §923, the senior management approval requirement applies to all PEP categories — the customer themselves, their immediate family, and their close associates. The FATF Recommendations 2012 explicitly state that "the requirements for all types of PEP should also apply to family members or close associates of such PEPs," and BSP Memorandum M-2023-029 reaffirms this for Philippine BFSI implementation. The senior management approval requirement is operationalized through MORB §923's additional preventive measures section, with §921 providing the master CDD framework. This is regulatory mandate, not bank-by-bank discretion.*

### Documentation & Process (DC-01 through DC-07)

| ID | Rule | Trigger | Tier Impact | Citation | Weight |
|---|---|---|---|---|---|
| DC-01 | PhilSys / PhilID acceptance | PhilSys ID presented as primary identification | Acceptable as sole ID per RA 11055; e-KYC eligible | BSP Circular 1170, RA 11055 | 0 |
| DC-02 | Single non-PhilSys ID limitation | Identity document is non-PhilSys | Cannot be sole means of identification — secondary verification required | BSP Circular 1170 | 0 |
| DC-03 | e-KYC face-to-face equivalence | Onboarding via e-KYC digital ID system | Must meet face-to-face equivalent standards; ICT controls required | BSP Circular 1170 | 0 |
| DC-04 | Repeat onboarding — existing relationship | Years with bank = "repeat onboarding" AND prior CDD on file with no adverse change | Streamlined refresh; do not re-collect from scratch | BSP Memo M-2026-005 | -5 |
| DC-05 | Source of funds — investment income | Source of funds = investments | Verify investment account documentation; Standard minimum | MORB §921 | +5 |
| DC-06 | Source of funds — inheritance | Source of funds = inheritance | Documentation of estate settlement required; Standard minimum | MORB §921 | +5 |
| DC-07 | NPC AI accountability disclosure | All decisions involving AI tier recommendation | Must be auditable, explainable, with documented human review per NPC Advisory 2024-04. Fires on every AI-generated recommendation. | NPC Advisory 2024-04 | 0 (process rule) |

*Note on DC-07: The rule fires on every AI-generated tier recommendation by virtue of the recommendation being AI-generated. It must appear explicitly in `rules_fired` (structured record requirement) and the substantive documented-rationale requirement is satisfied by the examiner notes' audit_trail section (prose-level requirement). Both must be present. See `05_PASS_1_DESIGN.md` §2 and §3 for prompt-level enforcement.*

---

## Tier Decision Logic — Hybrid Model

```
1. EVALUATE HARD RULES FIRST (regulatory floors):
   - Sanctions hit (ES-04) → DECLINE + file STR (no further evaluation)
   - Any PEP rule fires (ES-01/02/03) → minimum tier = EDD; senior management approval required
   - Unclear source of funds (TE-10) → minimum tier = EDD
   - High-risk jurisdiction (ES-06) → minimum tier = EDD
   - Mass affluent / private banking (TE-04) → minimum tier = EDD
   - Non-resident foreign (TE-07) → minimum tier = EDD
   - High volume ≥ PHP 1M (TE-03) → minimum tier = EDD
   - Confirmed adverse media (ES-07) → minimum tier = EDD
   - New + high volume (TE-05) → minimum tier = EDD

2. IF NO HARD RULE FIRES, APPLY SCORE-BASED LOGIC:
   - Compute risk score from cumulative weights of all firing rules
   - Score 0–10: SDD eligible (if TE-01/06/08 also satisfied)
   - Score 11–30: Standard tier
   - Score 31+: EDD recommended

3. SPECIAL CASES:
   - Adverse media unclear (ES-08): minimum Standard, flag for human review before finalization
   - Sanctions pending (ES-05): hold onboarding, do not finalize tier until cleared

4. NPC ACCOUNTABILITY (DC-07):
   - DC-07 fires on every AI-generated recommendation — appears in rules_fired
   - Every recommendation must produce documented rationale (audit_trail section in examiner notes)
   - Pass 2 audit verifies both structured-record and prose-level satisfaction
   - If either is missing, audit fails regardless of other rules
```

**Final tier = MAX of:**
- Base tier from score-based logic
- Any hard-rule minimum tier triggered
- Hard rules cannot be downgraded by low score

---

## Risk Score Display

The score is **informational and tie-breaking**, not decisional. It is shown to the analyst as:

- **Total score** (sum of weights from firing rules)
- **Category breakdown** (Tier Eligibility contribution / Escalation contribution / Documentation contribution)
- **Score-vs-decision note** (e.g., *"Score: 65 — but mandatory EDD due to ES-02"*)

The transparency about when score is and isn't decisional is itself a teaching artifact for the audience.

---

## Category Convention for Risk Score Breakdown

Rules contribute weight to the `risk_score.category_breakdown` field in Pass 1's output based on which **table** of the ruleset they belong to, not based on their tier impact severity:

- **`tier_eligibility`** — weights from rules TE-01 through TE-10, regardless of whether the rule's tier impact is SDD baseline (TE-01), Standard baseline (TE-02), or hard-rule EDD (TE-03, TE-05, etc.)
- **`escalation_triggers`** — weights from rules ES-01 through ES-08
- **`documentation_process`** — weights from rules DC-01 through DC-07

This convention matters because rules like TE-05 ("New relationship + high volume") have hard-rule EDD impact but live in the Tier Eligibility table — their weight contribution belongs in `tier_eligibility`, not `escalation_triggers`. The category column is about ruleset-table membership, not about whether the rule triggers a hard-rule floor.
