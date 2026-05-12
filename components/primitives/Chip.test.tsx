import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { Chip } from './Chip';

describe('Chip — §5.2 status mapping (line 243)', () => {
  it('status="PASS" → --status-success-bg + --status-success', () => {
    render(<Chip status="PASS">PASS</Chip>);
    expect(screen.getByText('PASS')).toHaveClass('bg-status-success-bg');
    expect(screen.getByText('PASS')).toHaveClass('text-status-success');
  });

  it('status="FAIL" → --violation-bg + --violation-primary', () => {
    render(<Chip status="FAIL">FAIL</Chip>);
    expect(screen.getByText('FAIL')).toHaveClass('bg-violation-bg');
    expect(screen.getByText('FAIL')).toHaveClass('text-violation-primary');
  });

  it('status="QUALITY" → --status-warning-bg + --status-warning (quality flags only)', () => {
    render(<Chip status="QUALITY">QUALITY</Chip>);
    expect(screen.getByText('QUALITY')).toHaveClass('bg-status-warning-bg');
    expect(screen.getByText('QUALITY')).toHaveClass('text-status-warning');
  });
});

describe('Chip — non-status variants', () => {
  it('variant="accent" → --accent-subtle-bg + --accent-deep (§5.2 violation-categories family)', () => {
    render(<Chip variant="accent">FUNDING_SOURCE</Chip>);
    expect(screen.getByText('FUNDING_SOURCE')).toHaveClass('bg-accent-subtle-bg');
    expect(screen.getByText('FUNDING_SOURCE')).toHaveClass('text-accent-deep');
  });

  it('no props → neutral default (§5.1 category breakdown chips)', () => {
    render(<Chip>identity_verification</Chip>);
    const el = screen.getByText('identity_verification');
    expect(el).toHaveClass('bg-surface-recessed');
    expect(el).toHaveClass('text-text-secondary');
  });

  it('passes className through for composition-layer overrides', () => {
    render(<Chip status="PASS" className="ml-2 uppercase">PASS</Chip>);
    const el = screen.getByText('PASS');
    expect(el).toHaveClass('ml-2');
    expect(el).toHaveClass('uppercase');
  });
});

describe('Chip — spec-silence regression guards (Task 6.2 finding pattern)', () => {
  it('has no border-radius — spec silent on chip corners, institutional register defaults flat', () => {
    render(<Chip status="PASS">PASS</Chip>);
    expect(screen.getByText('PASS').className).not.toMatch(/\brounded(-|\b)/);
  });

  it('has no hover-state affordance — chips are read, not pressed', () => {
    render(<Chip status="FAIL">FAIL</Chip>);
    expect(screen.getByText('FAIL').className).not.toMatch(/\bhover:/);
  });

  it('has no drop shadow — visual_system.md does not name shadow on chips', () => {
    render(<Chip status="QUALITY">QUALITY</Chip>);
    expect(screen.getByText('QUALITY').className).not.toMatch(/\bshadow(-|\b)/);
  });

  it('has no transition or animation — §6 line 464 reserves animation for state changes', () => {
    render(<Chip status="PASS">PASS</Chip>);
    const className = screen.getByText('PASS').className;
    expect(className).not.toMatch(/\btransition(-|\b)/);
    expect(className).not.toMatch(/\banimate-/);
  });
});
