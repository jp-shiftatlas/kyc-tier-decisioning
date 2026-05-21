// components/wizard/useWizardState.ts
// Wizard-level state: which screen is active, what mode the user is in.
//
// Mode is the persona/live/idle distinction inherited from
// DecisioningOrchestrator's prior contract; this hook owns the wizard
// transitions but defers the decisioning state machine to the existing
// orchestration hooks (usePersonaPlayback, useLiveDecisioning) accessed via
// DecisioningProvider (Batch 12.7).

'use client';

import { useState, useCallback } from 'react';
import {
  type ScreenId,
  nextScreen,
  previousScreen,
} from '@/lib/wizard/screenSequence';

export type WizardMode = 'idle' | 'persona' | 'live';

export interface WizardState {
  activeScreen: ScreenId;
  mode: WizardMode;
  advance: () => void;
  back: () => void;
  jumpTo: (screen: ScreenId) => void;
  setMode: (mode: WizardMode) => void;
  reset: () => void;
}

interface UseWizardStateOptions {
  /** Test-only: bootstrap at a specific screen. Production callers omit this. */
  initialScreen?: ScreenId;
  /** Test-only: bootstrap at a specific mode. */
  initialMode?: WizardMode;
}

export function useWizardState(opts: UseWizardStateOptions = {}): WizardState {
  const [activeScreen, setActiveScreen] = useState<ScreenId>(opts.initialScreen ?? 'persona-select');
  const [mode, setMode] = useState<WizardMode>(opts.initialMode ?? 'idle');

  const advance = useCallback(() => {
    setActiveScreen((current) => nextScreen(current) ?? current);
  }, []);

  const back = useCallback(() => {
    setActiveScreen((current) => previousScreen(current) ?? current);
  }, []);

  const jumpTo = useCallback((screen: ScreenId) => {
    setActiveScreen(screen);
  }, []);

  const reset = useCallback(() => {
    setActiveScreen('persona-select');
    setMode('idle');
  }, []);

  return { activeScreen, mode, advance, back, jumpTo, setMode, reset };
}
