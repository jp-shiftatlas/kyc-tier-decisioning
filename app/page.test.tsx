import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, cleanup } from '@testing-library/react';
import HomePage from './page';

afterEach(() => {
  cleanup();
});

describe('app/page.tsx — assembled-page layout sequence (Batch 10.2 layout + 10.3 wiring)', () => {
  it('renders the four major section landmarks in canonical order', () => {
    render(<HomePage />);
    const main = screen.getByTestId('home-main');
    const sections = Array.from(main.children).map((el) =>
      (el as HTMLElement).getAttribute('data-testid'),
    );
    expect(sections).toEqual([
      'persona-section',
      'decisioning-surface',
      'custom-input-section',
      'architecture-section',
    ]);
  });

  it('persona section contains the PersonaSelector', () => {
    render(<HomePage />);
    const personaSection = screen.getByTestId('persona-section');
    expect(personaSection.querySelector('[data-testid="persona-selector"]'))
      .toBeInTheDocument();
  });

  it('decisioning-surface renders the idle prompt at initial mount (10.3 wires state-driven content)', () => {
    render(<HomePage />);
    const surface = screen.getByTestId('decisioning-surface');
    expect(surface).toBeInTheDocument();
    // At initial mount, mode === 'idle' so the surface renders the
    // institutional-register prompt (Finding-anticipated disposition).
    expect(surface.querySelector('[data-testid="idle-prompt"]'))
      .toBeInTheDocument();
  });

  it('custom-input section contains the CustomInputForm submit button', () => {
    render(<HomePage />);
    const submitButton = screen.getByRole('button', {
      name: /run three-pass analysis/i,
    });
    expect(submitButton).toBeInTheDocument();
  });

  it('architecture section contains the ArchitectureStrip', () => {
    render(<HomePage />);
    const archSection = screen.getByTestId('architecture-section');
    expect(archSection.querySelector('[data-testid="architecture-strip"]'))
      .toBeInTheDocument();
  });
});

describe('app/page.tsx — Decision 39 desktop baseline (10.2 scope preserved at 10.3)', () => {
  it('main container uses max-w-[1180px] mx-auto for the 1280px design target with 50px gutters', () => {
    render(<HomePage />);
    const main = screen.getByTestId('home-main');
    expect(main).toHaveClass('mx-auto');
    expect(main).toHaveClass('max-w-[1180px]');
  });

  it('uses gap-16 (64px) section spacing per visual_system.md vertical-rhythm convention', () => {
    render(<HomePage />);
    const main = screen.getByTestId('home-main');
    expect(main).toHaveClass('flex');
    expect(main).toHaveClass('flex-col');
    expect(main).toHaveClass('gap-16');
  });

  it('drops internal padding at xl breakpoint so the 50px gutter rule holds exactly at 1280px viewport', () => {
    render(<HomePage />);
    const main = screen.getByTestId('home-main');
    expect(main).toHaveClass('xl:px-0');
    expect(main).toHaveClass('px-6');
  });
});

describe('app/page.tsx — anti-pattern guard: layout-only at the page layer (9th instance of structural-enforcement pattern)', () => {
  // At 10.3 the page imports DecisioningOrchestrator (lawful — it is the
  // designated wiring layer between orchestration hooks and component
  // callbacks) but does NOT directly import orchestration hooks. The page
  // stays layout-only; orchestration concerns live one layer deeper.
  //
  // Sibling guards: PersonaSelector + AnalystControlPanel + chrome forbid
  // orchestration imports at their layers; DecisioningOrchestrator is the
  // single lawful consumer of the orchestration hooks; this page is layout-
  // only above the orchestrator.
  const src = readFileSync('app/page.tsx', 'utf-8');
  const fromPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

  it('imports DecisioningOrchestrator (lawful at 10.3 — the designated wiring layer)', () => {
    expect(fromPaths).toContain('@/components/orchestration/DecisioningOrchestrator');
  });

  it('imports zero orchestration-layer modules directly', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/lib\/orchestration\b/);
    }
  });

  it('imports zero API-client modules directly', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/lib\/api\b|decisioningClient/);
    }
  });

  it('imports zero hooks that would imply page-layer state-machine wiring', () => {
    // useDecisioningMachine / useLiveDecisioning / usePersonaPlayback — all
    // consumed inside DecisioningOrchestrator, not at the page layer. Strip
    // block + line comments before matching so docstring forward-references
    // don't trip the guard.
    const sansComments = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(sansComments).not.toMatch(
      /useDecisioningMachine|useLiveDecisioning|usePersonaPlayback/,
    );
  });
});
