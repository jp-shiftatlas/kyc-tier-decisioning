import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, cleanup } from '@testing-library/react';
import HomePage from './page';

afterEach(() => {
  cleanup();
});

describe('app/page.tsx — Batch 12 wizard restructure', () => {
  it('renders the WizardShell as the single child of <main>', () => {
    render(<HomePage />);
    expect(screen.getByTestId('wizard-shell')).toBeInTheDocument();
  });

  it('renders the StepIndicator above the active screen panel', () => {
    render(<HomePage />);
    expect(screen.getByTestId('step-indicator')).toBeInTheDocument();
  });

  it('renders the persona-select screen at initial mount (auto-bootstrap to S1)', () => {
    render(<HomePage />);
    expect(screen.getByTestId('screen-panel-persona-select')).toBeInTheDocument();
    expect(screen.getByText('Choose a customer profile')).toBeInTheDocument();
  });

  it('renders the PersonaSelector inside the persona-select panel', () => {
    render(<HomePage />);
    const panel = screen.getByTestId('screen-panel-persona-select');
    expect(panel.querySelector('[data-testid="persona-selector"]')).toBeInTheDocument();
  });

  it('hides the "Enter your own profile" tile when NEXT_PUBLIC_LIVE_MODE_ENABLED is not set (Batch 12 demo-prep kill switch)', () => {
    // Live mode is hidden by default per docs/live-mode-known-issues.md.
    // The tile only renders when NEXT_PUBLIC_LIVE_MODE_ENABLED === 'true'.
    // Production page test runs with the env var unset → tile absent.
    render(<HomePage />);
    expect(screen.queryByText('Enter your own profile')).not.toBeInTheDocument();
  });

  it('does NOT render the prior page-bottom ArchitectureStrip at app/page level', () => {
    render(<HomePage />);
    // ArchitectureStrip's content lives inside DataFlowMap on Screen 2 now.
    // At initial mount (S1), no architecture-strip element should render.
    expect(screen.queryByTestId('architecture-strip')).not.toBeInTheDocument();
  });
});

describe('app/page.tsx — Decision 47c viewport gutter behavior preserved', () => {
  it('main container uses max-w-[1180px] mx-auto for the 1280px design target', () => {
    render(<HomePage />);
    const main = screen.getByTestId('home-main');
    expect(main).toHaveClass('mx-auto');
    expect(main).toHaveClass('max-w-[1180px]');
  });

  it('drops internal padding at xl breakpoint (50px gutter at 1280px viewport)', () => {
    render(<HomePage />);
    const main = screen.getByTestId('home-main');
    expect(main).toHaveClass('xl:px-0');
    expect(main).toHaveClass('px-6');
  });
});

describe('app/page.tsx — anti-pattern guard: layout-only at the page layer', () => {
  // After Batch 12.9, the page imports DecisioningProvider (the new state
  // provider) and WizardShell + the five screens. It does NOT directly
  // import orchestration hooks or API clients.
  const src = readFileSync('app/page.tsx', 'utf-8');
  const fromPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

  it('imports DecisioningProvider (the wizard-era state-owning wrapper)', () => {
    expect(fromPaths).toContain('@/components/orchestration/DecisioningProvider');
  });

  it('imports WizardShell (the wizard host)', () => {
    expect(fromPaths).toContain('@/components/wizard/WizardShell');
  });

  it('imports zero orchestration-layer hook modules directly', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/lib\/orchestration\b/);
    }
  });

  it('imports zero API-client modules directly', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/lib\/api\b|decisioningClient/);
    }
  });

  it('does not reference state-machine hooks at the page layer', () => {
    const sansComments = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(sansComments).not.toMatch(
      /useDecisioningMachine|useLiveDecisioning|usePersonaPlayback/,
    );
  });
});
