import { describe, it, expect, vi, afterEach } from 'vitest';
import { renderHook, act, waitFor, cleanup } from '@testing-library/react';
import { readFileSync } from 'node:fs';
import { useLiveDecisioning } from './liveDecisioning';
import { loadPersona } from '@/lib/schemas/personaAdapters';
import type { Pass2Output } from '@/lib/schemas/pass2';
import type { Pass3Output } from '@/lib/schemas/pass3';
import type { DecisioningError, DecisioningErrorType } from '@/lib/schemas/apiError';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
});

// === Fixtures (real schema-validated persona data) ===
const maria = loadPersona('maria');
const carlos = loadPersona('carlos');
const profile = maria.profile;
const pass1 = maria.pass_1;
const pass2Clean: Pass2Output = maria.pass_2; // correction_required: false
const pass2Correction: Pass2Output = { ...maria.pass_2, correction_required: true };
const reAuditClean: Pass2Output = { ...carlos.pass_2, correction_required: false };
const reAuditStillFlagged: Pass2Output = { ...carlos.pass_2, correction_required: true };
const pass3Fixture: Pass3Output = {
  correction_against_audit_id: 'audit-live-test-20260515120000',
  correction_attempt_number: 1,
  corrected_pass_1: carlos.pass_1,
  change_log: [
    {
      field: 'decision.recommended_tier',
      before: 'Standard',
      after: 'EDD',
      reason: 'ES-03 surfaced by Pass 2; tier corrected.',
    },
  ],
};

// Response-like builders.
const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });
const err = (status: number, error: DecisioningError) => ({
  ok: false,
  status,
  json: async () => error,
});

// Install a fetch mock that resolves the given responses in call order.
function stubFetchSequence(...responses: unknown[]) {
  const spy = vi.fn();
  for (const r of responses) spy.mockResolvedValueOnce(r);
  vi.stubGlobal('fetch', spy);
  return spy;
}

// Parse the [url, init] of the Nth (0-indexed) fetch call.
function fetchCall(spy: ReturnType<typeof vi.fn>, n: number): { url: string; body: any } {
  const call = spy.mock.calls[n];
  return { url: String(call[0]), body: JSON.parse(String((call[1] as RequestInit).body)) };
}

describe('useLiveDecisioning — happy path (no correction)', () => {
  it('startLiveRun → POST pass=1 → POST pass=2 (clean) → passed_first_audit', async () => {
    stubFetchSequence(ok(pass1), ok(pass2Clean));
    const { result } = renderHook(() => useLiveDecisioning());

    act(() => {
      result.current.startLiveRun(profile);
    });

    await waitFor(() => expect(result.current.state.state).toBe('passed_first_audit'));
    expect(result.current.state.pass1Output).not.toBeNull();
    expect(result.current.state.pass2Output).not.toBeNull();
    expect(result.current.state.attemptCount).toBe(0);
  });
});

describe('useLiveDecisioning — Pass 3 correction path', () => {
  it('Pass 2 correction_required → Pass 3 → re-audit clean → corrected_and_verified', async () => {
    stubFetchSequence(ok(pass1), ok(pass2Correction), ok(pass3Fixture), ok(reAuditClean));
    const { result } = renderHook(() => useLiveDecisioning());

    act(() => {
      result.current.startLiveRun(profile);
    });

    await waitFor(() => expect(result.current.state.state).toBe('corrected_and_verified'));
    expect(result.current.state.attemptCount).toBe(1);
    expect(result.current.state.pass3Output).not.toBeNull();
    expect(result.current.state.reAuditOutput).not.toBeNull();
  });
});

describe('useLiveDecisioning — cap-reached path', () => {
  it('Pass 3 + re-audit both correction_required → correction_failed_surfaced', async () => {
    stubFetchSequence(ok(pass1), ok(pass2Correction), ok(pass3Fixture), ok(reAuditStillFlagged));
    const { result } = renderHook(() => useLiveDecisioning());

    act(() => {
      result.current.startLiveRun(profile);
    });

    await waitFor(() =>
      expect(result.current.state.state).toBe('correction_failed_surfaced'),
    );
    expect(result.current.state.attemptCount).toBe(1);
  });
});

describe('useLiveDecisioning — Decision 32 no-signaling (structural)', () => {
  it('original Pass 2 and re-audit Pass 2 have IDENTICAL body shape; Pass 3 carries the orchestration envelope', async () => {
    const spy = stubFetchSequence(
      ok(pass1),
      ok(pass2Correction),
      ok(pass3Fixture),
      ok(reAuditClean),
    );
    const { result } = renderHook(() => useLiveDecisioning());
    act(() => {
      result.current.startLiveRun(profile);
    });
    await waitFor(() => expect(result.current.state.state).toBe('corrected_and_verified'));

    // Call 0 = pass=1, call 1 = pass=2 (original audit), call 2 = pass=3,
    // call 3 = pass=2 (re-audit).
    const originalAudit = fetchCall(spy, 1);
    const reAudit = fetchCall(spy, 3);
    expect(originalAudit.url).toContain('?pass=2');
    expect(reAudit.url).toContain('?pass=2');
    // Identical body SHAPE — same keys, only the pass1 value differs. No
    // re_audit flag, no attempt counter, no signaling field in either.
    expect(Object.keys(originalAudit.body).sort()).toEqual(['pass1', 'profile']);
    expect(Object.keys(reAudit.body).sort()).toEqual(['pass1', 'profile']);

    // Pass 3 carries the orchestration: { audit_id, attempt } envelope
    // (Finding J #1) — NOT a top-level correction_attempt_number.
    const pass3Call = fetchCall(spy, 2);
    expect(pass3Call.url).toContain('?pass=3');
    expect(Object.keys(pass3Call.body).sort()).toEqual([
      'orchestration',
      'pass1',
      'pass2',
      'profile',
    ]);
    expect(pass3Call.body.orchestration.audit_id).toMatch(/^audit-/);
    expect(pass3Call.body.orchestration.attempt).toBe(1); // v1 cap-at-1
  });
});

describe('useLiveDecisioning — re-audit onPass2Start symmetry (Decision 32)', () => {
  it('the re-audit POST carries pass1 === pass3.corrected_pass_1', async () => {
    const spy = stubFetchSequence(
      ok(pass1),
      ok(pass2Correction),
      ok(pass3Fixture),
      ok(reAuditClean),
    );
    const { result } = renderHook(() => useLiveDecisioning());
    act(() => {
      result.current.startLiveRun(profile);
    });
    await waitFor(() => expect(result.current.state.state).toBe('corrected_and_verified'));

    // The 4th fetch call (re-audit) carries the CORRECTED Pass 1 from Pass 3.
    // (Finding 20: pass3.corrected_pass_1 is the schema's current field name;
    // the corrected_pass_1_output rename, when it lands, updates this
    // assertion as part of Finding 20's closure scope.)
    const reAudit = fetchCall(spy, 3);
    expect(reAudit.body.pass1).toEqual(pass3Fixture.corrected_pass_1);
  });
});

describe('useLiveDecisioning — Decision 34 typed-error handling', () => {
  const ERROR_TYPES: DecisioningErrorType[] = [
    'malformed_model_json',
    'validation_failed',
    'upstream_timeout',
    'rate_limited',
    'cap_reached',
  ];

  for (const errorType of ERROR_TYPES) {
    it(`routes a Pass 1 ${errorType} response to the failed terminal state`, async () => {
      const serverError: DecisioningError = {
        pass: 1,
        errorType,
        message: `Server reported ${errorType}.`,
        retryable: errorType === 'malformed_model_json' || errorType === 'validation_failed'
          ? true
          : false,
      };
      const status = errorType === 'rate_limited' || errorType === 'cap_reached' ? 429 : 400;
      stubFetchSequence(err(status, serverError));
      const { result } = renderHook(() => useLiveDecisioning());
      act(() => {
        result.current.startLiveRun(profile);
      });
      await waitFor(() => expect(result.current.state.state).toBe('failed'));
      expect(result.current.state.error?.errorType).toBe(errorType);
      expect(result.current.state.error?.pass).toBe(1);
    });
  }
});

describe('useLiveDecisioning — Decision 33 429 handling (no auto-retry, no header parsing)', () => {
  it('a 429 rate_limited response → failed terminal; exactly ONE fetch call (no auto-retry)', async () => {
    const rateLimited: DecisioningError = {
      pass: 1,
      errorType: 'rate_limited',
      message:
        'Live generation limit reached for this hour. Pre-generated examples remain available.',
      retryable: false,
    };
    const spy = stubFetchSequence(err(429, rateLimited));
    const { result } = renderHook(() => useLiveDecisioning());
    act(() => {
      result.current.startLiveRun(profile);
    });
    await waitFor(() => expect(result.current.state.state).toBe('failed'));
    expect(result.current.state.error?.errorType).toBe('rate_limited');
    // Decision 34c — no auto-retry. The route's DecisioningError.message
    // already carries the institutional-register retry framing; the client
    // does not parse a Retry-After header or auto-retry.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('useLiveDecisioning — network failure (spec-silence-because-happy-path-assumed)', () => {
  it('fetch rejection → synthesized upstream_timeout DecisioningError → failed terminal', async () => {
    const spy = vi.fn().mockRejectedValueOnce(new TypeError('Failed to fetch'));
    vi.stubGlobal('fetch', spy);
    const { result } = renderHook(() => useLiveDecisioning());
    act(() => {
      result.current.startLiveRun(profile);
    });
    await waitFor(() => expect(result.current.state.state).toBe('failed'));
    expect(result.current.state.error?.errorType).toBe('upstream_timeout');
    expect(result.current.state.error?.retryable).toBe(true);
    // No auto-retry — exactly one fetch attempt.
    expect(spy).toHaveBeenCalledTimes(1);
  });
});

describe('useLiveDecisioning — Decision 36h race semantics (setters exposed via the returned machine)', () => {
  // Finding I: the race-flag SETTERS are exposed via the returned machine (9.1
  // passthrough). These tests exercise the race capability by calling the
  // setters directly via renderHook — the AnalystControlPanel-event → setter
  // wiring is Batch 10. This is the correct test shape for 9.4.

  it('sub-case (a): analyst action taken mid-flight → raceSignalActionTaken fires on the terminal transition', async () => {
    stubFetchSequence(ok(pass1), ok(pass2Correction), ok(pass3Fixture), ok(reAuditClean));
    const { result } = renderHook(() => useLiveDecisioning());
    act(() => {
      result.current.startLiveRun(profile);
      // Analyst commits to a decision while the correction pipeline runs.
      result.current.setAnalystActionTaken(true);
    });
    await waitFor(() => expect(result.current.state.state).toBe('corrected_and_verified'));
    expect(result.current.state.raceSignalActionTaken).toBe(true);
  });

  it('sub-case (b): Override modal open when Pass 3 fires → raceSignalModalOpen fires', async () => {
    stubFetchSequence(ok(pass1), ok(pass2Correction), ok(pass3Fixture), ok(reAuditClean));
    const { result } = renderHook(() => useLiveDecisioning());
    act(() => {
      result.current.startLiveRun(profile);
      result.current.setOverrideModalOpen(true);
    });
    // raceSignalModalOpen is raised when the machine enters 'pass_3' with the
    // modal-open flag set; it persists through to the terminal state.
    await waitFor(() => expect(result.current.state.state).toBe('corrected_and_verified'));
    expect(result.current.state.raceSignalModalOpen).toBe(true);
  });
});

describe('useLiveDecisioning — re-submission safety (Decision 33)', () => {
  it('a second startLiveRun resets and restarts cleanly', async () => {
    stubFetchSequence(
      ok(pass1),
      ok(pass2Clean),
      // second run
      ok(carlos.pass_1),
      ok(carlos.pass_2),
    );
    const { result } = renderHook(() => useLiveDecisioning());

    act(() => {
      result.current.startLiveRun(profile);
    });
    await waitFor(() => expect(result.current.state.state).toBe('passed_first_audit'));

    // User re-submits the form — reset() + startPass1() restart cleanly.
    act(() => {
      result.current.startLiveRun(carlos.profile);
    });
    await waitFor(() => expect(result.current.state.state).toBe('passed_first_audit'));
    expect(result.current.state.pass1Output).toEqual(carlos.pass_1);
  });
});

describe('useLiveDecisioning — structural guards', () => {
  // Source-read structural guards — the static-analysis siblings of the
  // runtime tests. The live hook DOES route through fetch (via the
  // decisioningClient); it does NOT contain server-internal cost-protection
  // logic. The persona hook (9.3) does NOT touch fetch/the client at all.
  const liveSrc = readFileSync('lib/orchestration/liveDecisioning.ts', 'utf-8');
  const liveFromPaths = [...liveSrc.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);
  const personaSrc = readFileSync('lib/orchestration/personaPlayback.ts', 'utf-8');
  const personaFromPaths = [...personaSrc.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

  it('the live hook routes through the decisioningClient (Decision 33: server is the cost-protection authority)', () => {
    expect(liveFromPaths).toContain('@/lib/api/decisioningClient');
  });

  it('the live hook imports zero server-internal cost-protection modules (no L1/L3 client-side logic)', () => {
    for (const p of liveFromPaths) {
      expect(p).not.toMatch(/upstash|redis/i);
      expect(p).not.toMatch(/costprotection|rateLimit|killSwitch/);
    }
  });

  it('the persona hook (9.3) imports neither the decisioningClient nor fetch — persona playback is API-free (Decision 33)', () => {
    expect(personaFromPaths).not.toContain('@/lib/api/decisioningClient');
    for (const p of personaFromPaths) {
      expect(p).not.toMatch(/decisioningClient|\bfetch\b/);
    }
  });
});
