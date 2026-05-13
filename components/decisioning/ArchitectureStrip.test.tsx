import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ArchitectureStrip } from './ArchitectureStrip';

afterEach(() => vi.restoreAllMocks());

describe('ArchitectureStrip — §5.4 / Decision 42 five-box render', () => {
  it('renders five spec-named boxes in canonical order', () => {
    render(<ArchitectureStrip />);
    const labels = [
      'Identity Verification',
      'AML Screening',
      'Reasoning Layer',
      'Case Management',
      'Core Banking',
    ];
    for (const label of labels) {
      expect(screen.getByText(label)).toBeInTheDocument();
    }
  });

  it('middle box (Reasoning Layer) uses --accent-primary + --text-inverse per §5.4 line 309', () => {
    render(<ArchitectureStrip />);
    const middle = screen.getByText('Reasoning Layer');
    expect(middle).toHaveClass('bg-accent-primary');
    expect(middle).toHaveClass('text-text-inverse');
  });

  it('flanking boxes use Card variant="recessed" (--surface-recessed) per §5.4 line 310', () => {
    render(<ArchitectureStrip />);
    const flankingLabels = ['Identity Verification', 'AML Screening', 'Case Management', 'Core Banking'];
    for (const label of flankingLabels) {
      expect(screen.getByText(label)).toHaveClass('bg-surface-recessed');
    }
  });

  it('flanking boxes carry --border-default border (Card primitive default)', () => {
    render(<ArchitectureStrip />);
    const flanking = screen.getByText('Identity Verification');
    expect(flanking).toHaveClass('border');
    expect(flanking).toHaveClass('border-border-default');
  });
});

describe('ArchitectureStrip — chevron separators (typographic, not iconographic)', () => {
  it('renders four desktop chevrons (›) between five boxes', () => {
    render(<ArchitectureStrip />);
    const desktopChevrons = screen.getAllByText('›');
    expect(desktopChevrons).toHaveLength(4);
  });

  it('renders four mobile chevrons (↓) between five boxes', () => {
    render(<ArchitectureStrip />);
    const mobileChevrons = screen.getAllByText('↓');
    expect(mobileChevrons).toHaveLength(4);
  });

  it('chevrons use --text-tertiary color (Decision 42 light treatment)', () => {
    render(<ArchitectureStrip />);
    const desktopChevrons = screen.getAllByText('›');
    for (const ch of desktopChevrons) {
      expect(ch).toHaveClass('text-text-tertiary');
    }
  });

  it('chevrons carry aria-hidden="true" so screen readers announce label sequence cleanly', () => {
    render(<ArchitectureStrip />);
    const desktopChevrons = screen.getAllByText('›');
    const mobileChevrons = screen.getAllByText('↓');
    for (const ch of [...desktopChevrons, ...mobileChevrons]) {
      expect(ch).toHaveAttribute('aria-hidden', 'true');
    }
  });

  it('desktop chevrons hidden on mobile via hidden md:inline; mobile chevrons hidden on desktop via inline md:hidden', () => {
    render(<ArchitectureStrip />);
    const desktopChevron = screen.getAllByText('›')[0];
    expect(desktopChevron).toHaveClass('hidden');
    expect(desktopChevron).toHaveClass('md:inline');

    const mobileChevron = screen.getAllByText('↓')[0];
    expect(mobileChevron).toHaveClass('inline');
    expect(mobileChevron).toHaveClass('md:hidden');
  });
});

describe('ArchitectureStrip — production annotation (§5.4 lines 314–321)', () => {
  it('renders v1 demo + Production labels with verbatim spec text', () => {
    render(<ArchitectureStrip />);
    expect(screen.getByText('v1 demo:')).toBeInTheDocument();
    expect(screen.getByText('Production:')).toBeInTheDocument();
    expect(screen.getByText('single-model with independent re-derivation.')).toBeInTheDocument();
    expect(screen.getByText('multi-model audit on Bedrock with redacted input.')).toBeInTheDocument();
  });

  it('annotation labels use --text-tertiary; body uses --text-secondary per §5.4 line 321', () => {
    render(<ArchitectureStrip />);
    expect(screen.getByText('v1 demo:')).toHaveClass('text-text-tertiary');
    expect(screen.getByText('Production:')).toHaveClass('text-text-tertiary');
    expect(screen.getByText('single-model with independent re-derivation.')).toHaveClass('text-text-secondary');
    expect(screen.getByText('multi-model audit on Bedrock with redacted input.')).toHaveClass('text-text-secondary');
  });
});

describe('ArchitectureStrip — anti-spec regression guards (Decision 42 explicit rejections)', () => {
  it('NO button role anywhere (Decision 42 rejected click-to-expand)', () => {
    render(<ArchitectureStrip />);
    expect(screen.queryByRole('button')).not.toBeInTheDocument();
  });

  it('NO hover-state utility classes on boxes (Decision 42 rejected hover-to-expand)', () => {
    render(<ArchitectureStrip />);
    const strip = screen.getByTestId('architecture-strip');
    // No `hover:` prefix anywhere in the strip
    expect(strip.outerHTML).not.toMatch(/\bhover:/);
  });

  it('NO transition or animation utilities (no chevron-rotation theater per Decision 42)', () => {
    render(<ArchitectureStrip />);
    const strip = screen.getByTestId('architecture-strip');
    expect(strip.outerHTML).not.toMatch(/\btransition(-|\b)/);
    expect(strip.outerHTML).not.toMatch(/\banimate-/);
  });

  it('NO SVG elements (chevrons are typographic glyphs, not icon components)', () => {
    const { container } = render(<ArchitectureStrip />);
    expect(container.querySelector('svg')).toBeNull();
  });

  it('NO tooltip role anywhere (no hover-definitions on box labels)', () => {
    render(<ArchitectureStrip />);
    expect(screen.queryByRole('tooltip')).not.toBeInTheDocument();
  });

  it('NO rounded utility on boxes (Card primitive spec-silence discipline)', () => {
    render(<ArchitectureStrip />);
    const middle = screen.getByText('Reasoning Layer');
    expect(middle.className).not.toMatch(/\brounded(-|\b)/);
    const flanking = screen.getByText('Identity Verification');
    expect(flanking.className).not.toMatch(/\brounded(-|\b)/);
  });
});

describe('ArchitectureStrip — Amendment 5 Fragment-key pattern (no React warning)', () => {
  it('renders without "missing key" React warning', () => {
    const consoleErrorSpy = vi.spyOn(console, 'error').mockImplementation(() => undefined);
    render(<ArchitectureStrip />);
    // Inspect that no console.error call references the missing-key warning shape
    const calls = consoleErrorSpy.mock.calls.map((args) => args.join(' '));
    const keyWarning = calls.find((msg) => /each child in a list should have a unique "key"/.test(msg));
    expect(keyWarning).toBeUndefined();
  });
});

describe('ArchitectureStrip — mobile responsive treatment (§5.4 line 323)', () => {
  it('outer flex container declares md: responsive breakpoint for horizontal-vs-vertical layout', () => {
    render(<ArchitectureStrip />);
    const strip = screen.getByTestId('architecture-strip');
    const inner = strip.firstElementChild as HTMLElement;
    // Mobile: flex-col; Desktop: md:flex-row
    expect(inner.className).toMatch(/\bflex-col\b/);
    expect(inner.className).toMatch(/\bmd:flex-row\b/);
  });
});
