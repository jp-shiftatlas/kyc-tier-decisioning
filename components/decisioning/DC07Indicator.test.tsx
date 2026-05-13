import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { DC07Indicator } from './DC07Indicator';

describe('DC07Indicator — §5.2 lines 263–271 (Decision 25 corollary)', () => {
  it('renders the DC-07 / NPC Advisory 2024-04 header', () => {
    render(<DC07Indicator structuredRecord prose />);
    expect(
      screen.getByText(/DC-07 — NPC Advisory 2024-04 dual satisfaction/),
    ).toBeInTheDocument();
  });

  it('renders the two spec-named labels: structured-record + prose-level', () => {
    render(<DC07Indicator structuredRecord prose />);
    expect(screen.getByText('structured-record')).toBeInTheDocument();
    expect(screen.getByText('prose-level')).toBeInTheDocument();
  });

  it('renders parenthetical hints from §5.2 lines 267–268', () => {
    render(<DC07Indicator structuredRecord prose />);
    expect(screen.getByText('(rule appears in rules_fired)')).toBeInTheDocument();
    expect(screen.getByText('(substantive audit_trail text)')).toBeInTheDocument();
  });
});

describe('DC07Indicator — boolean → chip status mapping', () => {
  it('both halves true → both chips PASS (status-success colors)', () => {
    render(<DC07Indicator structuredRecord prose />);
    expect(screen.getByText('structured-record')).toHaveClass('bg-status-success-bg');
    expect(screen.getByText('prose-level')).toHaveClass('bg-status-success-bg');
  });

  it('structuredRecord=false → first chip flips to FAIL (violation colors)', () => {
    render(<DC07Indicator structuredRecord={false} prose />);
    expect(screen.getByText('structured-record')).toHaveClass('bg-violation-bg');
    expect(screen.getByText('structured-record')).toHaveClass('text-violation-primary');
    expect(screen.getByText('prose-level')).toHaveClass('bg-status-success-bg');
  });

  it('prose=false → second chip flips to FAIL', () => {
    render(<DC07Indicator structuredRecord prose={false} />);
    expect(screen.getByText('structured-record')).toHaveClass('bg-status-success-bg');
    expect(screen.getByText('prose-level')).toHaveClass('bg-violation-bg');
    expect(screen.getByText('prose-level')).toHaveClass('text-violation-primary');
  });

  it('both halves false → both chips FAIL (negative regression case — normalizer bypass)', () => {
    render(<DC07Indicator structuredRecord={false} prose={false} />);
    expect(screen.getByText('structured-record')).toHaveClass('bg-violation-bg');
    expect(screen.getByText('prose-level')).toHaveClass('bg-violation-bg');
  });
});

describe('DC07Indicator — "don\'t collapse into a single chip" discipline (§5.2 line 271)', () => {
  it('renders two separate Chip instances, not one combined chip', () => {
    render(<DC07Indicator structuredRecord prose />);
    const labels = screen.getAllByText(/^(structured-record|prose-level)$/);
    expect(labels).toHaveLength(2);
  });
});
