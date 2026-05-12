import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Tooltip } from './Tooltip';

describe('Tooltip — §5.6 line 400 trigger model (hover OR focus, NOT click)', () => {
  it('content is hidden by default', () => {
    render(<Tooltip content="FATF R.12"><span>?</span></Tooltip>);
    expect(screen.queryByText('FATF R.12')).not.toBeInTheDocument();
  });

  it('hover (mouseenter) shows the tooltip', () => {
    render(<Tooltip content="FATF R.12"><span>?</span></Tooltip>);
    fireEvent.mouseEnter(screen.getByText('?').parentElement!);
    expect(screen.getByText('FATF R.12')).toBeInTheDocument();
  });

  it('mouseleave hides the tooltip', () => {
    render(<Tooltip content="FATF R.12"><span>?</span></Tooltip>);
    const trigger = screen.getByText('?').parentElement!;
    fireEvent.mouseEnter(trigger);
    fireEvent.mouseLeave(trigger);
    expect(screen.queryByText('FATF R.12')).not.toBeInTheDocument();
  });

  it('focus shows the tooltip (keyboard accessibility)', () => {
    render(<Tooltip content="MORB §923"><button>?</button></Tooltip>);
    fireEvent.focus(screen.getByText('?'));
    expect(screen.getByText('MORB §923')).toBeInTheDocument();
  });

  it('blur hides the tooltip', () => {
    render(<Tooltip content="MORB §923"><button>?</button></Tooltip>);
    fireEvent.focus(screen.getByText('?'));
    fireEvent.blur(screen.getByText('?'));
    expect(screen.queryByText('MORB §923')).not.toBeInTheDocument();
  });

  it('click does NOT trigger the tooltip — spec excludes click', () => {
    render(<Tooltip content="FATF R.12"><span>?</span></Tooltip>);
    fireEvent.click(screen.getByText('?'));
    expect(screen.queryByText('FATF R.12')).not.toBeInTheDocument();
  });
});

describe('Tooltip — §5.6 lines 403–404 visual treatment', () => {
  it('renders content in --surface-elevated bordered box with --text-sm + --text-secondary', () => {
    render(<Tooltip content="citation"><button>?</button></Tooltip>);
    fireEvent.focus(screen.getByText('?'));
    const tooltip = screen.getByRole('tooltip');
    expect(tooltip).toHaveClass('bg-surface-elevated');
    expect(tooltip).toHaveClass('border');
    expect(tooltip).toHaveClass('border-border-default');
    expect(tooltip).toHaveClass('text-sm');
    expect(tooltip).toHaveClass('text-text-secondary');
  });
});

describe('Tooltip — accessibility', () => {
  it('uses role="tooltip" on content element', () => {
    render(<Tooltip content="citation"><button>?</button></Tooltip>);
    fireEvent.focus(screen.getByText('?'));
    expect(screen.getByRole('tooltip')).toBeInTheDocument();
  });

  it('links trigger to content via aria-describedby when open', () => {
    render(<Tooltip content="citation"><button>?</button></Tooltip>);
    const trigger = screen.getByText('?').parentElement!;
    expect(trigger).not.toHaveAttribute('aria-describedby');
    fireEvent.focus(screen.getByText('?'));
    const tooltip = screen.getByRole('tooltip');
    expect(trigger).toHaveAttribute('aria-describedby', tooltip.id);
  });
});

describe('Tooltip — spec-silence regression guards (Card/Chip/Button pattern)', () => {
  it('has no border-radius — spec silent on tooltip corners', () => {
    render(<Tooltip content="citation"><button>?</button></Tooltip>);
    fireEvent.focus(screen.getByText('?'));
    expect(screen.getByRole('tooltip').className).not.toMatch(/\brounded(-|\b)/);
  });

  it('has no drop shadow — spec says "bordered box"; border is the elevation cue', () => {
    render(<Tooltip content="citation"><button>?</button></Tooltip>);
    fireEvent.focus(screen.getByText('?'));
    expect(screen.getByRole('tooltip').className).not.toMatch(/\bshadow(-|\b)/);
  });

  it('has no transition or animation — institutional register, immediate appear', () => {
    render(<Tooltip content="citation"><button>?</button></Tooltip>);
    fireEvent.focus(screen.getByText('?'));
    const className = screen.getByRole('tooltip').className;
    expect(className).not.toMatch(/\banimate-/);
    expect(className).not.toMatch(/\btransition(-|\b)/);
  });
});
