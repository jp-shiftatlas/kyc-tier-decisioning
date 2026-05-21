// components/screens/AnalystActionScreen.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { AnalystActionScreen } from './AnalystActionScreen';
import { WizardContext } from '@/components/wizard/WizardContext';
import { DecisioningContext, type DecisioningContextValue } from '@/components/orchestration/DecisioningContext';
import { loadPersona } from '@/lib/schemas/personaAdapters';

afterEach(() => cleanup());

const MARIA = loadPersona('maria');

function defaultWizard(overrides = {}) {
  return {
    activeScreen: 'analyst-action' as const,
    mode: 'persona' as const,
    advance: vi.fn(),
    back: vi.fn(),
    jumpTo: vi.fn(),
    setMode: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

function makeDecisioning(overrides: Partial<DecisioningContextValue> = {}): DecisioningContextValue {
  return {
    mode: 'persona',
    setMode: vi.fn(),
    personaId: 'maria',
    setPersonaId: vi.fn(),
    liveProfile: null,
    setLiveProfile: vi.fn(),
    stateValue: 'passed_first_audit',
    pass1Output: MARIA.pass_1,
    pass2Output: MARIA.pass_2,
    pass3Output: null,
    reAuditOutput: null,
    error: null,
    raceSignalActionTaken: false,
    raceSignalModalOpen: false,
    setAnalystActionTaken: vi.fn(),
    setOverrideModalOpen: vi.fn(),
    effectivePass1: MARIA.pass_1,
    displayPass1: MARIA.pass_1,
    customerReference: 'Maria S. (Persona A)',
    shouldAnimate: false,
    headlineProps: null,
    personaName: 'Maria',
    raceTrigger: false,
    startPersonaPlayback: vi.fn(),
    startLiveRun: vi.fn(),
    reset: vi.fn(),
    ...overrides,
  };
}

describe('AnalystActionScreen', () => {
  it('renders AnalystControlPanel with the three action buttons', () => {
    render(
      <WizardContext.Provider value={defaultWizard()}>
        <DecisioningContext.Provider value={makeDecisioning()}>
          <AnalystActionScreen />
        </DecisioningContext.Provider>
      </WizardContext.Provider>,
    );
    expect(screen.getByRole('button', { name: /^approve$/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /escalate|confirm escalation/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /^override$/i })).toBeInTheDocument();
  });

  it('renders Reset case affordance', () => {
    render(
      <WizardContext.Provider value={defaultWizard()}>
        <DecisioningContext.Provider value={makeDecisioning()}>
          <AnalystActionScreen />
        </DecisioningContext.Provider>
      </WizardContext.Provider>,
    );
    expect(screen.getByRole('button', { name: /reset case/i })).toBeInTheDocument();
  });

  it('clicking Reset case fires both decisioning.reset and wizard.reset', () => {
    const wizard = defaultWizard();
    const decisioning = makeDecisioning();
    render(
      <WizardContext.Provider value={wizard}>
        <DecisioningContext.Provider value={decisioning}>
          <AnalystActionScreen />
        </DecisioningContext.Provider>
      </WizardContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /reset case/i }));
    expect(decisioning.reset).toHaveBeenCalledTimes(1);
    expect(wizard.reset).toHaveBeenCalledTimes(1);
  });

  it('renders placeholder when effectivePass1 is null', () => {
    render(
      <WizardContext.Provider value={defaultWizard()}>
        <DecisioningContext.Provider value={makeDecisioning({ effectivePass1: null })}>
          <AnalystActionScreen />
        </DecisioningContext.Provider>
      </WizardContext.Provider>,
    );
    expect(screen.getByText(/becomes available/i)).toBeInTheDocument();
  });
});
