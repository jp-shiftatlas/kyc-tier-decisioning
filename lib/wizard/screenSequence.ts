// lib/wizard/screenSequence.ts
// Canonical 5-screen wizard sequence for Batch 12. See docs/batch-12-wizard-restructure.md.
//
// Decision 48 — five screens, advance via user action.
// Decision 47a — page-level tagline locked; panel sub-headlines below are
//   screen-specific labels rendered inside each screen panel (not replacements
//   for the locked PageHeader tagline).

export type ScreenId =
  | 'persona-select'
  | 'data-flow'
  | 'audit'
  | 'examiner-notes'
  | 'analyst-action';

export interface ScreenDefinition {
  id: ScreenId;
  stepperLabel: string;
  panelHeadline: string;
}

export const SCREEN_SEQUENCE: readonly ScreenDefinition[] = [
  { id: 'persona-select', stepperLabel: 'Choose', panelHeadline: 'Choose a customer profile' },
  { id: 'data-flow', stepperLabel: 'Flow', panelHeadline: 'Trace the data flow' },
  { id: 'audit', stepperLabel: 'Audit', panelHeadline: 'Three-pass audit' },
  { id: 'examiner-notes', stepperLabel: 'Memo', panelHeadline: 'Examiner notes' },
  { id: 'analyst-action', stepperLabel: 'Action', panelHeadline: 'Analyst action' },
] as const;

function indexOf(id: ScreenId): number {
  return SCREEN_SEQUENCE.findIndex((s) => s.id === id);
}

export function nextScreen(id: ScreenId): ScreenId | null {
  const idx = indexOf(id);
  if (idx === -1 || idx === SCREEN_SEQUENCE.length - 1) return null;
  return SCREEN_SEQUENCE[idx + 1].id;
}

export function previousScreen(id: ScreenId): ScreenId | null {
  const idx = indexOf(id);
  if (idx <= 0) return null;
  return SCREEN_SEQUENCE[idx - 1].id;
}

export function isFirstScreen(id: ScreenId): boolean {
  return indexOf(id) === 0;
}

export function isLastScreen(id: ScreenId): boolean {
  return indexOf(id) === SCREEN_SEQUENCE.length - 1;
}

export function screenDefinition(id: ScreenId): ScreenDefinition {
  const def = SCREEN_SEQUENCE.find((s) => s.id === id);
  if (!def) throw new Error(`Unknown screen id: ${id}`);
  return def;
}
