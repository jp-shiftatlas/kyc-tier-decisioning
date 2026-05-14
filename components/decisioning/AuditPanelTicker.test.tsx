import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, cleanup } from '@testing-library/react';
import { AuditPanelTicker } from './AuditPanelTicker';
import { loadPersona } from '@/lib/schemas/personaAdapters';
import type { Pass2Output } from '@/lib/schemas/pass2';

afterEach(() => {
  cleanup();
  vi.useRealTimers();
});

// Fixtures — real schema-validated Pass 2 outputs. Maria locks PASS clean
// (Decision 27); its check array is the animation substrate.
const mariaPass2: Pass2Output = loadPersona('maria').pass_2;
const carlosPass2: Pass2Output = loadPersona('carlos').pass_2;
const emptyChecksPass2: Pass2Output = { ...mariaPass2, checks: [] };

const revealedCount = (): number =>
  Number(screen.getByTestId('audit-panel-ticker').getAttribute('data-revealed-count'));

describe('AuditPanelTicker — Decision 41a per-check reveal cadence', () => {
  it('ticks revealedCount 0 → checks.length at the default 100ms cadence', () => {
    vi.useFakeTimers();
    const total = mariaPass2.checks.length;
    expect(total).toBeGreaterThan(2); // sanity: Maria has a non-trivial check set

    render(<AuditPanelTicker pass2={mariaPass2} shouldAnimate />);
    // shouldAnimate=true → starts at 0.
    expect(revealedCount()).toBe(0);

    act(() => vi.advanceTimersByTime(100));
    expect(revealedCount()).toBe(1);

    act(() => vi.advanceTimersByTime(100));
    expect(revealedCount()).toBe(2);

    // Advance past the full reveal — settles at total, no overshoot.
    act(() => vi.advanceTimersByTime(100 * total));
    expect(revealedCount()).toBe(total);
  });

  it('honors a custom cadenceMs', () => {
    vi.useFakeTimers();
    render(<AuditPanelTicker pass2={mariaPass2} shouldAnimate cadenceMs={250} />);
    expect(revealedCount()).toBe(0);
    // Nothing at 100ms — the cadence is 250ms.
    act(() => vi.advanceTimersByTime(100));
    expect(revealedCount()).toBe(0);
    act(() => vi.advanceTimersByTime(150));
    expect(revealedCount()).toBe(1);
  });

  it('100ms cadence holds regardless of when audit data arrives (spec-silence-as-discipline)', () => {
    // The animation speed is reading-speed-calibrated, independent of API
    // latency. New data arriving (original audit → re-audit) restarts the
    // reveal loop at the SAME 100ms cadence.
    vi.useFakeTimers();
    const { rerender } = render(<AuditPanelTicker pass2={mariaPass2} shouldAnimate />);
    act(() => vi.advanceTimersByTime(200));
    expect(revealedCount()).toBe(2);

    // New audit data arrives mid-reveal — the loop restarts at 0, same cadence.
    rerender(<AuditPanelTicker pass2={carlosPass2} shouldAnimate />);
    act(() => vi.advanceTimersByTime(0)); // let the effect re-run
    expect(revealedCount()).toBe(0);
    act(() => vi.advanceTimersByTime(100));
    expect(revealedCount()).toBe(1);
  });
});

describe('AuditPanelTicker — Decision 41c failure-path-skips-animation', () => {
  it('sets up NO animation timers when shouldAnimate is false (state === failed et al.)', () => {
    vi.useFakeTimers();
    render(<AuditPanelTicker pass2={mariaPass2} shouldAnimate={false} />);
    // Decision 41c: the failure path renders directly, no ticker animation.
    expect(vi.getTimerCount()).toBe(0);
  });

  it('reveals all checks immediately when shouldAnimate is false (render-all, no tick)', () => {
    vi.useFakeTimers();
    const total = mariaPass2.checks.length;
    render(<AuditPanelTicker pass2={mariaPass2} shouldAnimate={false} />);
    // No animation — revealedCount jumps straight to total.
    expect(revealedCount()).toBe(total);
    expect(vi.getTimerCount()).toBe(0);
  });
});

describe('AuditPanelTicker — render guards', () => {
  it('renders nothing when there are no checks', () => {
    render(<AuditPanelTicker pass2={emptyChecksPass2} shouldAnimate />);
    expect(screen.queryByTestId('audit-panel-ticker')).not.toBeInTheDocument();
  });

  it('renders the AuditPanel display when checks are present', () => {
    render(<AuditPanelTicker pass2={mariaPass2} shouldAnimate={false} />);
    expect(screen.getByTestId('audit-panel-ticker')).toBeInTheDocument();
    // AuditPanel composes the PassHeadline — confirm the display rendered.
    expect(screen.getByText('Pass 2 — Audit')).toBeInTheDocument();
  });
});

describe('AuditPanelTicker — no-mode-branching discipline (Decision 41e Path Y rejection)', () => {
  it('does NOT accept a `mode` prop — the no-mode-branching discipline is structural', () => {
    render(
      // @ts-expect-error — AuditPanelTicker has no `mode` prop. "Same component,
      // same logic, both modes" (Decision 41e Path Y rejection) is enforced at
      // the type level: a mode-branching prop is a compile error.
      <AuditPanelTicker pass2={mariaPass2} shouldAnimate={false} mode="persona" />,
    );
    expect(screen.getByTestId('audit-panel-ticker')).toBeInTheDocument();
  });
});

describe('AuditPanelTicker — dual-timer integration (ticker 100ms + elapsed indicator 200ms)', () => {
  // The pre-implementation gotcha: two simultaneous timer loops during a live
  // Pass 2 animation — the per-check ticker (100ms) and the elapsed-time
  // indicator (200ms, via the composed AuditPanel → ElapsedTimeIndicator).
  // This integration test is the regression-guard against a future refactor
  // that tries to consolidate them into a single timer.
  it('runs both timer loops simultaneously; both progress; both clean up on unmount', () => {
    vi.useFakeTimers();
    const startedAt = Date.now();
    const { unmount } = render(
      <AuditPanelTicker pass2={mariaPass2} shouldAnimate live startedAt={startedAt} />,
    );

    // Both intervals active after mount: ticker (100ms) + elapsed indicator (200ms).
    expect(vi.getTimerCount()).toBeGreaterThanOrEqual(2);

    // Ticker progresses on its 100ms cadence.
    act(() => vi.advanceTimersByTime(100));
    expect(revealedCount()).toBe(1);

    // Elapsed indicator crosses its 500ms threshold and appears — it does NOT
    // interfere with the ticker's progression.
    act(() => vi.advanceTimersByTime(500));
    expect(screen.getByText(/elapsed/)).toBeInTheDocument();
    expect(revealedCount()).toBeGreaterThanOrEqual(2);

    // Both loops clean up on unmount — no leaked timers.
    unmount();
    expect(vi.getTimerCount()).toBe(0);
  });

  it('the ticker runs WITHOUT the elapsed indicator when live is false (live is pass-through, not a ticker modifier)', () => {
    vi.useFakeTimers();
    render(<AuditPanelTicker pass2={mariaPass2} shouldAnimate live={false} />);
    // Only the ticker's interval — no elapsed-indicator interval (live=false).
    expect(vi.getTimerCount()).toBe(1);
    act(() => vi.advanceTimersByTime(100));
    expect(revealedCount()).toBe(1);
    // No elapsed indicator in the live=false sub-tree.
    expect(screen.queryByText(/elapsed/)).not.toBeInTheDocument();
  });
});
