import { describe, it, expect, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { render, screen, cleanup } from '@testing-library/react';
import { PageFooter } from './PageFooter';

afterEach(() => {
  cleanup();
});

// Three locked architecture statements per PRIMARY_PROMPT.md §6.7.
// Order matters: production stack → data residency → decision accountability.
const CANONICAL_ARCHITECTURE_STATEMENTS = [
  'Reference architecture: deployed via Amazon Bedrock in client AWS environment',
  'Customer data never leaves client infrastructure',
  'Final decision authority rests with the compliance analyst',
] as const;

// Regulatory anchor list per ruleset_v1.md lines 23–37 (short form).
// Hardcoded here to surface ruleset/footer drift at test time per the
// hardcoded-tuples pattern from PersonaSelector.test.tsx.
const CANONICAL_REGULATORY_ANCHORS = [
  'MORB §921 / MORNBFI §921Q',
  'MORB §923 / MORNBFI §923Q',
  'BSP Circular 1170 (Mar 2023)',
  'BSP Circular 1218 (Sept 2025)',
  'BSP Memorandum M-2023-029',
  'BSP Memorandum M-2026-005',
  'BSP Circular 1230 (Feb 27, 2026)',
  'AMLA / RA 9160',
  'DPA / RA 10173',
  'NPC Advisory 2024-04',
  'FATF Recommendations 10–12',
  'RA 11055 (PhilSys Act)',
] as const;

describe('PageFooter — three architecture statements (PRIMARY_PROMPT.md §6.7 locked verbatim)', () => {
  it('renders all three architecture statements in order', () => {
    render(<PageFooter />);
    const container = screen.getByTestId('footer-architecture-statements');
    const statements = Array.from(container.querySelectorAll('p')).map(
      (el) => el.textContent,
    );
    expect(statements).toEqual([...CANONICAL_ARCHITECTURE_STATEMENTS]);
  });

  it('each architecture statement renders in --font-sans --text-sm --text-secondary per §5.7', () => {
    render(<PageFooter />);
    for (const statement of CANONICAL_ARCHITECTURE_STATEMENTS) {
      const el = screen.getByText(statement);
      expect(el).toHaveClass('font-sans');
      expect(el).toHaveClass('text-sm');
      expect(el).toHaveClass('text-text-secondary');
    }
  });

  it('answers DPA/data-residency objection without prompting (success criterion #2)', () => {
    render(<PageFooter />);
    // The three statements collectively encode the production-stack +
    // data-residency + decision-accountability objection-handling.
    expect(screen.getByText(/Bedrock/)).toBeInTheDocument();
    expect(screen.getByText(/Customer data never leaves/)).toBeInTheDocument();
    expect(screen.getByText(/Final decision authority/)).toBeInTheDocument();
  });
});

describe('PageFooter — regulatory citation block (visual_system.md §5.7 + ruleset_v1.md)', () => {
  it('renders all 12 regulatory anchors from ruleset_v1.md Regulatory Anchor Stack', () => {
    render(<PageFooter />);
    for (const anchor of CANONICAL_REGULATORY_ANCHORS) {
      expect(screen.getByText(anchor)).toBeInTheDocument();
    }
  });

  it('renders anchors in canonical order matching ruleset_v1.md', () => {
    render(<PageFooter />);
    const container = screen.getByTestId('footer-regulatory-citations');
    const anchors = Array.from(container.children).map((el) => el.textContent);
    expect(anchors).toEqual([...CANONICAL_REGULATORY_ANCHORS]);
  });

  it('regulatory citations render in --font-mono --text-sm per §5.7', () => {
    render(<PageFooter />);
    for (const anchor of CANONICAL_REGULATORY_ANCHORS) {
      const el = screen.getByText(anchor);
      expect(el).toHaveClass('font-mono');
      expect(el).toHaveClass('text-sm');
    }
  });

  it('regulatory citation block uses two-column CSS layout at md breakpoint (md:columns-2)', () => {
    render(<PageFooter />);
    const container = screen.getByTestId('footer-regulatory-citations');
    expect(container).toHaveClass('md:columns-2');
  });
});

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

describe('PageFooter — Finding B negative guard: Decision 33 microcopy lives at form level, NOT page level', () => {
  // Sibling to PersonaSelector.test.tsx's "Pre-generated example" negative
  // guard. Catches future drift where someone "tidies" the CustomInputForm
  // microcopy up to the PageFooter — which would conflict with the corpus's
  // section-anchored placement (Decision 33 microcopy belongs at §4.8 / §5.6,
  // not §6.7 / §5.7).
  it('does NOT render the Decision 33 rate-limit microcopy', () => {
    render(<PageFooter />);
    expect(
      screen.queryByText(/Live generation is rate-limited/),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByText(/Pre-generated examples are not affected/),
    ).not.toBeInTheDocument();
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
  // Sibling to PageHeader.test.tsx + PersonaSelector.test.tsx structural
  // guards. Chrome is layout-only.
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
