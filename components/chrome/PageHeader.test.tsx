import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, cleanup } from '@testing-library/react';
import { PageHeader } from './PageHeader';

afterEach(() => {
  cleanup();
});

const CANONICAL_TITLE = 'KYC Tier Decisioning';
const CANONICAL_TAGLINE =
  'Three-pass reasoning pipeline — Shift Atlas consulting methodology demonstration';
const CANONICAL_BRAND_HREF = 'https://shiftatlas.tech';
// Batch 12 polish: brand link label updated to "Shift Atlas ↗"
// (external-link affordance) alongside the new demo badge.
const CANONICAL_BRAND_LABEL = 'Shift Atlas ↗';

describe('PageHeader — Decision 38 + Finding D content (10.2 dispatch-prep ratification)', () => {
  it('renders the canonical demo title verbatim', () => {
    render(<PageHeader />);
    expect(screen.getByRole('heading', { level: 1, name: CANONICAL_TITLE }))
      .toBeInTheDocument();
  });

  it('renders the canonical tagline verbatim (regression-guards Finding D ratified content)', () => {
    render(<PageHeader />);
    expect(screen.getByText(CANONICAL_TAGLINE)).toBeInTheDocument();
  });

  it('renders the Shift Atlas brand link with correct href + target/rel for external navigation', () => {
    render(<PageHeader />);
    const link = screen.getByRole('link', { name: CANONICAL_BRAND_LABEL });
    expect(link).toHaveAttribute('href', CANONICAL_BRAND_HREF);
    expect(link).toHaveAttribute('target', '_blank');
    expect(link).toHaveAttribute('rel', 'noopener noreferrer');
  });

  it('brand link renders in --text-tertiary --text-xs per visual_system.md §5.7 attribution convention', () => {
    render(<PageHeader />);
    const link = screen.getByRole('link', { name: CANONICAL_BRAND_LABEL });
    expect(link).toHaveClass('text-text-tertiary');
    expect(link).toHaveClass('text-xs');
  });
});

describe('PageHeader — semantic structure', () => {
  it('uses <header> element with role="banner"', () => {
    render(<PageHeader />);
    const header = screen.getByRole('banner');
    expect(header.tagName).toBe('HEADER');
  });

  it('renders no buttons or other interactive elements beyond the brand link', () => {
    render(<PageHeader />);
    expect(screen.queryAllByRole('button')).toHaveLength(0);
    // Exactly one link — the Shift Atlas brand link.
    const links = screen.queryAllByRole('link');
    expect(links).toHaveLength(1);
    expect(links[0]).toHaveAttribute('href', CANONICAL_BRAND_HREF);
  });
});

describe('PageHeader — structural guards: pure presentation, no orchestration knowledge', () => {
  // Sibling to PersonaSelector.test.tsx structural guards from 10.1. Chrome
  // is layout-only; future maintainer adding orchestration imports here
  // fails this guard before the import can bind to runtime state.
  const src = readFileSync('components/chrome/PageHeader.tsx', 'utf-8');
  const fromPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

  it('imports zero orchestration-layer modules', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/lib\/orchestration\b/);
    }
  });

  it('imports zero decisioning-component modules', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/components\/decisioning\b/);
    }
  });

  it('imports zero persona data', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/personas|loadPersona|listPersonas/);
    }
  });
});
