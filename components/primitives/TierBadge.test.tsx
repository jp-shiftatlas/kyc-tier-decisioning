import { describe, it, expect } from 'vitest';
import { render } from '@testing-library/react';
import { TierBadge } from './TierBadge';

describe('TierBadge — positive rendering (§5.1 line 221)', () => {
  it('renders SDD tier label', () => {
    const { container } = render(<TierBadge tier="SDD" />);
    expect(container.textContent).toBe('SDD');
  });

  it('renders Standard tier label', () => {
    const { container } = render(<TierBadge tier="Standard" />);
    expect(container.textContent).toBe('Standard');
  });

  it('renders EDD tier label', () => {
    const { container } = render(<TierBadge tier="EDD" />);
    expect(container.textContent).toBe('EDD');
  });

  it('applies --accent-subtle-bg background utility per §5.1 line 221', () => {
    const { container } = render(<TierBadge tier="EDD" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge).toHaveClass('bg-accent-subtle-bg');
  });

  it('applies --accent-deep text utility per §5.1 line 221', () => {
    const { container } = render(<TierBadge tier="EDD" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge).toHaveClass('text-accent-deep');
  });

  it('applies mono font utility per §5.1 line 221', () => {
    const { container } = render(<TierBadge tier="EDD" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge).toHaveClass('font-mono');
  });

  it('applies large text-size utility per §5.1 "large, prominent visual treatment"', () => {
    const { container } = render(<TierBadge tier="EDD" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge).toHaveClass('text-lg');
  });
});

describe('TierBadge — className passthrough (composition-layer override hatch)', () => {
  it('appends caller-supplied className without dropping primitive classes', () => {
    const { container } = render(<TierBadge tier="Standard" className="ml-4" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge).toHaveClass('ml-4');
    expect(badge).toHaveClass('bg-accent-subtle-bg');
    expect(badge).toHaveClass('font-mono');
  });
});

// === Spec-silence-as-discipline regression guards (Batch 6 methodology) ===
//
// visual_system.md §5.1 line 221 names background, text color, and mono font.
// It is SILENT on border-radius, hover treatment, and transition / animation.
// Per the spec-silence-as-discipline framework (Batch 6 synthesis doc), each
// silence becomes a does-not-contain regression guard against the className —
// the negative assertion turns silence into a checkable constraint that
// resists future drift toward consumer-app badge aesthetics.

describe('TierBadge — spec-silence-as-discipline regression guards', () => {
  it('does NOT apply any border-radius utility (institutional register; Card/Chip discipline)', () => {
    const { container } = render(<TierBadge tier="EDD" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).not.toMatch(/\brounded(-|\b)/);
  });

  it('does NOT apply any hover utility (badges are read, not pressed)', () => {
    const { container } = render(<TierBadge tier="EDD" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).not.toMatch(/hover:/);
  });

  it('does NOT apply any transition or animate utility (badges appear, they do not motion)', () => {
    const { container } = render(<TierBadge tier="EDD" />);
    const badge = container.firstElementChild as HTMLElement;
    expect(badge.className).not.toMatch(/transition|animate/);
  });
});
