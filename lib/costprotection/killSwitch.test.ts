// lib/costprotection/killSwitch.test.ts
// L3 global daily kill switch tests — Path A (@upstash/ratelimit slidingWindow).
// JP Constraint 2 (Path A) + Constraint 3 (fail-open contract, shared counter).
//
// Sliding 1-day window globally — NOT fixed — so 50/day cannot burst-double at
// the midnight-UTC boundary. Single global identifier (not per-IP); per-IP
// ceiling lives in L1 (rateLimit.ts).

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockLimit = vi.hoisted(() => vi.fn());
const mockSlidingWindow = vi.hoisted(() =>
  vi.fn(() => ({ kind: 'slidingWindow' })),
);

vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class FakeRatelimit {
    static slidingWindow = mockSlidingWindow;
    constructor(public opts: unknown) {}
    limit = mockLimit;
  },
}));

vi.mock('./redis', () => ({
  redis: () => ({}),
  __setRedisForTest: () => {},
}));

describe('checkKillSwitch (L3 global daily, Path A — slidingWindow 50/1d)', () => {
  beforeEach(async () => {
    vi.resetModules();
    mockLimit.mockReset();
    mockSlidingWindow.mockClear();
    const { __resetUpstashFailures } = await import('./upstashFailures');
    __resetUpstashFailures();
  });

  it('returns allowed: true when within daily limit', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 50,
      remaining: 49,
      reset: Date.now() + 86_400_000,
    });
    const { checkKillSwitch } = await import('./killSwitch');
    const result = await checkKillSwitch();
    expect(result.allowed).toBe(true);
    expect(result.count).toBe(1); // limit (50) - remaining (49)
    expect(result.remaining).toBe(49);
  });

  it('returns allowed: false when global daily cap exceeded', async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 50,
      remaining: 0,
      reset: Date.now() + 86_400_000,
    });
    const { checkKillSwitch } = await import('./killSwitch');
    const result = await checkKillSwitch();
    expect(result.allowed).toBe(false);
    expect(result.count).toBe(50);
  });

  it('uses a single global identifier (not per-IP)', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 50,
      remaining: 49,
      reset: 0,
    });
    const { checkKillSwitch } = await import('./killSwitch');
    await checkKillSwitch();
    expect(mockLimit).toHaveBeenCalledTimes(1);
    const identifier = mockLimit.mock.calls[0][0];
    expect(typeof identifier).toBe('string');
    expect(identifier.length).toBeGreaterThan(0);
    // Not an IP-shaped string — should be a constant like 'global' or similar
    expect(identifier).not.toMatch(/^\d+\.\d+\.\d+\.\d+$/);
  });

  it('uses slidingWindow(50, "1 d") — sliding, not fixed, no midnight boundary burst', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 50,
      remaining: 49,
      reset: 0,
    });
    const { checkKillSwitch } = await import('./killSwitch');
    await checkKillSwitch();
    expect(mockSlidingWindow).toHaveBeenCalledWith(50, '1 d');
  });

  // ─── Fail-open regression guard (JP Constraint 3) ───
  describe('fail-open on Upstash unreachability', () => {
    it('returns { allowed: true, count: null, ...nulls } when Ratelimit.limit() throws', async () => {
      mockLimit.mockRejectedValue(new Error('Upstash unreachable'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { checkKillSwitch } = await import('./killSwitch');
      const result = await checkKillSwitch();
      expect(result.allowed).toBe(true);
      expect(result.count).toBeNull();
      expect(result.remaining).toBeNull();
      expect(result.reset).toBeNull();
      errorSpy.mockRestore();
    });

    it('increments shared upstashFailures counter on failure', async () => {
      mockLimit.mockRejectedValue(new Error('Upstash unreachable'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { checkKillSwitch } = await import('./killSwitch');
      const { getUpstashFailureCount } = await import('./upstashFailures');
      const start = getUpstashFailureCount();
      await checkKillSwitch();
      expect(getUpstashFailureCount()).toBe(start + 1);
      errorSpy.mockRestore();
    });

    it('logs to console.error on failure (Vercel-log forensics)', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLimit.mockRejectedValue(new Error('boom'));
      const { checkKillSwitch } = await import('./killSwitch');
      await checkKillSwitch();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });

  describe('counter sharing across L1 + L3', () => {
    it('L1 and L3 failures accumulate into the same counter', async () => {
      mockLimit.mockRejectedValue(new Error('Upstash unreachable'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { checkRateLimit } = await import('./rateLimit');
      const { checkKillSwitch } = await import('./killSwitch');
      const { getUpstashFailureCount } = await import('./upstashFailures');
      const start = getUpstashFailureCount();
      await checkRateLimit('1.2.3.4');
      await checkKillSwitch();
      expect(getUpstashFailureCount()).toBe(start + 2);
      errorSpy.mockRestore();
    });
  });
});
