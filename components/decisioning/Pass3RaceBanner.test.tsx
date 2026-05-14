import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, cleanup } from '@testing-library/react';
import { Pass3RaceBanner } from './Pass3RaceBanner';
import type { Pass3Output } from '@/lib/schemas/pass3';

afterEach(() => {
  cleanup();
});

// pass3 prop trigger — contents are not read by Pass3RaceBanner (verbatim
// message is static per §5.5 line 368). corrected_pass_1_output cast to satisfy the
// type without filling the full Pass 1 envelope (same pattern as the
// Pass3CorrectionBanner test fixture).
const mockPass3: Pass3Output = {
  correction_against_audit_id: 'audit-test-20260514120000',
  correction_attempt_number: 1,
  corrected_pass_1_output: {} as unknown as Pass3Output['corrected_pass_1_output'],
  change_log: [
    { field: 'decision.recommended_tier', before: 'Standard', after: 'EDD', reason: 'race-test' },
  ],
};

describe('Pass3RaceBanner — verbatim message (§5.5 line 368)', () => {
  it('renders the verbatim race-coordination message exactly as specified', () => {
    render(<Pass3RaceBanner pass3={mockPass3} />);
    expect(
      screen.getByText(
        'Audit findings revised after your previous action. Action surface reset; please review the corrected recommendation.',
      ),
    ).toBeInTheDocument();
  });
});

describe('Pass3RaceBanner — --violation-warn token reserved-usage (visual_system.md line 84)', () => {
  // The banner is the SOLE canonical consumer of --violation-warn per the
  // reserved-usage rule at visual_system.md line 84. Positive guard confirms
  // this consumption; cross-component drift guarded at the sibling layer
  // (Pass3CorrectionBanner.test.tsx explicitly asserts it does NOT use the
  // token).
  it('applies bg-violation-warn background utility per §5.5 line 367 + line 84 reserved-usage rule', () => {
    const { container } = render(<Pass3RaceBanner pass3={mockPass3} />);
    const banner = container.firstElementChild as HTMLElement;
    expect(banner).toHaveClass('bg-violation-warn');
  });

  it('applies text-text-primary text utility per §5.5 line 367', () => {
    render(<Pass3RaceBanner pass3={mockPass3} />);
    const message = screen.getByText(/Audit findings revised/);
    expect(message).toHaveClass('text-text-primary');
  });
});

describe('Pass3RaceBanner — outer surface (Card primitive composition)', () => {
  it('composes Card primitive (retains border-border-default; --violation-warn overrides surface background)', () => {
    const { container } = render(<Pass3RaceBanner pass3={mockPass3} />);
    const banner = container.firstElementChild as HTMLElement;
    expect(banner).toHaveClass('border');
    expect(banner).toHaveClass('border-border-default');
  });
});

// === Render-context-agnostic discipline (inherited verbatim from
// Pass3CorrectionBanner.test.tsx lines 132–151; Task 7.6 establishment).
// This is the EXERCISE point: Pass3RaceBanner is the first component to
// actually render in both default placement AND inside-Modal placement
// per Decision 36h, so the regression guard is load-bearing here in a way
// it was forward-looking for Pass3CorrectionBanner. ===

describe('Pass3RaceBanner — render-context-agnostic trust boundary (Decision 36h)', () => {
  it('renders identically standalone vs nested in a mock Modal-wrapper context', () => {
    // Standalone render (default placement above AnalystControlPanel, §5.5 line 367)
    const { container: standaloneContainer } = render(<Pass3RaceBanner pass3={mockPass3} />);
    const standaloneHTML = standaloneContainer.innerHTML;
    cleanup();

    // Nested render (inside-Modal placement, §5.5 line 369 — race condition
    // fires while Override modal is open; modal does NOT auto-close)
    const { container: nestedContainer } = render(
      <div data-testid="mock-modal">
        <Pass3RaceBanner pass3={mockPass3} />
      </div>,
    );
    const nestedBannerHTML = screen.getByTestId('mock-modal').innerHTML;

    expect(nestedBannerHTML).toBe(standaloneHTML);
  });
});

// === Anti-affordance regression guards (Decision 36h announcement-only;
// Finding 13 disposition — no severity chip; institutional-register
// spec-silence discipline). ===

describe('Pass3RaceBanner — anti-affordance regression guards', () => {
  it('renders NO <button> affordance (Decision 36h: announcement-only; modal does not auto-close)', () => {
    const { container } = render(<Pass3RaceBanner pass3={mockPass3} />);
    expect(container.querySelector('button')).toBeNull();
  });

  it('renders NO SVG (no decorative warning iconography; --violation-warn + verbatim message carry the signal)', () => {
    const { container } = render(<Pass3RaceBanner pass3={mockPass3} />);
    expect(container.querySelector('svg')).toBeNull();
  });

  // Finding 13 disposition: severity chip omitted entirely. Chip primitive's
  // closed status set {PASS, FAIL, QUALITY} doesn't include a token-aligned
  // variant for --violation-warn (QUALITY uses --status-warning-bg amber,
  // wrong color family). Visual_system.md §5.5 lines 366–369 don't name a
  // chip for this banner; the spec is silent on chip composition here, and
  // spec-silence-as-discipline rules omission.
  it('renders NO Chip composition (Finding 13 disposition: chip omitted; --violation-warn + message carry signal)', () => {
    const { container } = render(<Pass3RaceBanner pass3={mockPass3} />);
    // Chip primitive renders as <span class="inline-flex ... bg-{status|variant} ...">.
    // Test fixture: search for any element with one of Chip's spec-named
    // status / variant background classes.
    const chipBgClasses = [
      'bg-status-success-bg',
      'bg-violation-bg',
      'bg-status-warning-bg',
      'bg-accent-subtle-bg',
      'bg-surface-recessed',
    ];
    for (const cls of chipBgClasses) {
      expect(container.querySelector(`.${cls}`)).toBeNull();
    }
  });
});

// === Spec-silence regression guards (Card/Chip/Button/Tooltip/Modal/
// Skeleton/ChevronDisclosure/TierBadge/Pass3CorrectionBanner pattern,
// extended for the race banner). ===

describe('Pass3RaceBanner — spec-silence regression guards', () => {
  it('does NOT apply border-radius (institutional register)', () => {
    const { container } = render(<Pass3RaceBanner pass3={mockPass3} />);
    const banner = container.firstElementChild as HTMLElement;
    expect(banner.className).not.toMatch(/\brounded(-|\b)/);
  });

  it('does NOT apply transition or animate utilities (announcement-only state transition)', () => {
    const { container } = render(<Pass3RaceBanner pass3={mockPass3} />);
    const banner = container.firstElementChild as HTMLElement;
    expect(banner.className).not.toMatch(/transition|animate/);
  });

  it('does NOT apply hover utilities (banner is read, not pressed)', () => {
    const { container } = render(<Pass3RaceBanner pass3={mockPass3} />);
    const banner = container.firstElementChild as HTMLElement;
    expect(banner.className).not.toMatch(/hover:/);
  });
});
