// components/wizard/WizardContext.ts
// React context exposing the wizard state (active screen, mode, transitions)
// to descendant screen components without prop-drilling.

'use client';

import { createContext, useContext } from 'react';
import type { WizardState } from './useWizardState';

export const WizardContext = createContext<WizardState | null>(null);

export function useWizard(): WizardState {
  const ctx = useContext(WizardContext);
  if (!ctx) throw new Error('useWizard must be used within a WizardContext.Provider');
  return ctx;
}
