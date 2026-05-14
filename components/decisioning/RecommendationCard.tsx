'use client';
// components/decisioning/RecommendationCard.tsx
// RecommendationCard composition per visual_system.md §5.1 + PRIMARY_PROMPT.md §6.1.
//
// Renders a single Pass 1 output as an institutional hero card. Composes
// TierBadge (Task 8.2), TabularNumber (Batch 6 Task 6.1), Chip (Batch 6 Task 6.3),
// and ChevronDisclosure (Batch 6 Task 6.7 — third composition-layer consumer
// after ExaminerNotes and Pass3CorrectionBanner).
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   visual_system.md §5.1 lines 221–224
//     - line 221: Tier badge (slate-blue accent, mono font) — delegated to
//       TierBadge primitive (Task 8.2).
//     - line 222: Risk score (tabular-figure --text-xl) + category breakdown
//       chips below. Three chips render regardless of zero values per
//       Finding 12 (Task 8.3 spec-walk disposition: institutional-register
//       transparency over de-cluttering — examiner reads each category's
//       contribution including absence of contribution; §5.1 silence on
//       conditional rendering is spec-silence-as-discipline).
//     - line 223: "Why this tier" expandable — ChevronDisclosure primitive
//       wired per Decision 11 two-layer progressive disclosure pattern
//       (reused from ExaminerNotes Task 7.4).
//     - line 224: Suggested EDD requirements — structured numbered list. Read
//       directly off the typed schema field `recommended_edd_procedures`
//       (Array<EddProcedure> per 05_PASS_1_DESIGN.md §2 canonical contract).
//       Finding 10 (Batch 1 schema field-name + field-shape drift) is closed:
//       the pre-Batch-9 schema-alignment commit corrected Pass1OutputSchema
//       from the misnamed `edd_requirements: z.array(z.string())` to the
//       canonical `recommended_edd_procedures: z.array(EddProcedureSchema)`.
//   PRIMARY_PROMPT.md §6.1 line 300 — recommendation card positioning.
//   Decision 11 — two-layer progressive disclosure pattern reuse from
//     ExaminerNotes hero section.
//   Decision 27 — Persona C onboarding_hold:false + populated hold_reason
//     (ES-08 adverse media unclear → tier-finalization-only hold). Schema-
//     reading discipline regression guard: hold_reason rendering is keyed
//     off `decision.hold_reason !== null`, NOT off `decision.onboarding_hold
//     === true`. The schema field is authoritative for what content exists;
//     the boolean is separate orchestration state about onboarding workflow.
//   Decision 36c — full-fidelity "before" rendering: AnalystControlPanel
//     re-renders RecommendationCard inside the Override modal. The
//     RecommendationCard's render-context-agnostic discipline (inherited
//     from Pass3CorrectionBanner per Task 7.6) is the load-bearing contract
//     that makes this composition possible without context-sniffing.
//   docs/batch-6-primitive-bindings.md Section 1 line 42 — composition-
//     fitness rule: TierBadge is the surface for tier display, NOT Chip
//     variant="accent". Regression-guarded.
//
// === TIER-UNION NARROWING (intentional, not deferred debt) ===
//
// `pass1.decision.recommended_tier` is the canonical 4-value union (SDD /
// Standard / EDD / Decline). TierBadge's prop union is intentionally narrower
// at 3 values per Task 8.2 disposition B — 'Decline' (ES-04 sanctions hit)
// routes to a different demo surface (STR filing branch per
// 02_RULESET_v1.md:93), not a tier badge. The `as` narrowing at the
// renderableTier assignment is the compile-time conversation Task 8.2
// disposition B was designed to force here; it is NOT a deferred-debt cast.
//
// History: before the pre-Batch-9 schema-alignment commit, this site carried
// TWO casts. The second (a looseObject passthrough for the misnamed
// `edd_requirements` field) WAS deferred debt and is now removed — Finding 10
// closed by correcting Pass1OutputSchema. The tier narrowing remains because
// it was never debt; it was always the disposition-B narrowing mechanism.
//
// === RENDER-CONTEXT-AGNOSTIC DISCIPLINE ===
//
// Inherited from Pass3CorrectionBanner (Task 7.6, render-context-agnostic
// trust-boundary regression guard). RecommendationCard renders identically
// in default placement (top of decisioning surface, Batch 9 state-machine-
// driven) and inside Override modal placement (Decision 36c). No
// `displayContext` or `inModal` prop. No DOM context inspection. Parent
// orchestrator (AnalystControlPanel at Task 8.5) chooses where to compose.
// Regression-guarded.
//
// === TRUST BOUNDARY ===
//
// Component owns:
//   - "Why this tier" expanded/collapsed state via internal useState.
//
// Component does NOT own:
//   - Persona switching lifecycle (parent state machine handles unmount/
//     remount on persona change — same pattern as ExaminerNotes).
//   - Pass 1 schema validation (parent loadPersona / API route validates).
//   - Override modal lifecycle (AnalystControlPanel at Task 8.5).

import { useState } from 'react';
import type { Pass1Output, EddProcedure } from '@/lib/schemas/pass1';
import { Card } from '@/components/primitives/Card';
import { TierBadge } from '@/components/primitives/TierBadge';
import { TabularNumber } from '@/components/primitives/TabularNumber';
import { Chip } from '@/components/primitives/Chip';
import { ChevronDisclosure } from '@/components/primitives/ChevronDisclosure';

interface RecommendationCardProps {
  pass1: Pass1Output;
}

export function RecommendationCard({ pass1 }: RecommendationCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);

  // Intentional narrowing, NOT a deferred-debt cast. The canonical Pass 1
  // contract's recommended_tier is a 4-value union (SDD / Standard / EDD /
  // Decline); TierBadge's prop union is intentionally narrower at 3 values
  // per Task 8.2 disposition B — 'Decline' (ES-04 sanctions hit) routes to a
  // different demo surface (STR filing branch per 02_RULESET_v1.md:93), not a
  // tier badge. This narrowing is the compile-time conversation Task 8.2
  // disposition B was designed to force at this call site.
  const renderableTier = pass1.decision.recommended_tier as 'SDD' | 'Standard' | 'EDD';

  // Structured EDD procedures read directly off the typed schema field
  // (Finding 10 closed: Pass1OutputSchema now declares
  // recommended_edd_procedures: EddProcedure[] per the canonical contract).
  const eddProcedures: EddProcedure[] = pass1.recommended_edd_procedures ?? [];

  const breakdown = pass1.risk_score.category_breakdown;

  return (
    <Card variant="elevated">
      <div className="flex flex-col gap-6">
        {/* Tier badge + risk score (§5.1 lines 221–222) */}
        <div className="flex flex-wrap items-baseline gap-4">
          <TierBadge tier={renderableTier} />
          <div className="flex items-baseline gap-2">
            <span className="font-sans text-sm text-text-tertiary">Risk score</span>
            <TabularNumber
              value={String(pass1.risk_score.total)}
              className="text-xl text-text-primary"
            />
          </div>
        </div>

        {/* Category breakdown — three chips with values, including zeros
            (Finding 12 transparency disposition; §5.1 line 222 + Decision 27) */}
        <div className="flex flex-wrap gap-2">
          <Chip variant="neutral">
            <span>tier_eligibility</span>
            <span className="ml-1">
              <TabularNumber value={String(breakdown.tier_eligibility)} />
            </span>
          </Chip>
          <Chip variant="neutral">
            <span>escalation_triggers</span>
            <span className="ml-1">
              <TabularNumber value={String(breakdown.escalation_triggers)} />
            </span>
          </Chip>
          <Chip variant="neutral">
            <span>documentation_process</span>
            <span className="ml-1">
              <TabularNumber value={String(breakdown.documentation_process)} />
            </span>
          </Chip>
        </div>

        {/* Hold reason — schema-reading discipline regression guard
            (Decision 27; Persona C ES-08 canonical exercise). Rendered when
            hold_reason !== null regardless of onboarding_hold boolean. */}
        {pass1.decision.hold_reason !== null && (
          <div
            data-testid="hold-reason"
            className="border-l-4 border-l-text-tertiary bg-surface-recessed px-4 py-3 font-sans text-sm text-text-secondary"
          >
            {pass1.decision.hold_reason}
          </div>
        )}

        {/* "Why this tier" expandable — Decision 11 progressive disclosure
            pattern reuse via ChevronDisclosure (third composition consumer
            after ExaminerNotes Task 7.4 and Pass3CorrectionBanner Task 7.6). */}
        <div>
          <ChevronDisclosure label="Why this tier" open={whyOpen} onToggle={setWhyOpen} />
          {whyOpen && (
            <ul className="mt-3 flex flex-col gap-3">
              {pass1.rules_fired.map((rule) => {
                // Read rule_name + tier_impact via looseObject passthrough.
                // Pass1's RuleFiredSchema strictly types only rule_id,
                // category, weight, trigger_evidence — but locked personas
                // also carry rule_name (e.g., "Standard profile baseline")
                // and tier_impact (the prose rationale). Per Finding 11
                // disposition: render rule_id (mono) + rule_name (sans) +
                // tier_impact (sans prose). regulatory_citation lives at
                // Pass 2 checks, not Pass 1 rules_fired — dropped from
                // expanded view per Finding 11.
                const r = rule as { rule_id: string; rule_name?: string; tier_impact?: string };
                return (
                  <li key={r.rule_id} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-sm text-text-primary">{r.rule_id}</span>
                      {r.rule_name && (
                        <span className="font-sans text-sm text-text-secondary">
                          — {r.rule_name}
                        </span>
                      )}
                    </div>
                    {r.tier_impact && (
                      <p className="font-sans text-sm text-text-secondary">{r.tier_impact}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Suggested EDD procedures (when populated) — §5.1 line 224 bulleted
            list, corrected to structured numbered list per Finding 10
            (canonical persona-JSON shape: {procedure_id, description,
            regulatory_basis}). Empty array → section omitted entirely
            (Maria's Standard-tier-no-EDD case). */}
        {eddProcedures.length > 0 && (
          <div>
            <h3 className="mb-3 font-sans text-sm font-medium text-text-secondary">
              Suggested EDD procedures
            </h3>
            <ol className="flex flex-col gap-4">
              {eddProcedures.map((proc) => (
                <li key={proc.procedure_id} className="flex flex-col gap-1">
                  <div className="flex gap-2">
                    <span className="font-mono text-sm text-text-tertiary">({proc.procedure_id})</span>
                    <p className="font-sans text-sm text-text-primary">{proc.description}</p>
                  </div>
                  <p className="ml-6 font-mono text-xs text-text-tertiary">
                    {proc.regulatory_basis}
                  </p>
                </li>
              ))}
            </ol>
          </div>
        )}
      </div>
    </Card>
  );
}
