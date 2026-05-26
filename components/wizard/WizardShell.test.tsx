// components/wizard/WizardShell.test.tsx
//
// Test uses inline placeholder screens — kept local to avoid Plan Discipline
// D1 circular imports against the per-screen components that land in
// Batches 12.2–12.8.

import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { WizardShell, type ScreenMap } from './WizardShell';

function buildPlaceholderScreens(): ScreenMap {
  return {
    'persona-select': () => <div data-testid="screen-persona">persona</div>,
    'data-flow': () => <div data-testid="screen-flow">flow</div>,
    'audit': () => <div data-testid="screen-audit">audit</div>,
    'examiner-notes': () => <div data-testid="screen-memo">memo</div>,
    'analyst-action': () => <div data-testid="screen-action">action</div>,
  };
}

describe('WizardShell', () => {
  it('renders the active screen and the step indicator', () => {
    render(<WizardShell screens={buildPlaceholderScreens()} />);
    expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
    expect(screen.getByTestId('screen-persona')).toBeInTheDocument();
    expect(screen.queryByTestId('screen-flow')).not.toBeInTheDocument();
  });

  it('uses panelHeadline as the section aria-label even when visible heading is suppressed (Batch 12 hero handoff)', () => {
    // persona-select carries hideVisiblePanelHeadline: true so the screen's
    // own hero banner provides the visible heading. The aria-label still
    // tracks the canonical panelHeadline.
    render(<WizardShell screens={buildPlaceholderScreens()} />);
    expect(
      screen.getByRole('region', { name: 'Choose a customer profile' }),
    ).toBeInTheDocument();
  });

  it('renders the visible h2 panel heading for screens without hideVisiblePanelHeadline', () => {
    render(<WizardShell screens={buildPlaceholderScreens()} initialScreen="data-flow" />);
    expect(screen.getByText('Trace the data flow')).toBeInTheDocument();
  });

  it('does NOT render a Back button on persona-select (first screen)', () => {
    render(<WizardShell screens={buildPlaceholderScreens()} />);
    expect(screen.queryByRole('button', { name: /back/i })).not.toBeInTheDocument();
  });

  it('renders a Back button on screens 2-5', () => {
    render(<WizardShell screens={buildPlaceholderScreens()} initialScreen="data-flow" />);
    expect(screen.getByRole('button', { name: /back/i })).toBeInTheDocument();
  });

  it('Back button returns to the previous screen', () => {
    render(<WizardShell screens={buildPlaceholderScreens()} initialScreen="audit" />);
    fireEvent.click(screen.getByRole('button', { name: /back/i }));
    expect(screen.getByTestId('screen-flow')).toBeInTheDocument();
  });

  it('does NOT render a forward Next button on persona-select or data-flow', () => {
    // Auto-advance on S1 (persona-select); inline Run Analysis on S2 (data-flow).
    render(<WizardShell screens={buildPlaceholderScreens()} />);
    expect(screen.queryByRole('button', { name: /next/i })).not.toBeInTheDocument();
  });
});
