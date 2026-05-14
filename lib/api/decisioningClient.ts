// lib/api/decisioningClient.ts
// Typed client wrapper for the /api/decisioning route — Batch 9.4.
//
// Encapsulates the ACTUAL route contract (verified at the 9.4 dispatch-prep
// spec walk against app/api/decisioning/route.ts — Finding J). Route-contract
// knowledge localizes to this one file: when the route contract evolves (e.g.
// a future Pass 3 orchestration-envelope change, or a Pass-schema field
// rename like the Finding 20 corrected_pass_1 → corrected_pass_1_output
// closure), the update touches this file + its tests, not every fetch call
// scattered through the orchestration hook.
//
// === ROUTE CONTRACT (as verified, NOT as the 9.4 directive described it) ===
//
// Finding J corrected three drifts between the directive's described contract
// and the actual route:
//
//   1. Pass 3 body — the route requires an `orchestration: { audit_id: string,
//      attempt: number }` envelope where `attempt` is a POSITIVE integer
//      (z.number().int().positive()). The directive's `correction_attempt_
//      number: 0` was wrong on both counts: 0 fails validation, and the field
//      name does not match.
//   2. Success responses are BARE — the route returns `result.data` directly
//      (route line 304). The body IS the Pass1Output / Pass2Output /
//      Pass3Output, NOT wrapped in `{ pass1: ... }`. Returned here as
//      `{ ok: true, data: <bare body> }`; the state machine's resolvePassN
//      re-validates via Zod (Finding 8 double-validation discipline).
//   3. No Retry-After header. The route emits X-RateLimit-Limit/Remaining/
//      Reset headers (Addition 2 — browser dev-tools visibility, NOT
//      client-consumed) and embeds the institutional-register retry message
//      directly in DecisioningError.message (route lines 168–173). So 429
//      handling collapses to "non-2xx → body is DecisioningError → fail(body)"
//      — zero client-side header parsing.
//
// Error responses: the route returns the bare DecisioningError as the body
// with status 400 (validation_failed / model errors), 429 (rate_limited /
// cap_reached), or 502 (malformed_model_json / upstream_timeout).
//
// === NETWORK FAILURE — spec-silence-because-happy-path-assumed ===
//
// The five DecisioningError errorType values assume the server completed the
// request lifecycle. Complete network failure (browser offline, DNS failure,
// connection refused — fetch() throws) is outside that envelope. Synthesized
// here as the closest semantic match: errorType 'upstream_timeout',
// retryable: true (the user can re-submit when their network recovers).
// Batch 11 ratification of the synthesized mapping.
//
// === DISCIPLINE BOUNDARY — no server-internal logic ===
//
// This client imports fetch + schemas only. It does NOT import Upstash, Redis,
// or any cost-protection utility — the server is the source of truth for L1/L3
// cost protection (Decision 33). No client-side rate-limit counters, no
// client-side throttling, no auto-retry. Regression-guarded by a source-read
// import guard in the test suite.

import type { CustomerProfile } from '@/lib/schemas/customerProfile';
import type { Pass1Output } from '@/lib/schemas/pass1';
import type { Pass2Output } from '@/lib/schemas/pass2';
import { DecisioningErrorSchema, type DecisioningError } from '@/lib/schemas/apiError';

// Discriminated result. `ok` carries the same semantics as fetch's Response.ok
// — a completed, non-error (status < 400) response. `data` is the bare success
// body (unknown — the state machine's resolvePassN re-validates).
export type ClientResult =
  | { ok: true; data: unknown }
  | { ok: false; error: DecisioningError };

export interface OrchestrationContext {
  audit_id: string;
  // Positive integer per the route's z.number().int().positive(). For the v1
  // cap-at-1 case this is always 1; the orchestration hook derives it as
  // state.attemptCount + 1 (forward-compatible with a Decision 21 v2 cap-raise).
  attempt: number;
}

const ROUTE = '/api/decisioning';

async function postPass(pass: 1 | 2 | 3, body: unknown): Promise<ClientResult> {
  let res: Response;
  try {
    res = await fetch(`${ROUTE}?pass=${pass}`, {
      method: 'POST',
      headers: { 'content-type': 'application/json' },
      body: JSON.stringify(body),
    });
  } catch {
    // Network failure — no HTTP response. Synthesize upstream_timeout.
    return {
      ok: false,
      error: {
        pass,
        errorType: 'upstream_timeout',
        message:
          'The request could not be completed — check your network connection and try again.',
        retryable: true,
      },
    };
  }

  let json: unknown;
  try {
    json = await res.json();
  } catch {
    return {
      ok: false,
      error: {
        pass,
        errorType: 'malformed_model_json',
        message: 'The server response could not be parsed.',
        retryable: false,
      },
    };
  }

  if (res.ok) {
    // Bare success body — the Pass output directly (Finding J #2).
    return { ok: true, data: json };
  }

  // Non-2xx — the body is a DecisioningError, returned bare by the route.
  const parsed = DecisioningErrorSchema.safeParse(json);
  if (parsed.success) return { ok: false, error: parsed.data };
  // Defensive: a non-2xx body that does not match the DecisioningError
  // contract. Should not happen against the real route, but the client does
  // not trust the wire.
  return {
    ok: false,
    error: {
      pass,
      errorType: 'validation_failed',
      message: 'The server returned an error in an unrecognized shape.',
      retryable: false,
    },
  };
}

export function postPass1(profile: CustomerProfile): Promise<ClientResult> {
  return postPass(1, { profile });
}

export function postPass2(input: {
  profile: CustomerProfile;
  pass1: Pass1Output;
}): Promise<ClientResult> {
  // Reused for the original audit AND the re-audit (Decision 32 "no
  // signaling"). The body shape is IDENTICAL in both cases — { profile,
  // pass1 } — only the pass1 VALUE differs (the original Pass 1 output vs the
  // corrected Pass 1 from Pass 3). The server cannot distinguish original
  // audit from re-audit; the client state machine knows via its state value.
  // No re_audit flag, no attempt counter, no signaling field.
  return postPass(2, { profile: input.profile, pass1: input.pass1 });
}

export function postPass3(input: {
  profile: CustomerProfile;
  pass1: Pass1Output;
  pass2: Pass2Output;
  orchestration: OrchestrationContext;
}): Promise<ClientResult> {
  return postPass(3, {
    profile: input.profile,
    pass1: input.pass1,
    pass2: input.pass2,
    orchestration: input.orchestration,
  });
}
