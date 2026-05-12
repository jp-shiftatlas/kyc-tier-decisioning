// lib/costprotection/telemetry.test.ts
// Daily telemetry counters for /api/admin/stats (Task 3.5, Batch 3).
// JP Constraint 3: fail-open contract — incrementCounter and readTelemetry
// must not throw on Upstash unreachability. Errors bump the shared
// upstashFailures counter so /api/admin/stats surfaces a single coherent
// redis_unreachable_count metric.

import { describe, it, expect, beforeEach, vi } from 'vitest';
import { incrementCounter, readTelemetry } from './telemetry';
import { __setRedisForTest } from './redis';
import {
  __resetUpstashFailures,
  getUpstashFailureCount,
} from './upstashFailures';

class InMemoryRedis {
  private store = new Map<string, number>();
  async incr(key: string) {
    const v = (this.store.get(key) ?? 0) + 1;
    this.store.set(key, v);
    return v;
  }
  async expire() {
    return 1;
  }
  async get<T>(key: string) {
    return (this.store.get(key) ?? null) as T | null;
  }
  async mget<T>(...keys: string[]) {
    return keys.map((k) => (this.store.get(k) ?? null) as T | null);
  }
  async set() {
    return 'OK';
  }
}

// A Redis stub that throws on every call — used for fail-open tests.
class ThrowingRedis {
  async incr(): Promise<number> {
    throw new Error('Upstash unreachable');
  }
  async expire() {
    throw new Error('Upstash unreachable');
  }
  async get() {
    throw new Error('Upstash unreachable');
  }
  async mget() {
    throw new Error('Upstash unreachable');
  }
  async set() {
    throw new Error('Upstash unreachable');
  }
}

describe('telemetry', () => {
  beforeEach(() => {
    __setRedisForTest(new InMemoryRedis() as any);
    __resetUpstashFailures();
  });

  it('increments a named counter for the UTC day', async () => {
    await incrementCounter('live_runs');
    await incrementCounter('live_runs');
    const t = await readTelemetry();
    expect(t.live_runs).toBe(2);
  });

  it('reads zero for absent counters', async () => {
    const t = await readTelemetry();
    expect(t.live_runs).toBe(0);
    expect(t.rate_limit_hits).toBe(0);
    expect(t.kill_switch_triggers).toBe(0);
    expect(t.error_counts).toBe(0);
  });

  it('exposes the redis_unreachable_count field from the shared upstashFailures counter', async () => {
    const t = await readTelemetry();
    expect(typeof t.redis_unreachable_count_24h).toBe('number');
    expect(t.redis_unreachable_count_24h).toBe(0);
  });

  describe('fail-open on Upstash unreachability', () => {
    beforeEach(() => {
      __setRedisForTest(new ThrowingRedis() as any);
    });

    it('incrementCounter does NOT throw when Upstash is unreachable', async () => {
      await expect(incrementCounter('live_runs')).resolves.not.toThrow();
    });

    it('incrementCounter increments the shared upstashFailures counter on Upstash error', async () => {
      const before = getUpstashFailureCount();
      await incrementCounter('live_runs');
      expect(getUpstashFailureCount()).toBe(before + 1);
    });

    it('readTelemetry returns null counters when Upstash is unreachable (fail-open)', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      const t = await readTelemetry();
      expect(t.live_runs).toBe(null);
      expect(t.rate_limit_hits).toBe(null);
      expect(t.kill_switch_triggers).toBe(null);
      expect(t.error_counts).toBe(null);
      errorSpy.mockRestore();
    });

    it('readTelemetry still surfaces redis_unreachable_count_24h (from in-memory, not Upstash)', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await incrementCounter('live_runs');
      const t = await readTelemetry();
      expect(t.redis_unreachable_count_24h).toBeGreaterThan(0);
      errorSpy.mockRestore();
    });

    it('readTelemetry logs to console.error on Upstash failure', async () => {
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
      await readTelemetry();
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });
  });
});
