'use client';
// components/decisioning/PersonaSelector.tsx
// PersonaSelector — case-selector affordance for the four pre-generated
// personas. First consumer of listPersonas() (zero consumers prior to 10.1).
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   01_PROJECT_BRIEF.md:131 (project-knowledge corpus) —
//     "Each persona card carries a small label: 'Pre-generated example output.'"
//   03_DESIGN_DECISIONS.md:211 (project-knowledge corpus) —
//     "Each persona card carries a small label 'Pre-generated example output.'"
//   PRIMARY_PROMPT.md §5.1 lines 259–262 (worktree corpus) — four persona cards,
//     visually equal-weight, no fourth-persona deprioritization. Worktree
//     PRIMARY_PROMPT.md:261 shows the microcopy as "Pre-generated example"
//     (no trailing "output") — this is documentation-drift from the canonical
//     project-knowledge microcopy and is flagged for Batch 11 ratification
//     (sibling to the 41-sublabel + "Decision 41c" vs "Decision 41 S2"
//     documentation-drift findings). Implementation binds to the canonical.
//   Decision 22 (amended by Decision 27) — all four personas visually
//     equal-weight; Persona D is no longer "advanced/edge-handling" content.
//   Decision 27 — all four personas at PASS clean; visible self-correction
//     repositioned to opportunistic-on-live-input.
//   Decision 36e — persona button functions as case-selector; switching
//     mid-action resets all action state (AnalystControlPanel orchestrates
//     the reset via its useEffect on personaId; this component just emits
//     the selection change).
//
// === CARD PRIMITIVE WITH COMPOSITION-LAYER BUTTON SEMANTICS ===
//
// Uses Card primitive (variant="elevated") rather than Button primitive —
// corpus is consistent on "card" framing across three references
// (01_PROJECT_BRIEF.md:131, 03_DESIGN_DECISIONS.md:211, PRIMARY_PROMPT.md §5.1).
// Button primitive's three §5.5 variants (primary/outline/subtle) are tuned
// for the Approve/Escalate/Override semantics, not for a card-shaped
// multi-line click target.
//
// Card primitive's presentational <div> is wrapped at the composition layer
// with interactive role per WAI-ARIA "button" role guidance:
//   https://www.w3.org/WAI/ARIA/apg/patterns/button/
//   - role="button"
//   - tabIndex={0}
//   - aria-pressed reflects active state
//   - onKeyDown handles Space + Enter activation per WAI-ARIA APG
//
// The wrapper-around-Card structure makes the entire card surface (including
// the Card's 24px padding) clickable; if role="button" lived on a div INSIDE
// the Card, clicks on the padding would miss the handler.
//
// === ARIA: button + aria-pressed (toggle), NOT radio ===
//
// Click-active-deselect semantics (clicking the active card emits null per
// Finding F disposition) means exactly zero-or-one persona can be active.
// The radiogroup pattern requires mutual exclusion with exactly-one selected;
// it does not admit deselection. Toggle-button pattern with aria-pressed is
// the correct fit. Each card is independently toggleable; the parent enforces
// the "at most one active" invariant by passing activePersonaId.
//
// === COMPOSITION DISCIPLINE (10.1 anti-pattern guards) ===
//
// Component owns:
//   - Card-shaped clickable affordance per persona from listPersonas()
//   - Active-state visual via className override (ring-2 ring-accent-primary)
//   - Click + Space/Enter keyboard activation
//   - Click-active-deselect semantics (clickedId === activeId → emit null)
//
// Component does NOT own:
//   - State-machine knowledge (NO imports from @/lib/orchestration/*)
//   - Persona playback dispatch (parent at 10.3 wires onPersonaChange to
//     usePersonaPlayback)
//   - Decisioning trigger logic
//
// Static-analysis guards in PersonaSelector.test.tsx enforce the import
// surface; sibling to the personaPlayback.test.ts no-API-imports pattern.

import { listPersonas, type PersonaId } from '@/lib/schemas/personaAdapters';
import { Card } from '@/components/primitives/Card';
import { cx } from '@/lib/ui/classnames';

interface PersonaSelectorProps {
  activePersonaId: PersonaId | null;
  onPersonaChange: (personaId: PersonaId | null) => void;
}

// Canonical microcopy per 01_PROJECT_BRIEF.md:131 + 03_DESIGN_DECISIONS.md:211.
// Worktree PRIMARY_PROMPT.md:261 documentation-drift flagged for Batch 11.
const MODE_DISCLOSURE_LABEL = 'Pre-generated example output';

export function PersonaSelector({
  activePersonaId,
  onPersonaChange,
}: PersonaSelectorProps) {
  const personas = listPersonas();

  const handleSelect = (clickedId: PersonaId) => {
    // Finding F disposition: emit destination state (clicked-active → null deselect).
    onPersonaChange(clickedId === activePersonaId ? null : clickedId);
  };

  return (
    <div
      data-testid="persona-selector"
      className="flex flex-wrap gap-4"
    >
      {personas.map((persona) => {
        const isActive = persona.id === activePersonaId;
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
              className={cx(
                'transition-colors',
                isActive
                  // Ledger D7: first use of `ring-*` utility for active-state; if extended elsewhere, surface as canonical.
                  ? 'ring-2 ring-accent-primary'
                  : 'hover:bg-surface-recessed',
              )}
            >
              <div className="flex flex-col gap-2">
                <div className="font-sans text-base font-semibold text-text-primary">
                  {persona.name}
                </div>
                <div className="font-sans text-sm text-text-secondary">
                  {persona.descriptor}
                </div>
                <div className="font-sans text-xs text-text-tertiary">
                  {MODE_DISCLOSURE_LABEL}
                </div>
              </div>
            </Card>
          </div>
        );
      })}
    </div>
  );
}
