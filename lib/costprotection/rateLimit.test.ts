// lib/costprotection/rateLimit.test.ts
// L1 per-IP rate limit tests — Path A (@upstash/ratelimit slidingWindow).
// JP Constraint 3: fail-open contract enforced by structural regression guards.

import { describe, it, expect, beforeEach, vi } from 'vitest';

const mockLimit = vi.hoisted(() => vi.fn());
const mockSlidingWindow = vi.hoisted(() => vi.fn(() => ({ kind: 'slidingWindow' })));

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

describe('checkRateLimit (L1 hourly, Path A — @upstash/ratelimit)', () => {
  beforeEach(() => {
    vi.resetModules();
    mockLimit.mockReset();
    mockSlidingWindow.mockClear();
  });

  it('returns allowed: true when within limit', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 3,
      remaining: 2,
      reset: 1_700_000_000_000,
    });
    const { checkRateLimit } = await import('./rateLimit');
    const result = await checkRateLimit('1.2.3.4');
    expect(result.allowed).toBe(true);
    expect(result.remaining).toBe(2);
    expect(result.count).toBe(1); // limit (3) - remaining (2)
    expect(result.reset).toBe(1_700_000_000_000);
    expect(result.reason).toBeUndefined();
  });

  it('returns allowed: false with reason "hourly" when exceeded', async () => {
    mockLimit.mockResolvedValue({
      success: false,
      limit: 3,
      remaining: 0,
      reset: 1_700_000_000_000,
    });
    const { checkRateLimit } = await import('./rateLimit');
    const result = await checkRateLimit('1.2.3.4');
    expect(result.allowed).toBe(false);
    expect(result.reason).toBe('hourly');
    expect(result.count).toBe(3);
    expect(result.remaining).toBe(0);
  });

  it('passes the IP through as the limit identifier', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 3,
      remaining: 2,
      reset: 0,
    });
    const { checkRateLimit } = await import('./rateLimit');
    await checkRateLimit('1.2.3.4');
    expect(mockLimit).toHaveBeenCalledWith('1.2.3.4');
  });

  it('uses separate buckets for distinct IPs (separate identifier passthrough)', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 3,
      remaining: 2,
      reset: 0,
    });
    const { checkRateLimit } = await import('./rateLimit');
    await checkRateLimit('1.2.3.4');
    await checkRateLimit('5.6.7.8');
    expect(mockLimit).toHaveBeenNthCalledWith(1, '1.2.3.4');
    expect(mockLimit).toHaveBeenNthCalledWith(2, '5.6.7.8');
  });

  it('configures Ratelimit.slidingWindow with (3, "1 h")', async () => {
    mockLimit.mockResolvedValue({
      success: true,
      limit: 3,
      remaining: 2,
      reset: 0,
    });
    const { checkRateLimit } = await import('./rateLimit');
    await checkRateLimit('1.2.3.4');
    expect(mockSlidingWindow).toHaveBeenCalledWith(3, '1 h');
  });

  // ─── Fail-open regression guards (JP Constraint 3) ───
  describe('fail-open on Upstash unreachability', () => {
    it('returns { allowed: true, count: null, ...nulls } when Ratelimit.limit() throws', async () => {
      mockLimit.mockRejectedValue(new Error('Upstash unreachable'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const { checkRateLimit } = await import('./rateLimit');
      const result = await checkRateLimit('1.2.3.4');
      expect(result.allowed).toBe(true);
      expect(result.count).toBeNull();
      expect(result.remaining).toBeNull();
      expect(result.reset).toBeNull();
      expect(result.reason).toBeUndefined();
      errorSpy.mockRestore();
    });

    it('increments upstashFailures counter on each failed call', async () => {
      mockLimit.mockRejectedValue(new Error('Upstash unreachable'));
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const mod = await import('./rateLimit');
      mod.__resetUpstashFailures();
      const start = mod.getUpstashFailureCount();
      await mod.checkRateLimit('1.2.3.4');
      await mod.checkRateLimit('5.6.7.8');
      expect(mod.getUpstashFailureCount()).toBe(start + 2);
      errorSpy.mockRestore();
    });

    it('logs to console.error on failure (Vercel-log forensics)', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      mockLimit.mockRejectedValue(new Error('boom'));
      const { checkRateLimit } = await import('./rateLimit');
      await checkRateLimit('1.2.3.4');
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
