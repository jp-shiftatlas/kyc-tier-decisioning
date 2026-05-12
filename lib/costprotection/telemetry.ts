// lib/costprotection/telemetry.ts
// Daily-rollup counters for /api/admin/stats per PRIMARY_PROMPT.md §4.8.
// Raw @upstash/redis primitives (incr/expire/mget) — these are persistent
// usage counters, NOT rate-limit allow/deny decisions, so @upstash/ratelimit
// is the wrong tool here. Path A is reserved for L1 + L3.
//
// Counters: live_runs, rate_limit_hits, kill_switch_triggers, error_counts.
// Per-UTC-day keys with 7-day TTL so the admin dashboard can show a rolling
// week without unbounded storage growth.
//
// Fail-open contract (JP Constraint 3): both incrementCounter and
// readTelemetry wrap Upstash calls in try/catch. On error, console.error
// logs for Vercel forensics and recordUpstashFailure() bumps the shared
// in-memory counter (lib/costprotection/upstashFailures.ts), keeping a
// single coherent redis_unreachable_count metric across L1 + L3 + telemetry.
//
// The snapshot also surfaces redis_unreachable_count_24h sourced from the
// shared in-memory counter — instance-lifetime approximation on Vercel
// (serverless instances cycle frequently), but the public-facing _24h
// name is preserved for /api/admin/stats API stability (Batch 4).

import { redis } from './redis';
import {
  recordUpstashFailure,
  getUpstashFailureCount,
} from './upstashFailures';

export type CounterName =
  | 'live_runs'
  | 'rate_limit_hits'
  | 'kill_switch_triggers'
  | 'error_counts';

const COUNTER_NAMES: readonly CounterName[] = [
  'live_runs',
  'rate_limit_hits',
  'kill_switch_triggers',
  'error_counts',
] as const;

// 7-day TTL so the dashboard can show a rolling week of daily history.
const COUNTER_TTL_SECONDS = 60 * 60 * 24 * 7;

function pad(n: number): string {
  return n.toString().padStart(2, '0');
}

function counterKey(name: CounterName, now: Date): string {
  const y = now.getUTCFullYear();
  const m = pad(now.getUTCMonth() + 1);
  const d = pad(now.getUTCDate());
  return `telemetry:${name}:day:${y}${m}${d}`;
}

/**
 * Increment a daily counter. Fire-and-forget — returns the new value, or
 * `null` on Upstash unreachability (fail-open per JP Constraint 3).
 * NEVER throws.
 */
export async function incrementCounter(
  name: CounterName,
  now: Date = new Date(),
): Promise<number | null> {
  try {
    const r = redis();
    const k = counterKey(name, now);
    const v = await r.incr(k);
    await r.expire(k, COUNTER_TTL_SECONDS);
    return v;
  } catch (err) {
    // Fail-open: visibility-to-JP, invisibility-to-visitor.
    // (a) Vercel-log forensics
    console.error(
      '[telemetry] Upstash unreachable, fail-open on incrementCounter:',
      err,
    );
    // (b) admin-stats visibility — shared counter (L1 + L3 + telemetry aggregate)
    recordUpstashFailure();
    // (c) sentinel-by-type, not magic integer
    return null;
  }
}

export interface TelemetrySnapshot {
  live_runs: number | null;
  rate_limit_hits: number | null;
  kill_switch_triggers: number | null;
  error_counts: number | null;
  /**
   * In-memory counter of Upstash unreachability errors since this server
   * instance booted. On Vercel, serverless instances cycle frequently —
   * this is an instance-lifetime approximation, not a strict 24h window.
   * Public-facing `_24h` name preserved to match `/api/admin/stats` API
   * stability (Batch 4).
   */
  redis_unreachable_count_24h: number;
}

/**
 * Read the current-UTC-day snapshot. Returns `null` for each Upstash-backed
 * counter on unreachability (fail-open per JP Constraint 3) so
 * /api/admin/stats can render `—` for unavailable values without exploding.
 * `redis_unreachable_count_24h` is read from the in-memory shared counter,
 * so it remains valid even when Upstash itself is down.
 * NEVER throws.
 */
export async function readTelemetry(
  now: Date = new Date(),
): Promise<TelemetrySnapshot> {
  try {
    const r = redis();
    const keys = COUNTER_NAMES.map((n) => counterKey(n, now));
    const values = await r.mget<(number | null)[]>(...keys);
    return {
      live_runs: Number(values[0] ?? 0),
      rate_limit_hits: Number(values[1] ?? 0),
      kill_switch_triggers: Number(values[2] ?? 0),
      error_counts: Number(values[3] ?? 0),
      redis_unreachable_count_24h: getUpstashFailureCount(),
    };
  } catch (err) {
    console.error(
      '[telemetry] Upstash unreachable, fail-open on readTelemetry:',
      err,
    );
    recordUpstashFailure();
    return {
      live_runs: null,
      rate_limit_hits: null,
      kill_switch_triggers: null,
      error_counts: null,
      // Read AFTER recordUpstashFailure() so the surfaced number reflects
      // the current call's contribution.
      redis_unreachable_count_24h: getUpstashFailureCount(),
    };
  }
}
