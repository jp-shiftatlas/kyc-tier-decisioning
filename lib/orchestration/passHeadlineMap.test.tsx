import { describe, it, expect } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { afterEach } from 'vitest';
import { passHeadlineProps } from './passHeadlineMap';
import { PassHeadline } from '@/components/decisioning/PassHeadline';
import type { DecisioningState } from './stateMachine';

afterEach(() => cleanup());

describe('passHeadlineProps — Decision 41 S3 / 41d state-value → headline-props mapping', () => {
  it('maps pass_1 → { pass: 1, variant: recommendation }', () => {
    expect(passHeadlineProps('pass_1')).toEqual({ pass: 1, variant: 'recommendation' });
  });

  it('maps pass_2 (original audit) → { pass: 2, variant: audit }', () => {
    expect(passHeadlineProps('pass_2')).toEqual({ pass: 2, variant: 'audit' });
  });

  it('maps pass_3 → { pass: 3, variant: correction }', () => {
    expect(passHeadlineProps('pass_3')).toEqual({ pass: 3, variant: 'correction' });
  });

  it('maps re_audit → { pass: 2, variant: reaudit } (distinct from original-audit pass_2)', () => {
    // The 9.1 flat-enumeration choice makes re_audit a distinct state value —
    // the headline reads directly off the discriminator, no separate flag.
    expect(passHeadlineProps('re_audit')).toEqual({ pass: 2, variant: 'reaudit' });
  });

  it('returns null for idle and all four terminal states (no headline)', () => {
    const noHeadlineStates: DecisioningState[] = [
      'idle',
      'passed_first_audit',
      'corrected_and_verified',
      'correction_failed_surfaced',
      'failed',
    ];
    for (const s of noHeadlineStates) {
      expect(passHeadlineProps(s)).toBeNull();
    }
  });
});

describe('passHeadlineProps — integration: mapped props produce the exact Decision 41d headline text', () => {
  // Binding test — the mapped props, fed to the Batch-7 PassHeadline component,
  // produce the verbatim Decision 41d headline strings. If PassHeadline's prop
  // union or label text drifts, this integration test fails alongside the
  // typecheck failure at the spread site.
  // Labels updated per JP Batch 12 Screen 3 feedback. The Pass 2 audit and
  // re-audit variants now carry distinct suffixes so "Pass 2" doesn't appear
  // twice with the same label when Pass 3 fires.
  const cases: Array<{ state: DecisioningState; expected: string }> = [
    { state: 'pass_1', expected: 'Pass 1 — Recommendation' },
    { state: 'pass_2', expected: 'Pass 2 — Re-check Pass 1' },
    { state: 'pass_3', expected: 'Pass 3 — Correction' },
    { state: 're_audit', expected: 'Pass 2 — Re-check Pass 1 (after correction)' },
  ];

  for (const { state, expected } of cases) {
    it(`state '${state}' → headline "${expected}"`, () => {
      const props = passHeadlineProps(state);
      expect(props).not.toBeNull();
      render(<PassHeadline {...props!} />);
      expect(screen.getByText(expected)).toBeInTheDocument();
    });
  }
});
