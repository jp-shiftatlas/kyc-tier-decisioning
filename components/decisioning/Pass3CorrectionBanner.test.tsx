import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { Pass3CorrectionBanner } from './Pass3CorrectionBanner';
import type { Pass3Output } from '@/lib/schemas/pass3';

afterEach(() => {
  cleanup();
  vi.restoreAllMocks();
});

const mockPass3: Pass3Output = {
  correction_against_audit_id: 'audit-test-20260513120000',
  correction_attempt_number: 1,
  // corrected_pass_1_output cast as unknown — banner doesn't render Pass 1 fields
  corrected_pass_1_output: {} as unknown as Pass3Output['corrected_pass_1_output'],
  change_log: [
    {
      field: 'decision.recommended_tier',
      before: 'Standard',
      after: 'EDD',
      reason: 'ES-03 (PEP) was not surfaced in Pass 1; correction applied.',
    },
    {
      field: 'decision.decisive_rule_ids',
      before: ['TE-05'],
      after: ['TE-05', 'ES-03'],
      reason: 'PEP-status hard rule added to decisive rule list.',
    },
  ],
};

describe('Pass3CorrectionBanner — Decision 8 / Decision 20 render', () => {
  it('renders the "Pass 3 — Targeted correction applied" headline', () => {
    render(<Pass3CorrectionBanner pass3={mockPass3} />);
    expect(screen.getByText('Pass 3 — Targeted correction applied')).toBeInTheDocument();
  });

  it('renders summary text below the headline', () => {
    render(<Pass3CorrectionBanner pass3={mockPass3} />);
    expect(
      screen.getByText('Audit findings revised by the correction pass. Review before action.'),
    ).toBeInTheDocument();
  });

  it('renders a Chip with "CORRECTION APPLIED" label using accent variant', () => {
    render(<Pass3CorrectionBanner pass3={mockPass3} />);
    const chip = screen.getByText('CORRECTION APPLIED');
    expect(chip).toBeInTheDocument();
    expect(chip).toHaveClass('bg-accent-subtle-bg');
    expect(chip).toHaveClass('text-accent-deep');
  });
});

describe('Pass3CorrectionBanner — ChevronDisclosure change-log expansion', () => {
  it('change-log is collapsed by default — entry content NOT in DOM', () => {
    render(<Pass3CorrectionBanner pass3={mockPass3} />);
    expect(screen.queryByText('decision.recommended_tier')).not.toBeInTheDocument();
    expect(screen.queryByText(/ES-03 \(PEP\) was not surfaced/)).not.toBeInTheDocument();
  });

  it('chevron click reveals all change-log entries with Decision 20 field/before/after/reason format', () => {
    render(<Pass3CorrectionBanner pass3={mockPass3} />);
    fireEvent.click(screen.getByText('Show change log'));

    // First entry
    expect(screen.getByText('decision.recommended_tier')).toBeInTheDocument();
    expect(screen.getByText('Standard')).toBeInTheDocument();
    expect(screen.getByText('EDD')).toBeInTheDocument();
    expect(
      screen.getByText('ES-03 (PEP) was not surfaced in Pass 1; correction applied.'),
    ).toBeInTheDocument();

    // Second entry
    expect(screen.getByText('decision.decisive_rule_ids')).toBeInTheDocument();
    expect(
      screen.getByText('PEP-status hard rule added to decisive rule list.'),
    ).toBeInTheDocument();
  });

  it('chevron label flips from "Show change log" to "Hide change log" on expansion', () => {
    render(<Pass3CorrectionBanner pass3={mockPass3} />);
    expect(screen.getByText('Show change log')).toBeInTheDocument();
    fireEvent.click(screen.getByText('Show change log'));
    expect(screen.getByText('Hide change log')).toBeInTheDocument();
  });

  it('clicking again collapses the change-log', () => {
    render(<Pass3CorrectionBanner pass3={mockPass3} />);
    const trigger = screen.getByText('Show change log');
    fireEvent.click(trigger); // expand
    fireEvent.click(screen.getByText('Hide change log')); // collapse
    expect(screen.queryByText('decision.recommended_tier')).not.toBeInTheDocument();
  });
});

describe('Pass3CorrectionBanner — banner-type discipline (NOT race banner)', () => {
  it('does NOT use --violation-warn background (reserved for race banner per visual_system.md line 84)', () => {
    const { container } = render(
      <div data-testid="wrap"><Pass3CorrectionBanner pass3={mockPass3} /></div>,
    );
    const banner = container.querySelector('[data-testid="wrap"]')!.firstElementChild!;
    expect(banner.className).not.toMatch(/bg-violation-warn/);
  });

  it('uses Card variant="elevated" (bg-surface-elevated)', () => {
    const { container } = render(
      <div data-testid="wrap"><Pass3CorrectionBanner pass3={mockPass3} /></div>,
    );
    const banner = container.querySelector('[data-testid="wrap"]')!.firstElementChild!;
    expect(banner).toHaveClass('bg-surface-elevated');
  });

  it('has --accent-primary left-edge accent stripe (border-l-4 border-l-accent-primary)', () => {
    const { container } = render(
      <div data-testid="wrap"><Pass3CorrectionBanner pass3={mockPass3} /></div>,
    );
    const banner = container.querySelector('[data-testid="wrap"]')!.firstElementChild!;
    expect(banner).toHaveClass('border-l-4');
    expect(banner).toHaveClass('border-l-accent-primary');
  });

  it('retains Card primitive default border-border-default on remaining sides', () => {
    const { container } = render(
      <div data-testid="wrap"><Pass3CorrectionBanner pass3={mockPass3} /></div>,
    );
    const banner = container.querySelector('[data-testid="wrap"]')!.firstElementChild!;
    expect(banner).toHaveClass('border');
    expect(banner).toHaveClass('border-border-default');
  });
});

describe('Pass3CorrectionBanner — render-context-agnostic trust boundary', () => {
  it('renders identically standalone vs nested in a mock parent context', () => {
    // Standalone render
    const { container: standaloneContainer } = render(
      <Pass3CorrectionBanner pass3={mockPass3} />,
    );
    const standaloneHTML = standaloneContainer.innerHTML;
    cleanup();

    // Nested render (mimics banner-inside-Modal placement that the race banner
    // will exercise via AnalystControlPanel orchestration in Batch 8)
    const { container: nestedContainer } = render(
      <div data-testid="mock-modal">
        <Pass3CorrectionBanner pass3={mockPass3} />
      </div>,
    );
    const nestedBannerHTML = screen.getByTestId('mock-modal').innerHTML;

    expect(nestedBannerHTML).toBe(standaloneHTML);
  });
});

describe('Pass3CorrectionBanner — anti-spec regression guards', () => {
  it('NO animate-* or transition-* utilities on banner root (banner is state, not theater)', () => {
    const { container } = render(
      <div data-testid="wrap"><Pass3CorrectionBanner pass3={mockPass3} /></div>,
    );
    const banner = container.querySelector('[data-testid="wrap"]')!.firstElementChild!;
    expect(banner.className).not.toMatch(/\banimate-/);
    expect(banner.className).not.toMatch(/\btransition(-|\b)/);
  });

  it('NO decorative warning iconography (allows ChevronDisclosure functional state-indicator SVG)', () => {
    const { container } = render(<Pass3CorrectionBanner pass3={mockPass3} />);
    // ChevronDisclosure's chevron-icon SVG is functional state indication (built
    // in Task 6.7 primitive bundle), not decorative warning iconography. The guard
    // catches drift toward consumer-app affordances (⚠ warning triangles, etc.)
    // while permitting the composed primitive's spec-aligned internal SVG.
    const allSvgs = container.querySelectorAll('svg');
    const decorativeSvgs = Array.from(allSvgs).filter(
      (svg) => svg.getAttribute('data-testid') !== 'chevron-icon',
    );
    expect(decorativeSvgs).toHaveLength(0);
  });

  it('NO role="dialog" appears on ChevronDisclosure click (change-log inline, not modal-spawned)', () => {
    render(<Pass3CorrectionBanner pass3={mockPass3} />);
    fireEvent.click(screen.getByText('Show change log'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
  });

  it('NO auto-dismiss — banner persists across advanced timers', () => {
    vi.useFakeTimers();
    render(<Pass3CorrectionBanner pass3={mockPass3} />);
    expect(screen.getByText('Pass 3 — Targeted correction applied')).toBeInTheDocument();
    vi.advanceTimersByTime(30_000); // 30 seconds
    expect(screen.getByText('Pass 3 — Targeted correction applied')).toBeInTheDocument();
    vi.useRealTimers();
  });

  it('NO rounded utility on change-log entries (spec-silence discipline propagated)', () => {
    render(<Pass3CorrectionBanner pass3={mockPass3} />);
    fireEvent.click(screen.getByText('Show change log'));
    const entries = screen.getAllByRole('listitem');
    for (const entry of entries) {
      expect(entry.className).not.toMatch(/\brounded(-|\b)/);
    }
  });

  it('NO Button component composed (ChevronDisclosure is the sole affordance)', () => {
    render(<Pass3CorrectionBanner pass3={mockPass3} />);
    // ChevronDisclosure renders as a native button (per WAI-ARIA APG disclosure
    // pattern), so we expect ONE button — the chevron itself. No additional
    // "Acknowledge" Button should be present.
    expect(screen.getAllByRole('button')).toHaveLength(1);
  });
});
