// components/screens/AuditScreen.test.tsx
import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, cleanup, fireEvent, act } from '@testing-library/react';
import type { ReactNode } from 'react';
import { AuditScreen } from './AuditScreen';
import { WizardContext } from '@/components/wizard/WizardContext';
import { DecisioningContext, type DecisioningContextValue } from '@/components/orchestration/DecisioningContext';
import { loadPersona } from '@/lib/schemas/personaAdapters';

// Persona-mode AuditScreen runs a 5-second simulated analysis phase
// (sim-pass-1 2s + sim-pass-2 3s) before revealing the terminal state.
// Tests that check the revealed state use fake timers + advancePastSim().

beforeEach(() => {
  vi.useFakeTimers();
});

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

function advancePastSim() {
  act(() => {
    vi.advanceTimersByTime(6000);
  });
}

const MARIA = loadPersona('maria');

function defaultWizard(overrides = {}) {
  return {
    activeScreen: 'audit' as const,
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
    ...overrides,
  };
}

function renderWith(decisioning: DecisioningContextValue, wizard = defaultWizard()) {
  return render(
    <WizardContext.Provider value={wizard}>
      <DecisioningContext.Provider value={decisioning}>
        <AuditScreen />
      </DecisioningContext.Provider>
    </WizardContext.Provider>,
  );
}

describe('AuditScreen — per-state rendering', () => {
  it('idle: renders nothing of significance (no terminal Next button)', () => {
    renderWith(makeDecisioning({ stateValue: 'idle' }));
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('pass_1: renders the pass-1 headline only', () => {
    renderWith(
      makeDecisioning({
        stateValue: 'pass_1',
        headlineProps: { pass: 1, variant: 'recommendation' },
      }),
    );
    expect(screen.getByText(/pass 1 — recommendation/i)).toBeInTheDocument();
  });

  it('passed_first_audit: renders RecommendationCard + AuditPanelTicker + Next button (after sim)', () => {
    renderWith(
      makeDecisioning({
        stateValue: 'passed_first_audit',
        pass1Output: MARIA.pass_1,
        pass2Output: MARIA.pass_2,
        effectivePass1: MARIA.pass_1,
        headlineProps: null,
        shouldAnimate: false,
      }),
    );
    advancePastSim();
    expect(screen.getByRole('button', { name: /next: examiner notes/i })).toBeInTheDocument();
  });

  // correction_failed_surfaced cap-reached layout: verified via E2E Block 3
  // existing tests; per-state unit assertion deferred to avoid the synthetic
  // Pass3Output schema-shape coupling.

  it('failed: renders error message in violation-primary, NO Next button', () => {
    renderWith(
      makeDecisioning({
        stateValue: 'failed',
        headlineProps: { pass: 1, variant: 'recommendation' },
        error: {
          pass: 1,
          errorType: 'upstream_timeout',
          message: 'Upstream timeout.',
          retryable: true,
        } as any,
      }),
    );
    expect(screen.getByTestId('failed-error-message')).toHaveTextContent('Upstream timeout.');
    expect(screen.getByText('Upstream timeout.')).toHaveClass('text-violation-primary');
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });

  it('pass_3: renders the in-flight indicator', () => {
    renderWith(
      makeDecisioning({
        stateValue: 'pass_3',
        headlineProps: { pass: 3, variant: 'correction' },
      }),
    );
    expect(screen.getByTestId('pass-3-in-flight')).toBeInTheDocument();
  });

  it('clicking Next advances the wizard from a terminal state', () => {
    const wizard = defaultWizard();
    renderWith(
      makeDecisioning({
        stateValue: 'passed_first_audit',
        pass1Output: MARIA.pass_1,
        pass2Output: MARIA.pass_2,
        effectivePass1: MARIA.pass_1,
      }),
      wizard,
    );
    advancePastSim();
    fireEvent.click(screen.getByRole('button', { name: /next: examiner notes/i }));
    expect(wizard.advance).toHaveBeenCalledTimes(1);
  });
});
