import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act } from '@testing-library/react';
import { PassHeadline } from './PassHeadline';
import { ElapsedTimeIndicator } from './ElapsedTimeIndicator';

describe('PassHeadline — Decision 41 S3 persistent section label', () => {
  // Labels updated per JP Batch 12 Screen 3 feedback. Decision 41 S3
  // canonical names superseded by visitor-facing labels that distinguish
  // the audit and re-audit Pass 2 calls without repeating the suffix.
  it('renders "Pass 1 — Recommendation" for variant=recommendation', () => {
    render(<PassHeadline pass={1} variant="recommendation" />);
    expect(screen.getByText('Pass 1 — Recommendation')).toBeInTheDocument();
  });

  it('renders "Pass 2 — Re-check Pass 1" for variant=audit', () => {
    render(<PassHeadline pass={2} variant="audit" />);
    expect(screen.getByText('Pass 2 — Re-check Pass 1')).toBeInTheDocument();
  });

  it('renders "Pass 3 — Correction" for variant=correction', () => {
    render(<PassHeadline pass={3} variant="correction" />);
    expect(screen.getByText('Pass 3 — Correction')).toBeInTheDocument();
  });

  it('renders "Pass 2 — Re-check Pass 1 (after correction)" for variant=reaudit', () => {
    render(<PassHeadline pass={2} variant="reaudit" />);
    expect(screen.getByText('Pass 2 — Re-check Pass 1 (after correction)')).toBeInTheDocument();
  });

  it('uses h2 semantic element with --text-lg semibold --text-primary --font-sans', () => {
    render(<PassHeadline pass={2} variant="audit" />);
    const heading = screen.getByRole('heading', { level: 2 });
    expect(heading).toHaveClass('text-lg');
    expect(heading).toHaveClass('font-semibold');
    expect(heading).toHaveClass('text-text-primary');
    expect(heading).toHaveClass('font-sans');
  });
});

describe('ElapsedTimeIndicator — Decision 41 S1 500ms threshold (live-mode-only)', () => {
  afterEach(() => vi.useRealTimers());

  it('renders nothing before 500ms threshold even when live=true', () => {
    vi.useFakeTimers();
    const start = Date.now();
    render(<ElapsedTimeIndicator startedAt={start} live />);
    act(() => {
      vi.advanceTimersByTime(300);
    });
    expect(screen.queryByText(/elapsed/)).not.toBeInTheDocument();
  });

  it('renders elapsed-time format after 500ms threshold', () => {
    vi.useFakeTimers();
    const start = Date.now();
    render(<ElapsedTimeIndicator startedAt={start} live />);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.getByText(/elapsed/)).toBeInTheDocument();
  });

  it('renders nothing in persona-playback mode (live=false) regardless of elapsed time', () => {
    render(<ElapsedTimeIndicator startedAt={Date.now() - 5000} live={false} />);
    expect(screen.queryByText(/elapsed/)).not.toBeInTheDocument();
  });

  it('uses tabular-nums for digit-stable display via TabularNumber primitive', () => {
    vi.useFakeTimers();
    const start = Date.now();
    render(<ElapsedTimeIndicator startedAt={start} live />);
    act(() => {
      vi.advanceTimersByTime(800);
    });
    const indicator = screen.getByText(/elapsed/);
    expect(indicator).toHaveClass('tabular-nums');
  });
});
