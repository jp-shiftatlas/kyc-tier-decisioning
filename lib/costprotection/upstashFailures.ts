// lib/costprotection/upstashFailures.ts
// Shared cross-limiter failure counter for L1 + L3 + telemetry.
// Module-level — single in-memory counter per server instance.
//
// JP Constraint 3 (plan amendment 16 — pending end-of-batch): /api/admin/stats
// surfaces ONE coherent redis_unreachable_count_24h metric. L1 (rateLimit.ts)
// and L3 (killSwitch.ts) both call recordUpstashFailure() in their fail-open
// catch blocks so a single counter aggregates brownouts across layers.

let failures = 0;

export function recordUpstashFailure(): void {
  failures++;
}

export function getUpstashFailureCount(): number {
  return failures;
}

/** Test-only reset. Not used in production code. */
export function __resetUpstashFailures(): void {
  failures = 0;
}
