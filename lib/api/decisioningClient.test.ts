import { describe, it, expect, vi, afterEach } from 'vitest';
import { readFileSync } from 'node:fs';
import { postPass1, postPass2, postPass3 } from './decisioningClient';
import { loadPersona } from '@/lib/schemas/personaAdapters';
import type { DecisioningError } from '@/lib/schemas/apiError';

afterEach(() => {
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// Real schema-validated fixtures.
const maria = loadPersona('maria');
const profile = maria.profile;
const pass1 = maria.pass_1;
const pass2 = maria.pass_2;

// Build a fetch mock returning a Response-like object.
function mockFetchOnce(opts: { ok: boolean; status: number; body: unknown }) {
  return vi.fn().mockResolvedValueOnce({
    ok: opts.ok,
    status: opts.status,
    json: async () => opts.body,
  });
}

// Capture the [url, init] arguments fetch was called with.
function lastFetchArgs(spy: ReturnType<typeof vi.fn>): { url: string; body: unknown } {
  const call = spy.mock.calls[spy.mock.calls.length - 1];
  return { url: String(call[0]), body: JSON.parse(String((call[1] as RequestInit).body)) };
}

describe('decisioningClient — request shaping (Finding J: actual route contract)', () => {
  it('postPass1 POSTs ?pass=1 with a { profile } body', async () => {
    const spy = mockFetchOnce({ ok: true, status: 200, body: pass1 });
    vi.stubGlobal('fetch', spy);
    await postPass1(profile);
    const { url, body } = lastFetchArgs(spy);
    expect(url).toContain('/api/decisioning?pass=1');
    expect(body).toEqual({ profile });
  });

  it('postPass2 POSTs ?pass=2 with a { profile, pass1 } body — and nothing else (Decision 32 no-signaling)', async () => {
    const spy = mockFetchOnce({ ok: true, status: 200, body: pass2 });
    vi.stubGlobal('fetch', spy);
    await postPass2({ profile, pass1 });
    const { url, body } = lastFetchArgs(spy);
    expect(url).toContain('/api/decisioning?pass=2');
    // Exactly { profile, pass1 } — no re_audit flag, no attempt counter, no
    // signaling field. The body shape is identical for original audit and
    // re-audit; only the pass1 value differs.
    expect(Object.keys(body as object).sort()).toEqual(['pass1', 'profile']);
  });

  it('postPass3 POSTs ?pass=3 with the { profile, pass1, pass2, orchestration } envelope (Finding J #1)', async () => {
    const spy = mockFetchOnce({ ok: true, status: 200, body: { corrected: true } });
    vi.stubGlobal('fetch', spy);
    await postPass3({
      profile,
      pass1,
      pass2,
      orchestration: { audit_id: 'audit-live-abc123-20260515', attempt: 1 },
    });
    const { url, body } = lastFetchArgs(spy);
    expect(url).toContain('/api/decisioning?pass=3');
    // The route requires orchestration: { audit_id, attempt } — NOT a
    // top-level correction_attempt_number (the directive's described shape,
    // which would fail server validation).
    expect(Object.keys(body as object).sort()).toEqual([
      'orchestration',
      'pass1',
      'pass2',
      'profile',
    ]);
    expect((body as { orchestration: unknown }).orchestration).toEqual({
      audit_id: 'audit-live-abc123-20260515',
      attempt: 1,
    });
  });
});

describe('decisioningClient — response handling (Finding J #2: bare success bodies)', () => {
  it('returns { ok: true, data } with the BARE success body — not a wrapped { passN } envelope', async () => {
    const spy = mockFetchOnce({ ok: true, status: 200, body: pass1 });
    vi.stubGlobal('fetch', spy);
    const result = await postPass1(profile);
    expect(result.ok).toBe(true);
    if (result.ok) {
      // data IS the Pass 1 output directly — the route returns result.data bare.
      expect(result.data).toEqual(pass1);
    }
  });

  it('parses a non-2xx DecisioningError body into { ok: false, error }', async () => {
    const serverError: DecisioningError = {
      pass: 2,
      errorType: 'malformed_model_json',
      message: 'The model returned JSON that failed validation.',
      retryable: false,
    };
    const spy = mockFetchOnce({ ok: false, status: 502, body: serverError });
    vi.stubGlobal('fetch', spy);
    const result = await postPass2({ profile, pass1 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toEqual(serverError);
    }
  });

  it('handles a 429 rate-limited DecisioningError body — no header parsing, message comes from the route', async () => {
    // Finding J #3: the route embeds the institutional-register retry message
    // in DecisioningError.message directly. The client does NOT parse a
    // Retry-After header — 429 collapses to "non-2xx → body is
    // DecisioningError → return { ok: false, error }".
    const rateLimited: DecisioningError = {
      pass: 1,
      errorType: 'rate_limited',
      message: 'Live generation limit reached for this hour. Pre-generated examples remain available.',
      retryable: false,
    };
    const spy = mockFetchOnce({ ok: false, status: 429, body: rateLimited });
    vi.stubGlobal('fetch', spy);
    const result = await postPass1(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.errorType).toBe('rate_limited');
      expect(result.error.message).toContain('Live generation limit reached');
    }
  });

  it('synthesizes a validation_failed error when a non-2xx body does not match the DecisioningError contract (defensive)', async () => {
    const spy = mockFetchOnce({ ok: false, status: 400, body: { unexpected: 'shape' } });
    vi.stubGlobal('fetch', spy);
    const result = await postPass1(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.errorType).toBe('validation_failed');
      expect(result.error.pass).toBe(1);
    }
  });
});

describe('decisioningClient — network failure (spec-silence-because-happy-path-assumed)', () => {
  it('synthesizes an upstream_timeout error when fetch throws (browser offline / DNS failure)', async () => {
    const spy = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', spy);
    const result = await postPass1(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      // The five server-side errorType values assume the server completed the
      // request lifecycle; complete network failure is outside that envelope.
      // Synthesized as the closest semantic match: upstream_timeout, retryable.
      expect(result.error.errorType).toBe('upstream_timeout');
      expect(result.error.retryable).toBe(true);
      expect(result.error.pass).toBe(1);
    }
  });

  it('synthesizes a malformed_model_json error when the response body is unparseable', async () => {
    const spy = vi.fn().mockResolvedValueOnce({
      ok: true,
      status: 200,
      json: async () => {
        throw new SyntaxError('Unexpected token');
      },
    });
    vi.stubGlobal('fetch', spy);
    const result = await postPass1(profile);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.errorType).toBe('malformed_model_json');
    }
  });
});

describe('decisioningClient — discipline boundary: no server-internal imports', () => {
  // Source-read structural guard. The client imports fetch + schemas only —
  // no Upstash, no Redis, no cost-protection utility. The server is the source
  // of truth for L1/L3 cost protection (Decision 33); the client never
  // implements rate-limit counters, throttling, or auto-retry.
  const src = readFileSync('lib/api/decisioningClient.ts', 'utf-8');
  const fromPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

  it('imports zero server-internal cost-protection modules', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/upstash|redis/i);
      expect(p).not.toMatch(/costprotection|rateLimit|killSwitch/);
    }
  });
});
