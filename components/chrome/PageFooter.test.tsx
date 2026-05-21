import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, cleanup } from '@testing-library/react';
import { PageFooter } from './PageFooter';

afterEach(() => {
  cleanup();
});

// Batch 12 sidebar refactor: regulatory anchors + architecture statements
// moved to ReferencesSidebar (lg+ left panel). PageFooter is now attribution
// only. The Decision 33 negative guard stays — that microcopy is form-level,
// not page-level.

describe('PageFooter — Shift Atlas attribution (visual_system.md §5.7)', () => {
  it('renders the attribution element', () => {
    render(<PageFooter />);
    expect(screen.getByTestId('footer-attribution')).toBeInTheDocument();
  });

  it('attribution renders in --text-tertiary --text-xs, right-aligned per §5.7', () => {
    render(<PageFooter />);
    const attribution = screen.getByTestId('footer-attribution');
    expect(attribution).toHaveClass('text-text-tertiary');
    expect(attribution).toHaveClass('text-xs');
    expect(attribution).toHaveClass('text-right');
  });

  it('attribution mentions Shift Atlas brand (inbound mechanism per Decision 38)', () => {
    render(<PageFooter />);
    const attribution = screen.getByTestId('footer-attribution');
    expect(attribution.textContent).toMatch(/Shift Atlas/);
  });
});

describe('PageFooter — sidebar dedup: references moved out of bottom bar', () => {
  it('does NOT render the regulatory citation list (moved to ReferencesSidebar)', () => {
    render(<PageFooter />);
    expect(screen.queryByTestId('footer-regulatory-citations')).not.toBeInTheDocument();
    expect(screen.queryByText('MORB §921 / MORNBFI §921Q')).not.toBeInTheDocument();
  });

  it('does NOT render the architecture statements (moved to ReferencesSidebar)', () => {
    render(<PageFooter />);
    expect(screen.queryByTestId('footer-architecture-statements')).not.toBeInTheDocument();
    expect(screen.queryByText(/Reference architecture: deployed via Amazon Bedrock/)).not.toBeInTheDocument();
  });
});

describe('PageFooter — Finding B negative guard: Decision 33 microcopy lives at form level', () => {
  it('does NOT render the Decision 33 rate-limit microcopy', () => {
    render(<PageFooter />);
    expect(screen.queryByText(/Live generation is rate-limited/)).not.toBeInTheDocument();
    expect(screen.queryByText(/Pre-generated examples are not affected/)).not.toBeInTheDocument();
  });
});

describe('PageFooter — semantic structure', () => {
  it('uses <footer> element with role="contentinfo"', () => {
    render(<PageFooter />);
    const footer = screen.getByRole('contentinfo');
    expect(footer.tagName).toBe('FOOTER');
  });
});

describe('PageFooter — structural guards: pure presentation, no orchestration knowledge', () => {
  const src = readFileSync('components/chrome/PageFooter.tsx', 'utf-8');
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
