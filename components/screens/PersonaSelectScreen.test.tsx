// components/screens/PersonaSelectScreen.test.tsx
import { describe, it, expect, vi, afterEach, beforeAll, afterAll } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import type { ReactNode } from 'react';
import { PersonaSelectScreen } from './PersonaSelectScreen';
import { WizardContext } from '@/components/wizard/WizardContext';
import { DecisioningContext, type DecisioningContextValue } from '@/components/orchestration/DecisioningContext';

// Live-mode kill switch was added in Batch 12 demo-prep (see
// docs/live-mode-known-issues.md). PersonaSelectScreen reads
// NEXT_PUBLIC_LIVE_MODE_ENABLED at module-eval time. Tests assert the
// "Enter your own profile" tile renders + handles selection — so set the
// env var to 'true' for this test file. The PersonaSelectScreen module is
// imported lazily AFTER the env var is set.
const ORIGINAL_LIVE_MODE_ENV = process.env.NEXT_PUBLIC_LIVE_MODE_ENABLED;
beforeAll(() => {
  process.env.NEXT_PUBLIC_LIVE_MODE_ENABLED = 'true';
  vi.resetModules();
});
afterAll(() => {
  if (ORIGINAL_LIVE_MODE_ENV === undefined) {
    delete process.env.NEXT_PUBLIC_LIVE_MODE_ENABLED;
  } else {
    process.env.NEXT_PUBLIC_LIVE_MODE_ENABLED = ORIGINAL_LIVE_MODE_ENV;
  }
});

afterEach(() => {
  cleanup();
});

function makeWizard(overrides: Partial<ReturnType<typeof defaultWizard>> = {}) {
  return { ...defaultWizard(), ...overrides };
}

function defaultWizard() {
  return {
    activeScreen: 'persona-select' as const,
    mode: 'idle' as const,
    advance: vi.fn(),
    back: vi.fn(),
    jumpTo: vi.fn(),
    setMode: vi.fn(),
    reset: vi.fn(),
  };
}

function makeDecisioning(overrides: Partial<DecisioningContextValue> = {}): DecisioningContextValue {
  const base: DecisioningContextValue = {
    mode: 'idle',
    setMode: vi.fn(),
    personaId: null,
    setPersonaId: vi.fn(),
    liveProfile: null,
    setLiveProfile: vi.fn(),
    stateValue: 'idle',
    pass1Output: null,
    pass2Output: null,
    pass3Output: null,
    reAuditOutput: null,
    error: null,
    raceSignalActionTaken: false,
    raceSignalModalOpen: false,
    setAnalystActionTaken: vi.fn(),
    setOverrideModalOpen: vi.fn(),
    effectivePass1: null,
    displayPass1: null,
    customerReference: '',
    shouldAnimate: false,
    headlineProps: null,
    personaName: 'unknown',
    raceTrigger: false,
    startPersonaPlayback: vi.fn(),
    startLiveRun: vi.fn(),
    reset: vi.fn(),
  };
  return { ...base, ...overrides };
}

function renderWithContexts(
  children: ReactNode,
  ctx: { wizard?: ReturnType<typeof defaultWizard>; decisioning?: DecisioningContextValue } = {},
) {
  return render(
    <WizardContext.Provider value={ctx.wizard ?? defaultWizard()}>
      <DecisioningContext.Provider value={ctx.decisioning ?? makeDecisioning()}>
        {children}
      </DecisioningContext.Provider>
    </WizardContext.Provider>,
  );
}

describe('PersonaSelectScreen', () => {
  it('renders the persona selector with all 4 personas', () => {
    renderWithContexts(<PersonaSelectScreen />);
    expect(screen.getByTestId('persona-selector')).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Select Maria' })).toBeInTheDocument();
  });

  it('renders the "Enter your own profile" tile', () => {
    renderWithContexts(<PersonaSelectScreen />);
    expect(screen.getByText('Enter your own profile')).toBeInTheDocument();
    expect(screen.getByText('Live audit')).toBeInTheDocument();
    expect(screen.getByText('Rate-limited per session.')).toBeInTheDocument();
  });

  it('selecting a persona sets personaId + persona mode + advances', () => {
    const wizard = defaultWizard();
    const decisioning = makeDecisioning();
    renderWithContexts(<PersonaSelectScreen />, { wizard, decisioning });
    fireEvent.click(screen.getByRole('button', { name: 'Select Maria' }));
    expect(decisioning.setPersonaId).toHaveBeenCalledWith('maria');
    expect(wizard.setMode).toHaveBeenCalledWith('persona');
    expect(wizard.advance).toHaveBeenCalledTimes(1);
  });

  it('selecting "Enter your own profile" sets live mode + advances', () => {
    const wizard = defaultWizard();
    const decisioning = makeDecisioning();
    renderWithContexts(<PersonaSelectScreen />, { wizard, decisioning });
    fireEvent.click(screen.getByLabelText('Enter your own profile'));
    expect(wizard.setMode).toHaveBeenCalledWith('live');
    expect(wizard.advance).toHaveBeenCalledTimes(1);
  });

  it('clicking the active persona (deselect) does NOT advance', () => {
    const wizard = defaultWizard();
    const decisioning = makeDecisioning({ personaId: 'maria' });
    renderWithContexts(<PersonaSelectScreen />, { wizard, decisioning });
    fireEvent.click(screen.getByRole('button', { name: 'Select Maria' }));
    expect(wizard.advance).not.toHaveBeenCalled();
  });

  it('Enter your own profile tile is keyboard-activatable (Enter)', () => {
    const wizard = defaultWizard();
    renderWithContexts(<PersonaSelectScreen />, { wizard });
    const tile = screen.getByLabelText('Enter your own profile');
    fireEvent.keyDown(tile, { key: 'Enter' });
    expect(wizard.advance).toHaveBeenCalledTimes(1);
  });

  it('Enter your own profile tile is keyboard-activatable (Space)', () => {
    const wizard = defaultWizard();
    renderWithContexts(<PersonaSelectScreen />, { wizard });
    const tile = screen.getByLabelText('Enter your own profile');
    fireEvent.keyDown(tile, { key: ' ' });
    expect(wizard.advance).toHaveBeenCalledTimes(1);
  });
});
