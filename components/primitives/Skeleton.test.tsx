import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Skeleton } from './Skeleton';

describe('Skeleton — §5.8 line 434 spec contract', () => {
  it('renders with --surface-recessed background', () => {
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton')).toHaveClass('bg-surface-recessed');
  });

  it('passes className through for composition-layer sizing', () => {
    render(<Skeleton className="h-4 w-full" />);
    const el = screen.getByTestId('skeleton');
    expect(el).toHaveClass('h-4');
    expect(el).toHaveClass('w-full');
  });
});

describe('Skeleton — institutional discipline (highest AI-slop drift risk per JP)', () => {
  it('has NO animate-pulse — consumer-app shimmer, not institutional', () => {
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton').className).not.toMatch(/\banimate-pulse\b/);
  });

  it('has NO animate-* utilities at all (no pulse, no shimmer, no ping)', () => {
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton').className).not.toMatch(/\banimate-/);
  });

  it('has no border-radius — Card/Chip/Button/Tooltip/Modal discipline', () => {
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton').className).not.toMatch(/\brounded(-|\b)/);
  });

  it('has no gradient classes — no bg-gradient-*, no from-/to- utilities', () => {
    render(<Skeleton />);
    const className = screen.getByTestId('skeleton').className;
    expect(className).not.toMatch(/\bbg-gradient-/);
    expect(className).not.toMatch(/\bfrom-/);
    expect(className).not.toMatch(/\bto-(?!\d)/); // to- prefix, not to-N spacing
  });

  it('has no opacity-* or transition-opacity — no fade theater', () => {
    render(<Skeleton />);
    const className = screen.getByTestId('skeleton').className;
    expect(className).not.toMatch(/\btransition-opacity\b/);
    expect(className).not.toMatch(/\bopacity-/);
  });

  it('has no transition-* utilities of any kind', () => {
    render(<Skeleton />);
    expect(screen.getByTestId('skeleton').className).not.toMatch(/\btransition(-|\b)/);
  });
});
