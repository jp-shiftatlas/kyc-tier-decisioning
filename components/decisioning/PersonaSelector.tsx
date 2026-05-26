'use client';
// components/decisioning/PersonaSelector.tsx — Batch 12 product polish.
//
// PersonaSelector renders the four persona cards. Batch 12 upgrade:
//   - Tier preview badge in the top-right of each card (slate-subtle bg)
//   - Scenario tag (short label) below the descriptor
//   - Soft shadow on resting state; lifts on hover (Card primitive's
//     `interactive` prop)
//   - Persona name promoted to text-lg
//   - Active state retains the slate ring; hover state composes shadow lift
//   - Microcopy moved to bottom of card as small caption
//
// Anchors preserved from prior Batch 10.1 docstring:
//   - Decision 22 + 27: four visually equal-weight cards
//   - Decision 36e: persona button functions as case-selector
//   - WAI-ARIA toggle-button pattern (role=button + aria-pressed)
//   - Click-active-deselect semantics (clicking the active card emits null)
//   - No orchestration imports (composition-layer regression-guarded)

import { listPersonas, type PersonaId } from '@/lib/schemas/personaAdapters';
import { Card } from '@/components/primitives/Card';
import { cx } from '@/lib/ui/classnames';

interface PersonaSelectorProps {
  activePersonaId: PersonaId | null;
  onPersonaChange: (personaId: PersonaId | null) => void;
}

const MODE_DISCLOSURE_LABEL = 'Pre-generated example output';

// Tier preview + scenario tag per persona — Batch 12 addition. Lifted from
// the persona JSONs (pass_1.decision.recommended_tier) + persona-curated
// scenario summary. If a persona ever evolves, the mapping is local to this
// component so the discovery doesn't require a separate file.
//
// Scenario tag is the one-line "case shape" label that helps a viewer
// understand what each persona exercises without reading the descriptor:
//   - Maria        → standard onboarding (baseline)
//   - Carlos       → PEP-adjacent EDD (escalation triggers fire)
//   - Convergent   → Jurisdiction-driven EDD (compounding pattern)
//   - Doc-Process  → Documentation compounding (Standard with EDD nuance)
const PERSONA_TIER: Record<string, string> = {
  maria: 'Standard',
  carlos: 'EDD',
  persona_c: 'EDD',
  persona_d: 'Standard',
};

const PERSONA_SCENARIO: Record<string, string> = {
  maria: 'Standard onboarding',
  carlos: 'PEP-adjacent EDD',
  persona_c: 'Jurisdiction-driven EDD',
  persona_d: 'Documentation compounding',
};

export function PersonaSelector({
  activePersonaId,
  onPersonaChange,
}: PersonaSelectorProps) {
  const personas = listPersonas();

  const handleSelect = (clickedId: PersonaId) => {
    onPersonaChange(clickedId === activePersonaId ? null : clickedId);
  };

  return (
    <div
      data-testid="persona-selector"
      className="grid grid-cols-1 gap-4 md:grid-cols-2 lg:grid-cols-4"
    >
      {personas.map((persona) => {
        const isActive = persona.id === activePersonaId;
        const tier = PERSONA_TIER[persona.id] ?? '—';
        const scenario = PERSONA_SCENARIO[persona.id] ?? '';
        return (
          <div
            key={persona.id}
            role="button"
            tabIndex={0}
            aria-pressed={isActive}
            aria-label={`Select ${persona.name}`}
            onClick={() => handleSelect(persona.id)}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                handleSelect(persona.id);
              }
            }}
            className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
          >
            <Card
              variant="elevated"
              interactive
              className={cx(
                'flex h-full min-h-[210px] flex-col border-l-4',
                isActive
                  ? 'border-l-accent-primary ring-2 ring-accent-primary'
                  : 'border-l-border-default',
              )}
            >
              <div className="flex flex-col gap-3">
                {/* Top row: persona name + tier badge */}
                <div className="flex flex-row items-start justify-between gap-2">
                  <div className="font-sans text-lg font-semibold leading-tight text-text-primary">
                    {persona.name}
                  </div>
                  <span
                    aria-label={`Tier preview: ${tier}`}
                    className="inline-flex shrink-0 items-center bg-accent-subtle-bg px-2 py-0.5 font-mono text-xs font-semibold text-accent-deep"
                  >
                    {tier}
                  </span>
                </div>

                {/* Descriptor */}
                <div className="font-sans text-sm leading-relaxed text-text-secondary">
                  {persona.descriptor}
                </div>

                {/* Scenario tag */}
                {scenario && (
                  <div className="inline-flex w-fit bg-accent-tint px-2 py-0.5 font-sans text-xs text-accent-deep">
                    {scenario}
                  </div>
                )}
              </div>

              {/* Mode-disclosure caption at the bottom */}
              <div className="mt-auto pt-4 font-sans text-xs text-text-tertiary">
                {MODE_DISCLOSURE_LABEL}
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
