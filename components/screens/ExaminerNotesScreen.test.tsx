// components/screens/ExaminerNotesScreen.test.tsx
import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { ExaminerNotesScreen } from './ExaminerNotesScreen';
import { WizardContext } from '@/components/wizard/WizardContext';
import { DecisioningContext, type DecisioningContextValue } from '@/components/orchestration/DecisioningContext';
import { loadPersona } from '@/lib/schemas/personaAdapters';

afterEach(() => cleanup());

const MARIA = loadPersona('maria');

function defaultWizard(overrides = {}) {
  return {
    activeScreen: 'examiner-notes' as const,
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

describe('ExaminerNotesScreen', () => {
  it('renders ExaminerNotes when displayPass1 is non-null', () => {
    render(
      <WizardContext.Provider value={defaultWizard()}>
        <DecisioningContext.Provider value={makeDecisioning()}>
          <ExaminerNotesScreen />
        </DecisioningContext.Provider>
      </WizardContext.Provider>,
    );
    expect(screen.getAllByText(/maria/i).length).toBeGreaterThan(0);
  });

  it('renders Next: Analyst action › button', () => {
    render(
      <WizardContext.Provider value={defaultWizard()}>
        <DecisioningContext.Provider value={makeDecisioning()}>
          <ExaminerNotesScreen />
        </DecisioningContext.Provider>
      </WizardContext.Provider>,
    );
    expect(screen.getByRole('button', { name: /next: analyst action/i })).toBeInTheDocument();
  });

  it('clicking Next advances the wizard', () => {
    const wizard = defaultWizard();
    render(
      <WizardContext.Provider value={wizard}>
        <DecisioningContext.Provider value={makeDecisioning()}>
          <ExaminerNotesScreen />
        </DecisioningContext.Provider>
      </WizardContext.Provider>,
    );
    fireEvent.click(screen.getByRole('button', { name: /next: analyst action/i }));
    expect(wizard.advance).toHaveBeenCalledTimes(1);
  });

  it('renders empty placeholder when displayPass1 is null', () => {
    render(
      <WizardContext.Provider value={defaultWizard()}>
        <DecisioningContext.Provider value={makeDecisioning({ displayPass1: null })}>
          <ExaminerNotesScreen />
        </DecisioningContext.Provider>
      </WizardContext.Provider>,
    );
    expect(screen.getByText(/once pass 1 completes/i)).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });
});
