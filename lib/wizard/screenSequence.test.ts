// lib/wizard/screenSequence.test.ts
import { describe, it, expect } from 'vitest';
import {
  SCREEN_SEQUENCE,
  nextScreen,
  previousScreen,
  isFirstScreen,
  isLastScreen,
  screenDefinition,
} from './screenSequence';

describe('screenSequence', () => {
  it('defines five screens in canonical order', () => {
    expect(SCREEN_SEQUENCE.map((s) => s.id)).toEqual([
      'persona-select',
      'data-flow',
      'audit',
      'examiner-notes',
      'analyst-action',
    ]);
  });

  it('each screen carries a stepper label and a panel sub-headline', () => {
    SCREEN_SEQUENCE.forEach((s) => {
      expect(s.stepperLabel).toBeTruthy();
      expect(s.panelHeadline).toBeTruthy();
    });
  });

  it('nextScreen advances by one or returns null at end', () => {
    expect(nextScreen('persona-select')).toBe('data-flow');
    expect(nextScreen('data-flow')).toBe('audit');
    expect(nextScreen('audit')).toBe('examiner-notes');
    expect(nextScreen('examiner-notes')).toBe('analyst-action');
    expect(nextScreen('analyst-action')).toBe(null);
  });

  it('previousScreen retreats by one or returns null at start', () => {
    expect(previousScreen('data-flow')).toBe('persona-select');
    expect(previousScreen('persona-select')).toBe(null);
  });

  it('isFirstScreen / isLastScreen identify boundary screens', () => {
    expect(isFirstScreen('persona-select')).toBe(true);
    expect(isFirstScreen('data-flow')).toBe(false);
    expect(isLastScreen('analyst-action')).toBe(true);
    expect(isLastScreen('data-flow')).toBe(false);
  });

  it('screenDefinition returns the definition object for a known id', () => {
    expect(screenDefinition('audit').panelHeadline).toBe('Three-pass audit');
  });
});
