// tests/integration/admin-stats.test.ts
// Integration tests for /api/admin/stats (Task 4.3).
//
// PRIMARY_PROMPT.md §4.8: GET-only endpoint returns TelemetrySnapshot guarded
// by ADMIN_STATS_KEY. Snapshot includes redis_unreachable_count_24h per
// Amendment 16 (JP Constraint 3) — single coherent failure metric.
//
// Defensive additions beyond the plan recipe:
//   1. redis_unreachable_count_24h field assertion (Amendment 16).
//   2. Empty ADMIN_STATS_KEY env var rejects all requests (defense against
//      accidental key-disabled deploys).
//   3. Cache-Control: no-store header check (no stale telemetry via CDN/proxy).

import { describe, it, expect, beforeEach } from 'vitest';
import { __setRedisForTest } from '@/lib/costprotection/redis';
import { __resetUpstashFailures } from '@/lib/costprotection/upstashFailures';

class InMemoryRedis {
  store = new Map<string, number>();
  async incr(k: string) {
    const v = (this.store.get(k) ?? 0) + 1;
    this.store.set(k, v);
    return v;
  }
  async expire() {
    return 1;
  }
  async get<T>(k: string) {
    return (this.store.get(k) ?? null) as T | null;
  }
  async mget<T>(...keys: string[]) {
    return keys.map((k) => (this.store.get(k) ?? null) as T | null);
  }
  async set() {
    return 'OK';
  }
}

beforeEach(() => {
  __setRedisForTest(new InMemoryRedis() as any);
  __resetUpstashFailures();
  process.env.ADMIN_STATS_KEY = 'sekret';
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
});

describe('/api/admin/stats — auth', () => {
  it('returns 401 without key', async () => {
    const { GET } = await import('@/app/api/admin/stats/route');
    const r = await GET(new Request('http://localhost/api/admin/stats'));
    expect(r.status).toBe(401);
  });

  it('returns 401 with wrong key', async () => {
    const { GET } = await import('@/app/api/admin/stats/route');
    const r = await GET(new Request('http://localhost/api/admin/stats?key=wrong'));
    expect(r.status).toBe(401);
  });

  it('returns 401 when ADMIN_STATS_KEY env var is empty (defensive)', async () => {
    process.env.ADMIN_STATS_KEY = '';
    const { GET } = await import('@/app/api/admin/stats/route');
    // Even with no query key — request should be rejected, NOT match an empty string
    const r = await GET(new Request('http://localhost/api/admin/stats'));
    expect(r.status).toBe(401);
    // And with an empty query key — still rejected
    const r2 = await GET(new Request('http://localhost/api/admin/stats?key='));
    expect(r2.status).toBe(401);
  });
});

describe('/api/admin/stats — snapshot', () => {
  it('returns telemetry snapshot with correct key', async () => {
    const { GET } = await import('@/app/api/admin/stats/route');
    const r = await GET(new Request('http://localhost/api/admin/stats?key=sekret'));
    expect(r.status).toBe(200);
    const body = await r.json();
    expect(body.live_runs).toBe(0);
    expect(body.rate_limit_hits).toBe(0);
    expect(body.kill_switch_triggers).toBe(0);
    expect(body.error_counts).toBe(0);
  });

  it('includes redis_unreachable_count_24h field (Amendment 16)', async () => {
    const { GET } = await import('@/app/api/admin/stats/route');
    const r = await GET(new Request('http://localhost/api/admin/stats?key=sekret'));
    const body = await r.json();
    expect(typeof body.redis_unreachable_count_24h).toBe('number');
    expect(body.redis_unreachable_count_24h).toBe(0);
  });

  it('emits Cache-Control: no-store so proxies/CDN do not serve stale telemetry', async () => {
    const { GET } = await import('@/app/api/admin/stats/route');
    const r = await GET(new Request('http://localhost/api/admin/stats?key=sekret'));
    expect(r.headers.get('Cache-Control')).toBe('no-store');
  });
});
