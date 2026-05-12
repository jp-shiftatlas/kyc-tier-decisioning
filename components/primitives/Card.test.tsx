import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Card } from './Card';

describe('Card', () => {
  it('applies 24px internal padding (visual_system.md §4)', () => {
    render(<Card><span>content</span></Card>);
    expect(screen.getByText('content').parentElement).toHaveClass('p-6');
  });

  it('defaults to elevated surface (§5.1 / §5.5 / §5.6 — white card surface)', () => {
    render(<Card><span>x</span></Card>);
    expect(screen.getByText('x').parentElement).toHaveClass('bg-surface-elevated');
  });

  it('applies recessed surface for §5.4 architecture-strip side boxes', () => {
    render(<Card variant="recessed"><span>x</span></Card>);
    expect(screen.getByText('x').parentElement).toHaveClass('bg-surface-recessed');
  });

  it('applies --border-default warm-grey border (§2 token + §5.4 usage)', () => {
    render(<Card><span>x</span></Card>);
    const el = screen.getByText('x').parentElement!;
    expect(el).toHaveClass('border');
    expect(el).toHaveClass('border-border-default');
  });

  it('passes className through for composition-layer overrides', () => {
    render(<Card className="my-4 max-w-2xl"><span>x</span></Card>);
    const el = screen.getByText('x').parentElement!;
    expect(el).toHaveClass('my-4');
    expect(el).toHaveClass('max-w-2xl');
  });

  it('has no border-radius — institutional register, crisp 90° corners', () => {
    render(<Card><span>x</span></Card>);
    const el = screen.getByText('x').parentElement!;
    expect(el.className).not.toMatch(/\brounded(-|\b)/);
  });
});
