import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { TabularNumber } from './TabularNumber';

describe('TabularNumber — §3 type discipline (tabular figures)', () => {
  it('renders the value', () => {
    render(<TabularNumber value="850,000" />);
    expect(screen.getByText('850,000')).toBeInTheDocument();
  });

  it('applies tabular-nums utility (CSS font-variant-numeric: tabular-nums)', () => {
    render(<TabularNumber value="850,000" />);
    expect(screen.getByText('850,000')).toHaveClass('tabular-nums');
  });

  it('applies font-numeric utility (paired with tabular-nums per globals.css)', () => {
    render(<TabularNumber value="850,000" />);
    expect(screen.getByText('850,000')).toHaveClass('font-numeric');
  });

  it('passes className through for composition-layer sizing/coloring', () => {
    render(<TabularNumber value="2.3s" className="text-sm text-text-tertiary" />);
    const el = screen.getByText('2.3s');
    expect(el).toHaveClass('text-sm');
    expect(el).toHaveClass('text-text-tertiary');
  });
});

describe('TabularNumber — spec-silence regression guards', () => {
  it('no border-radius — TabularNumber is inline text, not a surface', () => {
    render(<TabularNumber value="100" />);
    expect(screen.getByText('100').className).not.toMatch(/\brounded(-|\b)/);
  });

  it('no transition or animation — static numeric display', () => {
    render(<TabularNumber value="100" />);
    const className = screen.getByText('100').className;
    expect(className).not.toMatch(/\btransition(-|\b)/);
    expect(className).not.toMatch(/\banimate-/);
  });
});
