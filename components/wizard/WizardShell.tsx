// components/wizard/WizardShell.tsx
// Wizard host — owns active-screen state, renders the StepIndicator + active
// screen panel + Back navigation. Forward navigation is screen-specific:
//   - persona-select: auto-advance on selection (no Next button)
//   - data-flow: Run Analysis is inline in Reasoning Layer row (no Next button)
//   - audit / examiner-notes: per-screen Next button rendered by the screen
//   - analyst-action: terminal (no forward; Reset returns to S1)
//
// Verified 2026-05-21 against Next.js App Router 14.x docs: 'use client' here
// is the supported pattern for state-owning client components composed inside
// a server-component page.tsx.

'use client';

import { useWizardState, type WizardState } from './useWizardState';
import { StepIndicator } from './StepIndicator';
import { SCREEN_SEQUENCE, type ScreenId } from '@/lib/wizard/screenSequence';
import { WizardContext } from './WizardContext';
import { Button } from '@/components/primitives/Button';

type ScreenComponent = React.ComponentType;
export type ScreenMap = Record<ScreenId, ScreenComponent>;

interface WizardShellProps {
  screens: ScreenMap;
  /** Test-only: bootstrap at a specific screen. Production callers omit. */
  initialScreen?: ScreenId;
  /** Test-only: bootstrap at a specific mode. */
  initialMode?: WizardState['mode'];
}

export function WizardShell({ screens, initialScreen, initialMode }: WizardShellProps) {
  const wizard = useWizardState({ initialScreen, initialMode });

  const ActiveScreen = screens[wizard.activeScreen];
  const screenDef = SCREEN_SEQUENCE.find((s) => s.id === wizard.activeScreen)!;
  const showBack = wizard.activeScreen !== 'persona-select';

  return (
    <WizardContext.Provider value={wizard}>
      <div data-testid="wizard-shell" className="flex flex-col gap-6">
        <StepIndicator activeScreen={wizard.activeScreen} />

        <section
          data-testid={`screen-panel-${wizard.activeScreen}`}
          aria-label={screenDef.panelHeadline}
        >
          <h2 className="font-sans text-lg font-semibold text-text-primary mb-4">
            {screenDef.panelHeadline}
          </h2>
          <ActiveScreen />
        </section>

        {showBack && (
          <div className="flex flex-row justify-start">
            <Button variant="subtle" onClick={wizard.back}>
              ‹ Back
            </Button>
          </div>
        )}
      </div>
    </WizardContext.Provider>
  );
}
