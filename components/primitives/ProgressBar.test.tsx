import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ProgressBar } from './ProgressBar';

describe('ProgressBar — §5.8 line 433 spec contract', () => {
  it('renders fill bar with width = progress%', () => {
    render(<ProgressBar progress={42} />);
    expect(screen.getByTestId('progress-bar-fill')).toHaveStyle({ width: '42%' });
  });

  it('fill bar uses --accent-primary background', () => {
    render(<ProgressBar progress={50} />);
    expect(screen.getByTestId('progress-bar-fill')).toHaveClass('bg-accent-primary');
  });

  it('track uses --surface-recessed background', () => {
    const { container } = render(<ProgressBar progress={50} />);
    expect(container.firstElementChild).toHaveClass('bg-surface-recessed');
  });

  it('is thin (h-0.5 = 2px) per §5.8 "thin progress bar"', () => {
    const { container } = render(<ProgressBar progress={50} />);
    expect(container.firstElementChild).toHaveClass('h-0.5');
  });
});

describe('ProgressBar — clamping defends against caller bugs', () => {
  it('clamps negative values to 0%', () => {
    render(<ProgressBar progress={-25} />);
    expect(screen.getByTestId('progress-bar-fill')).toHaveStyle({ width: '0%' });
  });

  it('clamps >100 values to 100%', () => {
    render(<ProgressBar progress={150} />);
    expect(screen.getByTestId('progress-bar-fill')).toHaveStyle({ width: '100%' });
  });
});

describe('ProgressBar — motion (width transition is SPEC-INTENDED, not theater)', () => {
  it('fill has transition-[width] for smooth progress motion per §5.8 "Simulated loading"', () => {
    render(<ProgressBar progress={50} />);
    const fill = screen.getByTestId('progress-bar-fill');
    expect(fill.className).toMatch(/transition-\[width\]/);
  });
});

describe('ProgressBar — spec-silence regression guards', () => {
  it('track has no border-radius', () => {
    const { container } = render(<ProgressBar progress={50} />);
    expect(container.firstElementChild!.className).not.toMatch(/\brounded(-|\b)/);
  });

  it('fill has no border-radius', () => {
    render(<ProgressBar progress={50} />);
    expect(screen.getByTestId('progress-bar-fill').className).not.toMatch(/\brounded(-|\b)/);
  });

  it('fill has no animate-* utilities (transition-[width] is the only motion)', () => {
    render(<ProgressBar progress={50} />);
    expect(screen.getByTestId('progress-bar-fill').className).not.toMatch(/\banimate-/);
  });

  it('no drop shadow', () => {
    const { container } = render(<ProgressBar progress={50} />);
    expect(container.firstElementChild!.className).not.toMatch(/\bshadow(-|\b)/);
    expect(screen.getByTestId('progress-bar-fill').className).not.toMatch(/\bshadow(-|\b)/);
  });
});
