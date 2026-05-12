// tests/integration/decisioning-route.test.ts
// Integration tests for /api/decisioning per-pass POST route (Task 4.1).
//
// PRIMARY_PROMPT.md §4.9 (Decision 32): single Vercel serverless route, per-pass POSTs
// branched by ?pass=N.
// PRIMARY_PROMPT.md §4.8 (Decision 33): cost protection (L1 + L3) executes BEFORE
// pass dispatch — failing fast on throttle or cap avoids incurring API cost on
// requests that would be denied anyway.
//
// Module-mocking strategy (deviation from plan recipe — surfaced in JP's dispatch):
//   The plan's recipe stubs Redis with `InMemoryRedis` and expects rate-limit /
//   kill-switch to operate via raw primitives. This does not work under Path A —
//   @upstash/ratelimit uses Lua scripts via eval/evalsha which InMemoryRedis
//   does not support. We mock @/lib/costprotection/rateLimit and
//   @/lib/costprotection/killSwitch at the contract boundary instead. The
//   actual rate-limit / kill-switch logic is unit-tested in Task 3.3 / 3.4.
//   Telemetry (incrementCounter) stays real, exercised against an
//   InMemoryRedis stub.
//
// Addition 2 (rate-limit response headers): X-RateLimit-Limit / Remaining /
// Reset emitted on every response. Browser dev-tools visibility during
// discovery-call demos — bank-engineer credibility signal. Fail-open path
// (count === null) omits headers rather than emitting NaN.

import { describe, it, expect, beforeEach, vi } from 'vitest';

// ─── Module mocks (hoisted) ────────────────────────────────────────────────
const mockCheckRateLimit = vi.hoisted(() => vi.fn());
const mockCheckKillSwitch = vi.hoisted(() => vi.fn());
const mockIncrementCounter = vi.hoisted(() => vi.fn());
const mockCreate = vi.hoisted(() => vi.fn());

// @upstash/ratelimit: never invoked because we mock the wrappers below, but
// the bare Ratelimit import in rateLimit.ts / killSwitch.ts source would still
// fire if Vitest tree-shook differently. Stub the class as a no-op to be safe.
vi.mock('@upstash/ratelimit', () => ({
  Ratelimit: class {
    static slidingWindow = vi.fn(() => ({ kind: 'slidingWindow' }));
    limit = vi.fn();
    constructor(public opts: unknown) {}
  },
}));

vi.mock('@/lib/costprotection/rateLimit', () => ({
  checkRateLimit: mockCheckRateLimit,
  RATE_LIMIT_HOURLY: 3,
}));

vi.mock('@/lib/costprotection/killSwitch', () => ({
  checkKillSwitch: mockCheckKillSwitch,
  KILL_SWITCH_DAILY_CAP: 50,
}));

// Telemetry stays real — exercised against InMemoryRedis via __setRedisForTest.
// (Could be mocked; left real for slightly broader integration exercise.)

vi.mock('@anthropic-ai/sdk', () => ({
  default: class {
    messages = { create: mockCreate };
  },
}));

import { __setRedisForTest } from '@/lib/costprotection/redis';

// ─── InMemoryRedis stub (for telemetry primitives only) ────────────────────
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

// ─── Contract fixtures for the mocked rate-limit / kill-switch returns ─────
const FUTURE_RESET = Date.now() + 3_600_000;
const ALLOWED = { allowed: true, count: 1, remaining: 2, reset: FUTURE_RESET };
const RATE_LIMITED = {
  allowed: false,
  count: 3,
  remaining: 0,
  reset: FUTURE_RESET,
  reason: 'hourly' as const,
};
const KS_ALLOWED = {
  allowed: true,
  count: 1,
  remaining: 49,
  reset: FUTURE_RESET,
};
const KS_BLOCKED = {
  allowed: false,
  count: 50,
  remaining: 0,
  reset: FUTURE_RESET,
};
const FAIL_OPEN = {
  allowed: true,
  count: null,
  remaining: null,
  reset: null,
};

beforeEach(() => {
  __setRedisForTest(new InMemoryRedis() as any);
  process.env.ANTHROPIC_API_KEY = 'test';
  process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
  process.env.UPSTASH_REDIS_REST_TOKEN = 'token';
  process.env.ADMIN_STATS_KEY = 'admin-test';
  delete process.env.DEBUG_MODE;
  mockCheckRateLimit.mockReset();
  mockCheckKillSwitch.mockReset();
  mockIncrementCounter.mockReset();
  mockCreate.mockReset();
  mockCheckRateLimit.mockResolvedValue(ALLOWED);
  mockCheckKillSwitch.mockResolvedValue(KS_ALLOWED);
});

// ─── Fixtures ──────────────────────────────────────────────────────────────
const validProfile = {
  customer_reference: 'Test Customer',
  identity_document_type: 'PhilSys',
  residency_status: 'PH resident',
  customer_type: 'individual retail',
  occupation_type: 'employed',
  source_of_funds: 'salary',
  account_purpose: 'payroll',
  expected_monthly_volume_php: 80000,
  pep_status: 'none',
  sanctions_screening: 'clean',
  high_risk_jurisdiction_connection: 'none',
  adverse_media: 'no',
  years_with_bank: 'new',
};

// validPass1 — full Pass1OutputSchema shape with the structured 6-section
// examiner_notes_full (Amendment 13 / ExaminerNotesFullSchema). The plan's
// literal `examiner_notes_full: 'memo'` would fail validation.
const validPass1 = {
  decision: {
    recommended_tier: 'Standard',
    decision_basis: 'score_based',
    decisive_rule_ids: ['TE-02'],
    senior_approval_required: false,
    onboarding_hold: false,
    hold_reason: null,
  },
  risk_score: {
    total: 0,
    category_breakdown: {
      tier_eligibility: 0,
      escalation_triggers: 0,
      documentation_process: 0,
    },
  },
  rules_fired: [
    {
      rule_id: 'TE-02',
      category: 'tier_eligibility',
      weight: 0,
      trigger_evidence: 'baseline',
    },
  ],
  examiner_notes_full: {
    decision_summary: 'sample decision summary',
    profile_analysis: 'sample profile analysis',
    rule_application_and_risk_pattern: 'sample rule application',
    considered_alternatives: 'sample considered alternatives',
    // null is canonical for non-EDD tiers per Pass1OutputSchema.
    recommended_edd_procedures: null,
    audit_trail: 'sample audit trail',
  },
  summary_finding: 'standard tier',
};

// validPass2Clean — full Pass2OutputSchema. The plan recipe omits this shape;
// here it is, expanded from the dispatch's reference line and verified
// against lib/schemas/pass2.ts (overall_status uppercase, target_check_ids
// required, regeneration_scope nullable with default 'none', etc.).
const validPass2Clean = {
  generated_at: '2026-05-12T00:00:00Z',
  target_check_ids: [],
  regeneration_scope: 'none',
  correction_required: false,
  audit_summary: 'PASS clean',
  overall_status: 'PASS',
  checks: [],
};

async function callRoute(
  pass: 1 | 2 | 3 | string,
  body: unknown,
  headers: Record<string, string> = {},
  extraQs = '',
) {
  const { POST } = await import('@/app/api/decisioning/route');
  const req = new Request(
    `http://localhost/api/decisioning?pass=${pass}${extraQs}`,
    {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
        ...headers,
      },
      body: typeof body === 'string' ? body : JSON.stringify(body),
    },
  );
  return POST(req);
}

// ─── Pass 1 happy path ─────────────────────────────────────────────────────
describe('/api/decisioning — Pass 1 happy path', () => {
  it('returns parsed Pass 1 output', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validPass1) }],
    });
    const res = await callRoute(1, { profile: validProfile });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.decision.recommended_tier).toBe('Standard');
  });

  it('runs rate-limit + kill-switch BEFORE invoking the model', async () => {
    // If rate-limit / kill-switch return blocked, the Anthropic client must
    // not be called — Decision 33 cost-protection ordering.
    mockCheckRateLimit.mockResolvedValue(RATE_LIMITED);
    await callRoute(1, { profile: validProfile });
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ─── Validation ────────────────────────────────────────────────────────────
describe('/api/decisioning — validation', () => {
  it('rejects malformed profile with validation_failed', async () => {
    const res = await callRoute(1, {
      profile: { ...validProfile, expected_monthly_volume_php: -5 },
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorType).toBe('validation_failed');
    expect(body.retryable).toBe(true);
  });

  it('rejects body that is not valid JSON', async () => {
    const { POST } = await import('@/app/api/decisioning/route');
    const req = new Request('http://localhost/api/decisioning?pass=1', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: '{ not json',
    });
    const res = await POST(req);
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorType).toBe('validation_failed');
  });
});

// ─── Malformed model JSON ──────────────────────────────────────────────────
describe('/api/decisioning — malformed model JSON', () => {
  it('returns malformed_model_json', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: 'not json at all' }],
    });
    const res = await callRoute(1, { profile: validProfile });
    expect(res.status).toBe(502);
    const body = await res.json();
    expect(body.errorType).toBe('malformed_model_json');
  });
});

// ─── Rate-limit denial ─────────────────────────────────────────────────────
describe('/api/decisioning — rate limit', () => {
  it('returns 429 rate_limited when L1 denies', async () => {
    mockCheckRateLimit.mockResolvedValue(RATE_LIMITED);
    const res = await callRoute(1, { profile: validProfile });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.errorType).toBe('rate_limited');
    expect(body.retryable).toBe(false);
  });
});

// ─── Kill-switch denial ────────────────────────────────────────────────────
describe('/api/decisioning — kill switch', () => {
  it('returns 429 cap_reached when L3 denies', async () => {
    mockCheckKillSwitch.mockResolvedValue(KS_BLOCKED);
    const res = await callRoute(1, { profile: validProfile });
    expect(res.status).toBe(429);
    const body = await res.json();
    expect(body.errorType).toBe('cap_reached');
    expect(body.retryable).toBe(false);
  });

  it('kill-switch fires after rate-limit passes (Decision 33 ordering)', async () => {
    mockCheckRateLimit.mockResolvedValue(ALLOWED);
    mockCheckKillSwitch.mockResolvedValue(KS_BLOCKED);
    await callRoute(1, { profile: validProfile });
    expect(mockCheckRateLimit).toHaveBeenCalled();
    expect(mockCheckKillSwitch).toHaveBeenCalled();
    expect(mockCreate).not.toHaveBeenCalled();
  });
});

// ─── Pass 2 requirements ───────────────────────────────────────────────────
describe('/api/decisioning — Pass 2 body requirements', () => {
  it('rejects Pass 2 missing pass1 with validation_failed', async () => {
    const res = await callRoute(2, { profile: validProfile });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorType).toBe('validation_failed');
  });

  it('accepts Pass 2 with profile + pass1', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validPass2Clean) }],
    });
    const res = await callRoute(2, {
      profile: validProfile,
      pass1: validPass1,
    });
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.overall_status).toBe('PASS');
    expect(body.correction_required).toBe(false);
  });
});

// ─── Pass 3 requirements ───────────────────────────────────────────────────
describe('/api/decisioning — Pass 3 body requirements', () => {
  it('rejects Pass 3 missing pass1 / pass2 / orchestration', async () => {
    const res = await callRoute(3, {
      profile: validProfile,
      pass1: validPass1,
    });
    expect(res.status).toBe(400);
    const body = await res.json();
    expect(body.errorType).toBe('validation_failed');
  });
});

// ─── Bad pass parameter ────────────────────────────────────────────────────
describe('/api/decisioning — bad pass parameter', () => {
  it('rejects pass=99', async () => {
    const { POST } = await import('@/app/api/decisioning/route');
    const req = new Request('http://localhost/api/decisioning?pass=99', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({ profile: validProfile }),
    });
    const r = await POST(req);
    expect(r.status).toBe(400);
  });

  it('rejects missing pass parameter', async () => {
    const { POST } = await import('@/app/api/decisioning/route');
    const req = new Request('http://localhost/api/decisioning', {
      method: 'POST',
      headers: {
        'content-type': 'application/json',
        'x-forwarded-for': '1.2.3.4',
      },
      body: JSON.stringify({ profile: validProfile }),
    });
    const r = await POST(req);
    expect(r.status).toBe(400);
  });
});

// ─── Addition 2: rate-limit response headers ───────────────────────────────
describe('/api/decisioning — Addition 2 rate-limit headers', () => {
  it('emits X-RateLimit-Limit/Remaining/Reset on 200', async () => {
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validPass1) }],
    });
    const res = await callRoute(1, { profile: validProfile });
    expect(res.status).toBe(200);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('2');
    expect(res.headers.get('X-RateLimit-Reset')).toBe(String(FUTURE_RESET));
  });

  it('emits rate-limit headers on 429 throttled response', async () => {
    mockCheckRateLimit.mockResolvedValue(RATE_LIMITED);
    const res = await callRoute(1, { profile: validProfile });
    expect(res.status).toBe(429);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('0');
    expect(res.headers.get('X-RateLimit-Reset')).toBe(String(FUTURE_RESET));
  });

  it('emits rate-limit headers on validation 400 (rate check runs first)', async () => {
    const res = await callRoute(1, {
      profile: { ...validProfile, expected_monthly_volume_php: -5 },
    });
    expect(res.status).toBe(400);
    expect(res.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('2');
  });

  it('handles fail-open count=null gracefully — omits headers, no NaN', async () => {
    mockCheckRateLimit.mockResolvedValue(FAIL_OPEN);
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validPass1) }],
    });
    const res = await callRoute(1, { profile: validProfile });
    expect(res.status).toBe(200);
    // Fail-open contract: headers omitted rather than emitting NaN.
    expect(res.headers.get('X-RateLimit-Remaining')).toBeNull();
    expect(res.headers.get('X-RateLimit-Reset')).toBeNull();
    // Either absent OR a sentinel string — but NEVER 'NaN'.
    const remaining = res.headers.get('X-RateLimit-Remaining');
    expect(remaining).not.toBe('NaN');
  });
});

// ─── Debug toggle (plan amendment #3) ──────────────────────────────────────
describe('/api/decisioning — debug toggle (plan amendment #3)', () => {
  it('force_correction=1 has no effect when DEBUG_MODE is unset', async () => {
    delete process.env.DEBUG_MODE;
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validPass2Clean) }],
    });
    const res = await callRoute(
      2,
      { profile: validProfile, pass1: validPass1 },
      {},
      '&force_correction=1',
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.correction_required).toBe(false);
  });

  it('force_correction=1 flips correction_required to true when DEBUG_MODE=true', async () => {
    process.env.DEBUG_MODE = 'true';
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validPass2Clean) }],
    });
    const res = await callRoute(
      2,
      { profile: validProfile, pass1: validPass1 },
      {},
      '&force_correction=1',
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    expect(body.correction_required).toBe(true);
    delete process.env.DEBUG_MODE;
  });

  it('debug-toggled response still carries rate-limit headers', async () => {
    process.env.DEBUG_MODE = 'true';
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validPass2Clean) }],
    });
    const res = await callRoute(
      2,
      { profile: validProfile, pass1: validPass1 },
      {},
      '&force_correction=1',
    );
    expect(res.headers.get('X-RateLimit-Limit')).toBe('3');
    expect(res.headers.get('X-RateLimit-Remaining')).toBe('2');
    delete process.env.DEBUG_MODE;
  });

  it('debug toggle does not affect Pass 1 responses', async () => {
    process.env.DEBUG_MODE = 'true';
    mockCreate.mockResolvedValue({
      content: [{ type: 'text', text: JSON.stringify(validPass1) }],
    });
    const res = await callRoute(
      1,
      { profile: validProfile },
      {},
      '&force_correction=1',
    );
    expect(res.status).toBe(200);
    const body = await res.json();
    // Pass 1 schema has no correction_required field — toggle must not inject it.
    expect(body.correction_required).toBeUndefined();
    delete process.env.DEBUG_MODE;
  });
});
