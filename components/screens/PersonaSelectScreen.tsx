// components/screens/PersonaSelectScreen.tsx
// Screen 1 — Choose a customer profile.
//
// Decision 48 — wizard restructure. PersonaSelectScreen wraps the existing
// PersonaSelector (which stays untouched, preserving its 4-card test surface)
// and adds a sibling "Enter your own profile" tile for live mode.
//
// Auto-advance contract (Decision 48 + 48c implication on S1):
//   - Selecting a persona card → setPersonaId + setMode('persona') + advance to S2
//   - Selecting the live-mode tile → setMode('live') + advance to S2
//   - Deselecting a persona (clicking active card) → no auto-advance (no-op)

'use client';

import { PersonaSelector } from '@/components/decisioning/PersonaSelector';
import { Card } from '@/components/primitives/Card';
import { useWizard } from '@/components/wizard/WizardContext';
import { useDecisioning } from '@/components/orchestration/DecisioningContext';
import type { PersonaId } from '@/lib/schemas/personaAdapters';

const LIVE_TILE_LABEL = 'Enter your own profile';
const LIVE_TILE_DESCRIPTOR = 'Live audit against the real three-pass pipeline.';
const LIVE_TILE_DISCLOSURE = 'Live audit';
const LIVE_TILE_RATE_NOTE = 'Rate-limited per session.';

// Live-mode kill switch. Per docs/live-mode-known-issues.md, the live
// "Enter your own profile" path surfaces Pass 1 + Pass 3 model-behavior
// inconsistencies (rule misfiring, score fabrication, partial corrections)
// that route most submissions to the cap-reached UI. Hidden by default
// until the prompt/schema reconciliation work (Decisions 53–56 candidates)
// lands on JP's durable-state surface.
//
// To re-enable: set NEXT_PUBLIC_LIVE_MODE_ENABLED=true in env (local
// .env.local or Vercel project settings).
//
// Read per-render (not at module load) so tests can flip the env var via
// vi.stubEnv / process.env without resetting modules.
function liveModeEnabled(): boolean {
  return process.env.NEXT_PUBLIC_LIVE_MODE_ENABLED === 'true';
}

export function PersonaSelectScreen() {
  const wizard = useWizard();
  const decisioning = useDecisioning();

  const handlePersonaChange = (id: PersonaId | null) => {
    if (id === null) return; // no-op on deselect — auto-advance fires only on selection
    // Order matters: set personaId BEFORE setMode('persona') so that when
    // DecisioningProvider re-renders with mode='persona', personaId is already
    // 'maria' (not null). usePersonaPlayback's internal effect then fires on
    // the first render where it receives a non-null personaId.
    decisioning.setPersonaId(id);
    decisioning.setMode('persona');
    wizard.setMode('persona');
    wizard.advance();
  };

  const handleLiveModeSelected = () => {
    decisioning.setMode('live');
    wizard.setMode('live');
    wizard.advance();
  };

  const introCopy = liveModeEnabled()
    ? 'Pre-generated examples or live audit against a profile you enter.'
    : 'Choose one of four pre-generated example profiles to see the three-pass pipeline walk end-to-end.';

  return (
    <div className="flex flex-col gap-6">
      <p className="font-sans text-sm text-text-secondary">{introCopy}</p>

      <PersonaSelector
        activePersonaId={decisioning.personaId}
        onPersonaChange={handlePersonaChange}
      />

      {liveModeEnabled() && (
        <div
          role="button"
          tabIndex={0}
          aria-label={LIVE_TILE_LABEL}
          onClick={handleLiveModeSelected}
          onKeyDown={(e) => {
            if (e.key === ' ' || e.key === 'Enter') {
              e.preventDefault();
              handleLiveModeSelected();
            }
          }}
          className="cursor-pointer focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary"
        >
          <Card variant="elevated" className="transition-colors hover:bg-surface-recessed">
            <div className="flex flex-col gap-2">
              <div className="font-sans text-base font-semibold text-text-primary">
                {LIVE_TILE_LABEL}
              </div>
              <div className="font-sans text-sm text-text-secondary">
                {LIVE_TILE_DESCRIPTOR}
              </div>
              <div className="font-sans text-xs text-text-tertiary">
                {LIVE_TILE_DISCLOSURE}
              </div>
              <div className="font-sans text-xs text-text-tertiary">
                {LIVE_TILE_RATE_NOTE}
              </div>
            </div>
          </Card>
        </div>
      )}
    </div>
  );
}
