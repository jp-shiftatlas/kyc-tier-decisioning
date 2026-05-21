'use client';
// components/decisioning/RecommendationCard.tsx
// RecommendationCard composition per visual_system.md §5.1 + PRIMARY_PROMPT.md §6.1.
//
// Renders a single Pass 1 output as an institutional hero card.
//
// JP Batch 12 Screen 3 feedback:
//   - Tier code is now followed by the expanded due-diligence name (e.g.
//     "EDD — Enhanced Due Diligence") for visitor comprehension.
//   - "Why this tier?" question is rendered larger + with the question mark
//     suffix so it reads as the prompt it is, not a passing label.
//
// RAG card coloring was considered and DECLINED per visual_system.md §2: the
// violation-primary (red) is reserved for compliance violations, the
// status-success (green) for PASS clean states, and status-warning (amber)
// for quality flags. Tier outcome is not a compliance violation; coloring
// the card red for EDD would conflict with the audit panel's per-rule color
// semantics. Tier risk is communicated via the tier name + expanded label.

import { useState } from 'react';
import type { Pass1Output, EddProcedure } from '@/lib/schemas/pass1';
import { Card } from '@/components/primitives/Card';
import { TierBadge } from '@/components/primitives/TierBadge';
import { TabularNumber } from '@/components/primitives/TabularNumber';
import { Chip } from '@/components/primitives/Chip';
import { ChevronDisclosure } from '@/components/primitives/ChevronDisclosure';
import { lookupRule } from '@/lib/decisioning/ruleCatalog';

interface RecommendationCardProps {
  pass1: Pass1Output;
}

// Tier-code → expanded due-diligence name per JP Batch 12 Screen 3 feedback.
const TIER_FULL_NAMES: Record<'SDD' | 'Standard' | 'EDD', string> = {
  SDD: 'Simplified Due Diligence',
  Standard: 'Standard Due Diligence',
  EDD: 'Enhanced Due Diligence',
};

export function RecommendationCard({ pass1 }: RecommendationCardProps) {
  const [whyOpen, setWhyOpen] = useState(false);

  const renderableTier = pass1.decision.recommended_tier as 'SDD' | 'Standard' | 'EDD';
  const eddProcedures: EddProcedure[] = pass1.recommended_edd_procedures ?? [];
  const breakdown = pass1.risk_score.category_breakdown;

  return (
    <Card variant="elevated">
      <div className="flex flex-col gap-6">
        {/* Tier badge + expanded name + risk score */}
        <div className="flex flex-wrap items-baseline gap-3">
          <TierBadge tier={renderableTier} />
          <span className="font-sans text-base font-semibold text-text-primary">
            {TIER_FULL_NAMES[renderableTier]}
          </span>
          <div className="ml-auto flex items-baseline gap-2">
            <span className="font-sans text-sm text-text-tertiary">Risk score</span>
            <TabularNumber
              value={String(pass1.risk_score.total)}
              className="text-xl text-text-primary"
            />
          </div>
        </div>

        {/* Category breakdown */}
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

        {/* Hold reason */}
        {pass1.decision.hold_reason !== null && (
          <div
            data-testid="hold-reason"
            className="border-l-4 border-l-text-tertiary bg-surface-recessed px-4 py-3 font-sans text-sm text-text-secondary"
          >
            {pass1.decision.hold_reason}
          </div>
        )}

        {/* "Why this tier?" — larger + emphasized per JP feedback */}
        <div>
          <ChevronDisclosure
            label="Why this tier?"
            open={whyOpen}
            onToggle={setWhyOpen}
            className="font-sans text-base font-semibold text-text-primary"
          />
          {whyOpen && (
            <ul className="mt-3 flex flex-col gap-3">
              {pass1.rules_fired.map((rule) => {
                // The locked persona JSONs carry rule_name + tier_impact as
                // looseObject passthrough fields (curated content). Live
                // model output is constrained by the Path Q template to
                // declared schema fields only — so rule_name and tier_impact
                // are absent on live runs. Fall back to the static ruleCatalog
                // (sourced from ruleset_v1.md) to keep the "Why this tier?"
                // panel substantive across both modes.
                const r = rule as { rule_id: string; rule_name?: string; tier_impact?: string };
                const fallback = lookupRule(r.rule_id);
                const displayName = r.rule_name ?? fallback?.name;
                const displayImpact = r.tier_impact ?? fallback?.tier_impact;
                return (
                  <li key={r.rule_id} className="flex flex-col gap-1">
                    <div className="flex flex-wrap items-baseline gap-2">
                      <span className="font-mono text-sm text-text-primary">{r.rule_id}</span>
                      {displayName && (
                        <span className="font-sans text-sm text-text-secondary">
                          — {displayName}
                        </span>
                      )}
                    </div>
                    {displayImpact && (
                      <p className="font-sans text-sm text-text-secondary">{displayImpact}</p>
                    )}
                  </li>
                );
              })}
            </ul>
          )}
        </div>

        {/* Suggested EDD procedures (when populated) */}
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
