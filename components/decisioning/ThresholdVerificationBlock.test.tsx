import { describe, it, expect } from 'vitest';
import { render, screen } from '@testing-library/react';
import { ThresholdVerificationBlock } from './ThresholdVerificationBlock';
import type { AuditCheck } from '@/lib/schemas/pass2';

const passCheck: AuditCheck = {
  rule_id: 'TE-05',
  check_type: 'numeric_threshold_verification',
  status: 'pass',
  severity: null,
  profile_value: 'PHP 850,000',
  rule_threshold: 'PHP 500,000',
  comparison_result: '850,000 ≥ 500,000',
  evidence_note: 'TE-05 fires — monthly volume exceeds threshold.',
};

const failCheck: AuditCheck = {
  rule_id: 'TE-05',
  check_type: 'numeric_threshold_verification',
  status: 'fail',
  severity: 'material',
  profile_value: 'PHP 100,000',
  rule_threshold: 'PHP 500,000',
  comparison_result: '100,000 < 500,000',
  evidence_note: 'TE-05 does not fire.',
};

describe('ThresholdVerificationBlock — §5.2 lines 247–261 (Decision 23 "show the math")', () => {
  it('renders rule_id + numeric_threshold_verification label', () => {
    render(<ThresholdVerificationBlock check={passCheck} />);
    expect(screen.getByText(/TE-05 numeric_threshold_verification/)).toBeInTheDocument();
  });

  it('renders the three spec-named field labels', () => {
    render(<ThresholdVerificationBlock check={passCheck} />);
    expect(screen.getByText('profile_value:')).toBeInTheDocument();
    expect(screen.getByText('rule_threshold:')).toBeInTheDocument();
    expect(screen.getByText('comparison_result:')).toBeInTheDocument();
  });

  it('renders PHP amounts verbatim from check fields', () => {
    render(<ThresholdVerificationBlock check={passCheck} />);
    expect(screen.getByText('PHP 850,000')).toBeInTheDocument();
    expect(screen.getByText('PHP 500,000')).toBeInTheDocument();
  });

  it('renders comparison_result verbatim from check field', () => {
    render(<ThresholdVerificationBlock check={passCheck} />);
    expect(screen.getByText('850,000 ≥ 500,000')).toBeInTheDocument();
  });
});

describe('ThresholdVerificationBlock — status derivation from check.status', () => {
  it('renders → PASS in --status-success color when status=pass', () => {
    render(<ThresholdVerificationBlock check={passCheck} />);
    const status = screen.getByText('→ PASS');
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass('text-status-success');
  });

  it('renders → FAIL in --violation-primary color when status=fail', () => {
    render(<ThresholdVerificationBlock check={failCheck} />);
    const status = screen.getByText('→ FAIL');
    expect(status).toBeInTheDocument();
    expect(status).toHaveClass('text-violation-primary');
  });
});

describe('ThresholdVerificationBlock — visual treatment (§5.2 line 261)', () => {
  it('uses mono font (§5.2 line 259 "Mono font for the values")', () => {
    render(<ThresholdVerificationBlock check={passCheck} />);
    expect(screen.getByTestId('threshold-block')).toHaveClass('font-mono');
  });

  it('uses --border-default border (§5.2 line 261)', () => {
    render(<ThresholdVerificationBlock check={passCheck} />);
    const block = screen.getByTestId('threshold-block');
    expect(block).toHaveClass('border');
    expect(block).toHaveClass('border-border-default');
  });

  it('uses --surface-elevated background', () => {
    render(<ThresholdVerificationBlock check={passCheck} />);
    expect(screen.getByTestId('threshold-block')).toHaveClass('bg-surface-elevated');
  });

  it('PHP amounts have tabular-nums for column alignment (§5.2 line 259)', () => {
    render(<ThresholdVerificationBlock check={passCheck} />);
    expect(screen.getByText('PHP 850,000')).toHaveClass('tabular-nums');
    expect(screen.getByText('PHP 500,000')).toHaveClass('tabular-nums');
  });
});

describe('ThresholdVerificationBlock — null defense', () => {
  it('renders em-dash for null profile_value', () => {
    const nullCheck: AuditCheck = { ...passCheck, profile_value: null };
    render(<ThresholdVerificationBlock check={nullCheck} />);
    expect(screen.getByText('—')).toBeInTheDocument();
  });

  it('renders em-dash for null comparison_result', () => {
    const nullCheck: AuditCheck = { ...passCheck, comparison_result: null };
    render(<ThresholdVerificationBlock check={nullCheck} />);
    // profile_value + rule_threshold are still present; comparison_result is the dash
    const dashes = screen.getAllByText('—');
    expect(dashes.length).toBeGreaterThanOrEqual(1);
  });
});

describe('ThresholdVerificationBlock — numeric value formatting via formatPhp', () => {
  it('formats numeric profile_value through formatPhp() with PHP prefix + thousands separator', () => {
    const numericCheck: AuditCheck = { ...passCheck, profile_value: 850000 };
    render(<ThresholdVerificationBlock check={numericCheck} />);
    expect(screen.getByText('PHP 850,000')).toBeInTheDocument();
  });
});
