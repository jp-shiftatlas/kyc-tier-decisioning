// lib/costprotection/rateLimit.ts
// L1 per-IP rate limit (Path A — @upstash/ratelimit slidingWindow)
// per JP Constraint 2 + plan amendment 15 (pending end-of-batch).
//
// API shape confirmed against @upstash/ratelimit@2.0.8, 2026-05-12.
//   - Ratelimit is a class constructor (unchanged from earlier 1.x docs).
//   - Ratelimit.slidingWindow(tokens, durationString) static factory; second arg
//     is still a string like '1 h' / '10 s', not a Duration object.
//   - ratelimit.limit(identifier) returns { success, limit, remaining, reset, pending, reason? }.
//   - `analytics: true` is supported but pushes usage metrics to Upstash console;
//     omitted here — we already log failures to console.error for Vercel forensics
//     and Batch 4 exposes counters via /api/admin/stats.
//
// L1 is hourly-only — the per-IP daily ceiling collapses into L3's global
// kill switch (Task 3.4, slidingWindow(50, '1 d')) to avoid redundant
// middle-layer ceiling math at midnight-UTC boundaries.

import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';
import { recordUpstashFailure } from './upstashFailures';

export const RATE_LIMIT_HOURLY = 3;

let _limiter: Ratelimit | null = null;
function limiter(): Ratelimit {
  if (_limiter) return _limiter;
  _limiter = new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(RATE_LIMIT_HOURLY, '1 h'),
    prefix: 'ratelimit:ip:hour',
  });
  return _limiter;
}

// ─── Failure-counter telemetry (JP Constraint 3) ───────────────────────────
// L1 + L3 brownouts accumulate into the SHARED upstashFailures counter
// (lib/costprotection/upstashFailures.ts) so Batch 4's /api/admin/stats can
// surface a single coherent redis_unreachable_count_24h metric. Counter
// accessors (getUpstashFailureCount / __resetUpstashFailures) are imported
// directly from './upstashFailures' by callers and tests.

// ─── Public types ──────────────────────────────────────────────────────────

export interface RateLimitResult {
  allowed: boolean;
  /** Calls counted within the current window. `null` when Upstash unreachable (fail-open). */
  count: number | null;
  /** Remaining calls in the window. `null` when Upstash unreachable. */
  remaining: number | null;
  /** Epoch ms when the window resets. `null` when Upstash unreachable. */
  reset: number | null;
  /** Discriminator for which ceiling caused the deny — currently only 'hourly' from L1. */
  reason?: 'hourly';
}

// ─── checkRateLimit ────────────────────────────────────────────────────────

export async function checkRateLimit(ip: string): Promise<RateLimitResult> {
  try {
    const result = await limiter().limit(ip);
    return {
      allowed: result.success,
      count: result.limit - result.remaining,
      remaining: result.remaining,
      reset: result.reset,
      reason: result.success ? undefined : 'hourly',
    };
  } catch (err) {
    // Fail-open: visibility-to-JP, invisibility-to-visitor (JP Constraint 3).
    // (a) Vercel-log forensics
    console.error('[rateLimit] Upstash unreachable, failing open:', err);
    // (b) admin-stats visibility — shared counter (L1 + L3 accumulate together)
    recordUpstashFailure();
    // (c) sentinel-by-type, not magic integer
    return {
      allowed: true,
      count: null,
      remaining: null,
      reset: null,
      reason: undefined,
    };
  }
}
