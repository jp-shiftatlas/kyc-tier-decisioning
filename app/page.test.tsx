import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, cleanup } from '@testing-library/react';
import HomePage from './page';

afterEach(() => {
  cleanup();
});

describe('app/page.tsx — assembled-page layout sequence (Batch 10.2)', () => {
  it('renders the four major section landmarks in canonical order', () => {
    render(<HomePage />);
    const main = screen.getByTestId('home-main');
    const sections = Array.from(main.children).map((el) =>
      (el as HTMLElement).getAttribute('data-testid'),
    );
    expect(sections).toEqual([
      'persona-section',
      'decisioning-surface-placeholder',
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

  it('decisioning-surface-placeholder renders as a marker section (no decisioning content at 10.2)', () => {
    render(<HomePage />);
    const placeholder = screen.getByTestId('decisioning-surface-placeholder');
    expect(placeholder).toBeInTheDocument();
    // Empty at 10.2; orchestration fills this at 10.3.
    expect(placeholder.children.length).toBe(0);
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

describe('app/page.tsx — Decision 39 desktop baseline (10.2 scope)', () => {
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
    // Below xl, safety padding of px-6 (24px) prevents content touching the
    // viewport edge on narrow viewports (mobile reflow at 10.4).
    expect(main).toHaveClass('px-6');
  });
});

describe('app/page.tsx — anti-pattern guard: no orchestration imports at 10.2 (8th instance of structural-enforcement pattern)', () => {
  // Sibling to PersonaSelector + PageHeader + PageFooter structural guards.
  // 10.3 will add orchestration imports (useDecisioningMachine /
  // usePersonaPlayback / useLiveDecisioning) at the same time inert callbacks
  // become wired. This test catches a future maintainer accidentally adding
  // an orchestration import at 10.2 — the structural marker for "layout-only,
  // not orchestration-wired."
  const src = readFileSync('app/page.tsx', 'utf-8');
  const fromPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

  it('imports zero orchestration-layer modules at 10.2', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/lib\/orchestration\b/);
    }
  });

  it('imports zero API-client modules at 10.2 (no live decisioning yet)', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/lib\/api\b|decisioningClient/);
    }
  });

  it('imports zero hooks that would imply state-machine wiring', () => {
    // useDecisioningMachine, useLiveDecisioning, usePersonaPlayback — none
    // imported at 10.2. The named-import surface check is a coarser signal
    // than path checks but catches cases where the import path is a re-export.
    // Strip block comments + line comments before matching so the 10.3
    // forward-references in the file docstring don't trip the guard.
    const sansComments = src
      .replace(/\/\*[\s\S]*?\*\//g, '')
      .replace(/^\s*\/\/.*$/gm, '');
    expect(sansComments).not.toMatch(
      /useDecisioningMachine|useLiveDecisioning|usePersonaPlayback/,
    );
  });
});
