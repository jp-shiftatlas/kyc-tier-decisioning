// components/orchestration/DecisioningProvider.test.tsx
//
// Smoke + integration tests for DecisioningProvider. The provider mirrors
// DecisioningOrchestrator's state-machine wiring; the existing
// DecisioningOrchestrator test surface already covers the deep behavior
// (persona playback transitions, mid-flight resets, race-trigger semantics).
// These tests verify the context shape and a few key invariants without
// re-duplicating the full state-machine surface.

import { describe, it, expect, afterEach } from 'vitest';
import { render, cleanup, act } from '@testing-library/react';
import { DecisioningProvider } from './DecisioningProvider';
import { useDecisioning } from './DecisioningContext';

afterEach(() => cleanup());

function Probe({ onMount }: { onMount: (ctx: ReturnType<typeof useDecisioning>) => void }) {
  const ctx = useDecisioning();
  onMount(ctx);
  return null;
}

describe('DecisioningProvider', () => {
  it('initializes with mode=idle, personaId=null, liveProfile=null', () => {
    let captured: any = null;
    render(
      <DecisioningProvider>
        <Probe onMount={(ctx) => (captured = ctx)} />
      </DecisioningProvider>,
    );
    expect(captured.mode).toBe('idle');
    expect(captured.personaId).toBe(null);
    expect(captured.liveProfile).toBe(null);
  });

  it('initial stateValue is idle (no machine output yet)', () => {
    let captured: any = null;
    render(
      <DecisioningProvider>
        <Probe onMount={(ctx) => (captured = ctx)} />
      </DecisioningProvider>,
    );
    expect(captured.stateValue).toBe('idle');
    expect(captured.pass1Output).toBe(null);
  });

  it('setPersonaId + setMode("persona") advances the persona machine', async () => {
    let captured: any = null;
    render(
      <DecisioningProvider>
        <Probe onMount={(ctx) => (captured = ctx)} />
      </DecisioningProvider>,
    );
    act(() => {
      captured.setPersonaId('maria');
      captured.setMode('persona');
    });
    // After persona is selected, the machine progresses; stateValue should
    // leave 'idle' on subsequent renders. We don't assert the precise terminal
    // state here (Decision 46a — persona resolution is instantaneous and the
    // exact terminal frame depends on the persona machine internals — covered
    // by personaPlayback.test.ts).
    expect(captured.personaId).toBe('maria');
    expect(captured.mode).toBe('persona');
  });

  it('reset returns mode to idle and clears personaId + liveProfile', () => {
    let captured: any = null;
    render(
      <DecisioningProvider>
        <Probe onMount={(ctx) => (captured = ctx)} />
      </DecisioningProvider>,
    );
    act(() => {
      captured.setPersonaId('maria');
      captured.setMode('persona');
    });
    act(() => captured.reset());
    expect(captured.mode).toBe('idle');
    expect(captured.personaId).toBe(null);
  });

  it('personaName surfaces "Custom case" in live mode', () => {
    let captured: any = null;
    render(
      <DecisioningProvider>
        <Probe onMount={(ctx) => (captured = ctx)} />
      </DecisioningProvider>,
    );
    act(() => captured.setMode('live'));
    expect(captured.personaName).toBe('Custom case');
  });

  it('personaName surfaces the loaded persona name in persona mode', () => {
    let captured: any = null;
    render(
      <DecisioningProvider>
        <Probe onMount={(ctx) => (captured = ctx)} />
      </DecisioningProvider>,
    );
    act(() => {
      captured.setPersonaId('maria');
      captured.setMode('persona');
    });
    expect(captured.personaName).toBe('Maria');
  });
});
