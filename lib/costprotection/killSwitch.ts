// lib/costprotection/killSwitch.ts
// L3 global daily kill switch (Path A — @upstash/ratelimit slidingWindow)
// per JP Constraint 2 + plan amendment 15 (pending end-of-batch).
//
// Sliding 1-day window GLOBALLY (not fixed) so 50/day cannot burst at the
// midnight-UTC boundary — a fixed window would reset at 00:00 UTC and accept
// a full 50-call burst immediately followed by another 50 at 00:00:01 the
// next day. Sliding spreads the limit smoothly across any 24h interval.
//
// Single global identifier (NOT per-IP). This IS the global cap; the per-IP
// ceiling lives in L1 (rateLimit.ts).
//
// Shares the redis() singleton with L1 (Task 3.2) and the upstashFailures
// counter with L1 (Task 3.3 refactor, plan amendment 16) so Batch 4's
// /api/admin/stats can surface one coherent redis_unreachable_count_24h.

import { Ratelimit } from '@upstash/ratelimit';
import { redis } from './redis';
import { recordUpstashFailure } from './upstashFailures';

export const KILL_SWITCH_DAILY_CAP = 50;
const GLOBAL_IDENTIFIER = 'global';

let _limiter: Ratelimit | null = null;
function limiter(): Ratelimit {
  if (_limiter) return _limiter;
  _limiter = new Ratelimit({
    redis: redis(),
    limiter: Ratelimit.slidingWindow(KILL_SWITCH_DAILY_CAP, '1 d'),
    prefix: 'killswitch:global',
  });
  return _limiter;
}

export interface KillSwitchResult {
  allowed: boolean;
  /** Calls counted within the current sliding 24h window. `null` when Upstash unreachable. */
  count: number | null;
  /** Remaining calls in the window. `null` when Upstash unreachable. */
  remaining: number | null;
  /** Epoch ms when the window resets. `null` when Upstash unreachable. */
  reset: number | null;
}

export async function checkKillSwitch(): Promise<KillSwitchResult> {
  try {
    const result = await limiter().limit(GLOBAL_IDENTIFIER);
    return {
      allowed: result.success,
      count: result.limit - result.remaining,
      remaining: result.remaining,
      reset: result.reset,
    };
  } catch (err) {
    // Fail-open: visibility-to-JP, invisibility-to-visitor (JP Constraint 3).
    // (a) Vercel-log forensics
    console.error('[killSwitch] Upstash unreachable, failing open:', err);
    // (b) admin-stats visibility — shared counter (L1 + L3 accumulate together)
    recordUpstashFailure();
    // (c) sentinel-by-type, not magic integer
    return { allowed: true, count: null, remaining: null, reset: null };
  }
}
