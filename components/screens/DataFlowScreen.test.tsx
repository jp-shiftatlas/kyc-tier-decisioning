// components/screens/DataFlowScreen.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { DataFlowScreen } from './DataFlowScreen';
import { WizardContext } from '@/components/wizard/WizardContext';
import { DecisioningContext, type DecisioningContextValue } from '@/components/orchestration/DecisioningContext';

// Extraction animation runs for ~1500ms on Screen 2 mount. Tests use fake
// timers + advanceTimersByTime() to step past it where they need the Run
// Analysis button enabled.

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function defaultWizard(overrides = {}) {
  return {
    activeScreen: 'data-flow' as const,
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
  const base: DecisioningContextValue = {
    mode: 'persona',
    setMode: vi.fn(),
    personaId: 'maria',
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
    personaName: 'Maria',
    raceTrigger: false,
    startPersonaPlayback: vi.fn(),
    startLiveRun: vi.fn(),
    reset: vi.fn(),
  };
  return { ...base, ...overrides };
}

function renderWithContexts(
  children: ReactNode,
  ctx: { wizard?: any; decisioning?: DecisioningContextValue } = {},
) {
  return render(
    <WizardContext.Provider value={ctx.wizard ?? defaultWizard()}>
      <DecisioningContext.Provider value={ctx.decisioning ?? makeDecisioning()}>
        {children}
      </DecisioningContext.Provider>
    </WizardContext.Provider>,
  );
}

function advancePastExtraction() {
  act(() => {
    vi.advanceTimersByTime(3000);
  });
}

describe('DataFlowScreen — persona mode', () => {
  it('renders DataFlowMap with persona subgroups for selected persona', () => {
    renderWithContexts(<DataFlowScreen />);
    expect(screen.getByText('Customer identity')).toBeInTheDocument();
    expect(screen.getByText('Account & behavior')).toBeInTheDocument();
    expect(screen.getByText('Risk indicators')).toBeInTheDocument();
    expect(screen.getByText('Relationship')).toBeInTheDocument();
  });

  it('Run Analysis button is disabled during extraction animation', () => {
    renderWithContexts(<DataFlowScreen />);
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeDisabled();
  });

  it('Run Analysis button becomes enabled after extraction completes', () => {
    renderWithContexts(<DataFlowScreen />);
    advancePastExtraction();
    expect(screen.getByRole('button', { name: /run analysis/i })).not.toBeDisabled();
  });

  it('clicking Run Analysis fires startPersonaPlayback + wizard.advance (after extraction)', () => {
    const wizard = defaultWizard();
    const decisioning = makeDecisioning();
    renderWithContexts(<DataFlowScreen />, { wizard, decisioning });
    advancePastExtraction();
    fireEvent.click(screen.getByRole('button', { name: /run analysis/i }));
    expect(decisioning.startPersonaPlayback).toHaveBeenCalledWith('maria');
    expect(wizard.advance).toHaveBeenCalledTimes(1);
  });
});

describe('DataFlowScreen — live mode', () => {
  it('renders the 4 row-layout edit slots (Customer identity / Account & behavior / Risk indicators / Relationship)', () => {
    const wizard = defaultWizard({ mode: 'live' });
    const decisioning = makeDecisioning({ mode: 'live', personaId: null });
    renderWithContexts(<DataFlowScreen />, { wizard, decisioning });
    expect(screen.getByText('Customer identity')).toBeInTheDocument();
    expect(screen.getByText('Account & behavior')).toBeInTheDocument();
    expect(screen.getByText('Risk indicators')).toBeInTheDocument();
    expect(screen.getByText('Relationship')).toBeInTheDocument();
  });

  it('live mode renders the inline Run Analysis button (form submit trigger)', () => {
    const wizard = defaultWizard({ mode: 'live' });
    const decisioning = makeDecisioning({ mode: 'live', personaId: null });
    renderWithContexts(<DataFlowScreen />, { wizard, decisioning });
    expect(screen.getByRole('button', { name: /run analysis/i })).toBeInTheDocument();
  });

  it('live mode places identity / account / relationship slot inputs inside the Onboarding row', () => {
    const wizard = defaultWizard({ mode: 'live' });
    const decisioning = makeDecisioning({ mode: 'live', personaId: null });
    renderWithContexts(<DataFlowScreen />, { wizard, decisioning });
    const onboardingPanel = screen.getByTestId('stage-onboarding-panel');
    // The CustomerIdentitySlot renders a customer_reference text input
    expect(onboardingPanel.querySelector('#live-customer_reference')).toBeInTheDocument();
    expect(onboardingPanel.querySelector('#live-occupation_type')).toBeInTheDocument();
    expect(onboardingPanel.querySelector('#live-years_with_bank')).toBeInTheDocument();
  });

  it('live mode places risk indicator slot inputs inside the AML Screening row', () => {
    const wizard = defaultWizard({ mode: 'live' });
    const decisioning = makeDecisioning({ mode: 'live', personaId: null });
    renderWithContexts(<DataFlowScreen />, { wizard, decisioning });
    const amlPanel = screen.getByTestId('stage-aml-screening-panel');
    expect(amlPanel.querySelector('#live-pep_status')).toBeInTheDocument();
    expect(amlPanel.querySelector('#live-sanctions_screening')).toBeInTheDocument();
  });
});
