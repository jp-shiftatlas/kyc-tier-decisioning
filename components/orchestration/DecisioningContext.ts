// components/orchestration/DecisioningContext.ts
// React context exposing the decisioning state machine and mode/persona/live
// selection to the wizard's screen components. The full provider lands in
// Batch 12.7 (DecisioningProvider). For Batches 12.2–12.6, screens consume
// this context via useDecisioning(); tests inject placeholder values.

'use client';

import { createContext, useContext } from 'react';
import type { PersonaId } from '@/lib/schemas/personaAdapters';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';
import type { Pass1Output } from '@/lib/schemas/pass1';
import type { Pass2Output } from '@/lib/schemas/pass2';
import type { Pass3Output } from '@/lib/schemas/pass3';
import type { DecisioningError } from '@/lib/schemas/apiError';
import type { PassHeadlineProps } from '@/lib/orchestration/passHeadlineMap';

export type DecisioningMode = 'idle' | 'persona' | 'live';

export type DecisioningStateValue =
  | 'idle'
  | 'pass_1'
  | 'pass_2'
  | 'pass_3'
  | 're_audit'
  | 'passed_first_audit'
  | 'corrected_and_verified'
  | 'correction_failed_surfaced'
  | 'failed';

export interface DecisioningContextValue {
  // Mode + selection
  mode: DecisioningMode;
  setMode: (mode: DecisioningMode) => void;
  personaId: PersonaId | null;
  setPersonaId: (id: PersonaId | null) => void;
  liveProfile: CustomerProfile | null;
  setLiveProfile: (p: CustomerProfile | null) => void;

  // Machine state
  stateValue: DecisioningStateValue;
  pass1Output: Pass1Output | null;
  pass2Output: Pass2Output | null;
  pass3Output: Pass3Output | null;
  reAuditOutput: Pass2Output | null;
  error: DecisioningError | null;

  // Race signals (Decision 36h)
  raceSignalActionTaken: boolean;
  raceSignalModalOpen: boolean;
  setAnalystActionTaken: (v: boolean) => void;
  setOverrideModalOpen: (v: boolean) => void;

  // Derived helpers (mirror existing DecisioningOrchestrator surface)
  effectivePass1: Pass1Output | null;
  displayPass1: Pass1Output | null;
  customerReference: string;
  shouldAnimate: boolean;
  headlineProps: PassHeadlineProps | null;
  personaName: string;
  raceTrigger: boolean;

  // Triggers
  startPersonaPlayback: (id: PersonaId) => void;
  startLiveRun: (profile: CustomerProfile) => void;
  reset: () => void;
}

export const DecisioningContext = createContext<DecisioningContextValue | null>(null);

export function useDecisioning(): DecisioningContextValue {
  const ctx = useContext(DecisioningContext);
  if (!ctx) throw new Error('useDecisioning must be used within a DecisioningContext.Provider');
  return ctx;
}
