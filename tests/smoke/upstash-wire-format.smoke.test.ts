// tests/smoke/upstash-wire-format.smoke.test.ts
//
// Real-Upstash smoke test — resolves the question deferred from Task 3.5:
// does Upstash's @upstash/redis client return numbers or numeric strings
// from incr/get/mget?
//
// Skipped unless INTEGRATION=real AND UPSTASH_REDIS_REST_URL/TOKEN are set
// to real (non-stub) credentials. Default `pnpm test` excludes this file
// via vitest.config.ts.
//
// Run: pnpm test:smoke
// Or:  INTEGRATION=real corepack pnpm vitest run tests/smoke

import { describe, it, expect } from 'vitest';
import { Redis } from '@upstash/redis';

const RUN = process.env.INTEGRATION === 'real';
const HAS_CREDS =
  !!process.env.UPSTASH_REDIS_REST_URL &&
  !!process.env.UPSTASH_REDIS_REST_TOKEN &&
  !process.env.UPSTASH_REDIS_REST_URL.includes('example.upstash.io'); // skip if test stub URL

const describeOrSkip = RUN && HAS_CREDS ? describe : describe.skip;

describeOrSkip('Upstash wire format — real client (smoke)', () => {
  const r = new Redis({
    url: process.env.UPSTASH_REDIS_REST_URL!,
    token: process.env.UPSTASH_REDIS_REST_TOKEN!,
  });

  const testKey = `kyc-smoke:wire-format:${Date.now()}`;

  it('reports the wire-format type for incr/get/mget', async () => {
    // Set a counter
    const afterIncr = await r.incr(testKey);
    console.log('[wire-format] incr →', typeof afterIncr, JSON.stringify(afterIncr));
    expect(['number', 'string']).toContain(typeof afterIncr);

    // Read back via get
    const got = await r.get(testKey);
    console.log('[wire-format] get →', typeof got, JSON.stringify(got));

    // Read back via mget (the operation telemetry.readTelemetry uses)
    const mgot = await r.mget(testKey);
    console.log('[wire-format] mget[0] →', typeof mgot[0], JSON.stringify(mgot[0]));

    // Cleanup
    await r.del(testKey);

    // Hard-assert the typeof for the FINDING — this test never fails on
    // the wire format itself; it ALWAYS passes if Upstash responds. The
    // value of this test is the console.log output, which JP reads to
    // populate docs/design-decisions.md.
    expect(typeof afterIncr).toBeDefined();
    expect(typeof got).toBeDefined();
    expect(typeof mgot[0]).toBeDefined();
  });

  it('confirms Number() coercion handles both wire shapes safely', async () => {
    // Set a value via raw incr (numeric), then read back and coerce.
    await r.incr(testKey);
    const got = await r.get(testKey);
    const coerced = Number(got ?? 0);
    expect(coerced).toBeGreaterThan(0);
    expect(Number.isNaN(coerced)).toBe(false);
    await r.del(testKey);
  });
});

// Always-running guard so JP knows the file is there but auto-skipped.
describe('Upstash wire-format smoke test — runtime guard', () => {
  it('reports skip reason when not opted in', () => {
    if (!RUN) {
      console.log('[wire-format] SKIPPED — set INTEGRATION=real');
    } else if (!HAS_CREDS) {
      console.log('[wire-format] SKIPPED — UPSTASH_REDIS_REST_URL/TOKEN not set to real credentials (still example.upstash.io)');
    } else {
      console.log('[wire-format] RUNNING against real Upstash');
    }
    expect(true).toBe(true);
  });
});
