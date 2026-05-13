import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ChevronDisclosure } from './ChevronDisclosure';

describe('ChevronDisclosure — trigger behavior', () => {
  it('renders label text', () => {
    render(<ChevronDisclosure label="Why this tier" open={false} onToggle={() => {}} />);
    expect(screen.getByText('Why this tier')).toBeInTheDocument();
  });

  it('calls onToggle(true) when closed and clicked', () => {
    const fn = vi.fn();
    render(<ChevronDisclosure label="More" open={false} onToggle={fn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalledWith(true);
  });

  it('calls onToggle(false) when open and clicked', () => {
    const fn = vi.fn();
    render(<ChevronDisclosure label="More" open onToggle={fn} />);
    fireEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalledWith(false);
  });
});

describe('ChevronDisclosure — WAI-ARIA APG disclosure pattern (https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/)', () => {
  it('uses native button element (auto keyboard activation Enter + Space)', () => {
    render(<ChevronDisclosure label="x" open={false} onToggle={() => {}} />);
    expect(screen.getByRole('button')).toBeInTheDocument();
  });

  it('aria-expanded reflects current state (false when closed)', () => {
    render(<ChevronDisclosure label="x" open={false} onToggle={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'false');
  });

  it('aria-expanded reflects current state (true when open)', () => {
    render(<ChevronDisclosure label="x" open onToggle={() => {}} />);
    expect(screen.getByRole('button')).toHaveAttribute('aria-expanded', 'true');
  });

  it('chevron icon has aria-hidden="true" — decorative, not announced to AT', () => {
    render(<ChevronDisclosure label="x" open={false} onToggle={() => {}} />);
    expect(screen.getByTestId('chevron-icon')).toHaveAttribute('aria-hidden', 'true');
  });
});

describe('ChevronDisclosure — chevron rotation (functional state indication)', () => {
  it('chevron has rotate-0 class when closed (points right)', () => {
    render(<ChevronDisclosure label="x" open={false} onToggle={() => {}} />);
    expect(screen.getByTestId('chevron-icon')).toHaveClass('rotate-0');
  });

  it('chevron has rotate-90 class when open (points down)', () => {
    render(<ChevronDisclosure label="x" open onToggle={() => {}} />);
    expect(screen.getByTestId('chevron-icon')).toHaveClass('rotate-90');
  });
});

describe('ChevronDisclosure — typography (§2 tokens)', () => {
  it('uses --text-secondary text color + --font-sans + --text-sm', () => {
    render(<ChevronDisclosure label="x" open={false} onToggle={() => {}} />);
    const button = screen.getByRole('button');
    expect(button).toHaveClass('text-text-secondary');
    expect(button).toHaveClass('font-sans');
    expect(button).toHaveClass('text-sm');
  });
});

describe('ChevronDisclosure — focus ring (Button-pattern derivation)', () => {
  it('renders focus-visible 2px --accent-primary outline with 2px offset', () => {
    render(<ChevronDisclosure label="x" open={false} onToggle={() => {}} />);
    const className = screen.getByRole('button').className;
    expect(className).toMatch(/\bfocus-visible:outline-2\b/);
    expect(className).toMatch(/\bfocus-visible:outline-offset-2\b/);
    expect(className).toMatch(/\bfocus-visible:outline-accent-primary\b/);
  });
});

describe('ChevronDisclosure — spec-silence regression guards', () => {
  it('no transition on chevron (rotation is instantaneous, not animated)', () => {
    render(<ChevronDisclosure label="x" open={false} onToggle={() => {}} />);
    // SVG.className is SVGAnimatedString; use getAttribute for raw string.
    expect(screen.getByTestId('chevron-icon').getAttribute('class') ?? '').not.toMatch(/\btransition(-|\b)/);
  });

  it('no animate-* on chevron', () => {
    render(<ChevronDisclosure label="x" open={false} onToggle={() => {}} />);
    expect(screen.getByTestId('chevron-icon').getAttribute('class') ?? '').not.toMatch(/\banimate-/);
  });

  it('no border-radius on button or chevron', () => {
    render(<ChevronDisclosure label="x" open={false} onToggle={() => {}} />);
    expect(screen.getByRole('button').className).not.toMatch(/\brounded(-|\b)/);
    expect(screen.getByTestId('chevron-icon').getAttribute('class') ?? '').not.toMatch(/\brounded(-|\b)/);
  });

  it('no shadow', () => {
    render(<ChevronDisclosure label="x" open={false} onToggle={() => {}} />);
    expect(screen.getByRole('button').className).not.toMatch(/\bshadow(-|\b)/);
  });
});

describe('ChevronDisclosure — className passthrough', () => {
  it('passes className through for composition-layer overrides', () => {
    render(<ChevronDisclosure label="x" open={false} onToggle={() => {}} className="mt-2" />);
    expect(screen.getByRole('button')).toHaveClass('mt-2');
  });
});
