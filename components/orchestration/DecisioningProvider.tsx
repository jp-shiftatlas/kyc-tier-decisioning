'use client';
// components/orchestration/DecisioningProvider.tsx
// Batch 12.7 — state provider for the wizard restructure.
//
// Mirrors the state-machine wiring from DecisioningOrchestrator
// (components/orchestration/DecisioningOrchestrator.tsx) but exposes the
// resulting state via DecisioningContext rather than rendering the
// PersonaSelector + decisioning-surface + CustomInputForm tree. The screens
// (PersonaSelectScreen / DataFlowScreen / AuditScreen / ExaminerNotesScreen /
// AnalystActionScreen) consume via useDecisioning().
//
// Why a new file (not a refactor of DecisioningOrchestrator):
//   - DecisioningOrchestrator carries extensive batch-anchored docstrings and
//     a 670-line surface with established test coverage. A destructive refactor
//     risks dropping institutional knowledge encoded there.
//   - After Batch 12.9 (page rewrite), DecisioningOrchestrator becomes orphan;
//     flagged for cleanup decision in docs/batch-12-wizard-restructure.md
//     Things-to-Flag.
//
// Anchors (preserved from DecisioningOrchestrator):
//   Decision 32 + 33 + 34 — server contracts (9.x layer enforcement).
//   Decision 27 — persona scope boundary: PASS clean, no Pass 3/re-audit.
//   Decision 36e/h — analyst race wiring: live mode only; consumed at S5.
//   Decision 41a — symmetric ticker; shouldAnimate derives from state.
//   Decision 21 cap-at-1 — correction_failed_surfaced cap-reached surface.
//   Decision 46b — mid-flight persona-switch reset via personaId useEffect.
//   PRIMARY_PROMPT.md §5.3 — failure-path headline persistence (Finding H
//     workaround via failedHeadlineProps).

import { useEffect, useMemo, useState } from 'react';
import { usePersonaPlayback } from '@/lib/orchestration/personaPlayback';
import { useLiveDecisioning } from '@/lib/orchestration/liveDecisioning';
import {
  passHeadlineProps,
  type PassHeadlineProps,
} from '@/lib/orchestration/passHeadlineMap';
import {
  listPersonas,
  loadPersona,
  type PersonaId,
} from '@/lib/schemas/personaAdapters';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';
import type { DecisioningError } from '@/lib/schemas/apiError';
import {
  DecisioningContext,
  type DecisioningContextValue,
  type DecisioningMode,
} from './DecisioningContext';

const PERSONA_NAME_FALLBACK = 'this case';
const LIVE_MODE_LABEL = 'Custom case';

function failedHeadlineProps(error: DecisioningError): PassHeadlineProps {
  switch (error.pass) {
    case 1:
      return { pass: 1, variant: 'recommendation' };
    case 2:
      return { pass: 2, variant: 'audit' };
    case 3:
      return { pass: 3, variant: 'correction' };
    case 're-audit':
      return { pass: 2, variant: 'reaudit' };
  }
}

export function DecisioningProvider({ children }: { children: React.ReactNode }) {
  const [mode, setMode] = useState<DecisioningMode>('idle');
  const [personaId, setPersonaId] = useState<PersonaId | null>(null);
  const [liveProfile, setLiveProfile] = useState<CustomerProfile | null>(null);

  const personaMachine = usePersonaPlayback(
    mode === 'persona' ? personaId : null,
  );
  const liveMachine = useLiveDecisioning();

  const machine = mode === 'live' ? liveMachine : personaMachine;
  const {
    state: stateValue,
    pass1Output,
    pass2Output,
    pass3Output,
    reAuditOutput,
    error,
    raceSignalActionTaken,
    raceSignalModalOpen,
  } = machine.state;

  // Mode-switch reset hygiene (Decision 46b, Finding I from 10.3 spec walk).
  useEffect(() => {
    if (mode !== 'live') liveMachine.reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mode]);

  const raceTrigger = raceSignalActionTaken || raceSignalModalOpen;
  const shouldAnimate = stateValue === 'pass_2' || stateValue === 're_audit';

  const headlineProps: PassHeadlineProps | null =
    stateValue === 'failed' && error
      ? failedHeadlineProps(error)
      : passHeadlineProps(stateValue);

  const personas = listPersonas();
  const personaName =
    mode === 'live'
      ? LIVE_MODE_LABEL
      : (personas.find((p) => p.id === personaId)?.name ?? PERSONA_NAME_FALLBACK);

  const effectivePass1 = pass3Output?.corrected_pass_1_output ?? pass1Output;

  const displayPass1 =
    stateValue === 'corrected_and_verified' ||
    stateValue === 'correction_failed_surfaced'
      ? effectivePass1
      : pass1Output;

  const customerReference = useMemo(() => {
    if (mode === 'live') return liveProfile?.customer_reference ?? '';
    if (personaId) {
      try {
        return loadPersona(personaId).profile.customer_reference;
      } catch {
        return '';
      }
    }
    return '';
  }, [mode, personaId, liveProfile]);

  // Trigger wrappers — startPersonaPlayback is implicit (the personaMachine's
  // internal useEffect on personaId fires when setPersonaId is called).
  // Expose it explicitly here for the wizard's S2 Run Analysis handler.
  const startPersonaPlayback = (_id: PersonaId) => {
    // No-op; usePersonaPlayback's internal useEffect on personaId triggers
    // playback automatically when personaId changes (set via setPersonaId).
    // This wrapper exists so screens can express intent ("start playback")
    // even though the mechanism is dependency-driven.
  };

  const startLiveRun = (profile: CustomerProfile) => {
    liveMachine.startLiveRun(profile);
  };

  const reset = () => {
    setMode('idle');
    setPersonaId(null);
    setLiveProfile(null);
    liveMachine.reset();
  };

  const value: DecisioningContextValue = {
    mode,
    setMode,
    personaId,
    setPersonaId,
    liveProfile,
    setLiveProfile,
    stateValue,
    pass1Output,
    pass2Output,
    pass3Output,
    reAuditOutput,
    error,
    raceSignalActionTaken,
    raceSignalModalOpen,
    setAnalystActionTaken: (v: boolean) =>
      mode === 'live' ? liveMachine.setAnalystActionTaken(v) : undefined,
    setOverrideModalOpen: (v: boolean) =>
      mode === 'live' ? liveMachine.setOverrideModalOpen(v) : undefined,
    effectivePass1,
    displayPass1,
    customerReference,
    shouldAnimate,
    headlineProps,
    personaName,
    raceTrigger,
    startPersonaPlayback,
    startLiveRun,
    reset,
  };

  return (
    <DecisioningContext.Provider value={value}>
      {children}
    </DecisioningContext.Provider>
  );
}
