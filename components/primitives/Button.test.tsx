import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { Button } from './Button';

describe('Button — §5.5 / §5.6 variant mapping', () => {
  it('default (primary) → §5.5 Approve / §5.6 Submit treatment', () => {
    render(<Button>Run three-pass analysis</Button>);
    const el = screen.getByRole('button');
    expect(el).toHaveClass('bg-accent-primary');
    expect(el).toHaveClass('text-text-inverse');
    expect(el.className).toMatch(/\bhover:bg-accent-secondary\b/); // §2 line 92 contract
  });

  it('outline → §5.5 Escalate treatment (--accent-primary border + text, transparent fill)', () => {
    render(<Button variant="outline">Escalate</Button>);
    const el = screen.getByRole('button');
    expect(el).toHaveClass('border');
    expect(el).toHaveClass('border-accent-primary');
    expect(el).toHaveClass('text-accent-primary');
    expect(el).toHaveClass('bg-transparent');
    expect(el.className).toMatch(/\bhover:bg-surface-recessed\b/); // §2 line 92 non-accent shift
  });

  it('subtle → §5.5 Override treatment (--text-secondary border + text, NOT --border-default)', () => {
    render(<Button variant="subtle">Override</Button>);
    const el = screen.getByRole('button');
    expect(el).toHaveClass('border');
    expect(el).toHaveClass('border-text-secondary');
    expect(el).toHaveClass('text-text-secondary');
    expect(el).toHaveClass('bg-transparent');
    expect(el.className).toMatch(/\bhover:bg-surface-recessed\b/);
  });
});

describe('Button — disabled state (§5.5 line 362)', () => {
  it('disabled prop applies opacity-50 + cursor-not-allowed (post-action spec)', () => {
    render(<Button disabled>Approve</Button>);
    const el = screen.getByRole('button');
    expect(el).toBeDisabled();
    expect(el.className).toMatch(/\bdisabled:opacity-50\b/);
    expect(el.className).toMatch(/\bdisabled:cursor-not-allowed\b/);
  });
});

describe('Button — interactive behavior', () => {
  it('fires onClick when clicked', () => {
    const fn = vi.fn();
    render(<Button onClick={fn}>x</Button>);
    fireEvent.click(screen.getByRole('button'));
    expect(fn).toHaveBeenCalledTimes(1);
  });

  it('passes className through for composition-layer overrides', () => {
    render(<Button className="w-full md:w-auto">Submit</Button>);
    const el = screen.getByRole('button');
    expect(el).toHaveClass('w-full');
    expect(el).toHaveClass('md:w-auto');
  });
});

describe('Button — focus ring (derived under spec silence; keyboard-only)', () => {
  it('renders focus-visible 2px --accent-primary outline with 2px offset', () => {
    render(<Button>x</Button>);
    const className = screen.getByRole('button').className;
    expect(className).toMatch(/\bfocus-visible:outline-2\b/);
    expect(className).toMatch(/\bfocus-visible:outline-offset-2\b/);
    expect(className).toMatch(/\bfocus-visible:outline-accent-primary\b/);
  });
});

describe('Button — spec-silence regression guards (Card/Chip pattern expanded)', () => {
  it('has no border-radius — spec silent on button corner radius', () => {
    render(<Button>x</Button>);
    expect(screen.getByRole('button').className).not.toMatch(/\brounded(-|\b)/);
  });

  it('has no drop shadow — spec does not name shadow on buttons', () => {
    render(<Button>x</Button>);
    expect(screen.getByRole('button').className).not.toMatch(/\bshadow(-|\b)/);
  });

  it('has no scale or transform on hover — institutional hover, not consumer-app', () => {
    render(<Button>x</Button>);
    const className = screen.getByRole('button').className;
    expect(className).not.toMatch(/\bscale-/);
    expect(className).not.toMatch(/\btransform\b/);
    expect(className).not.toMatch(/\bhover:scale-/);
    expect(className).not.toMatch(/\bhover:translate-/);
  });

  it('has no slide/fade/spin animations — only transition-colors per §6 line 464', () => {
    render(<Button>x</Button>);
    const className = screen.getByRole('button').className;
    // transition-colors is spec-allowed; animate-* utilities are not.
    expect(className).not.toMatch(/\banimate-/);
  });
});
