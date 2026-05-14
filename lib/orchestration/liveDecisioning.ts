'use client';
// lib/orchestration/liveDecisioning.ts
// Live decisioning orchestration — Batch 9.4.
//
// useLiveDecisioning drives the 9.1 state machine from real /api/decisioning
// calls. CustomInputForm submit → startLiveRun(profile) → state-machine
// startPass1() → async trigger callbacks dispatch POST /api/decisioning?pass=N
// → responses feed resolvePassN / fail() → component prop updates via the
// machine state. The 9.2 ticker reads machine state and animates identically
// to persona playback (Decision 41a symmetry).
//
// usePersonaPlayback (9.3) is the synchronous-resolution SIBLING of this hook:
// both feed the SAME useDecisioningMachine with the SAME DecisioningTriggers
// interface — persona triggers resolve synchronously from loadPersona data,
// live triggers resolve asynchronously from fetch. The state-machine consumer
// code cannot tell which mode is active (no mode-branching). The async trigger
// path is exactly what the A′ drain-effect fix (Finding H, 9.3) was built for:
// CLEAR_TRIGGER fires before the async callback returns, so the batch is just
// [CLEAR_TRIGGER] and the later fetch resolution sets the next trigger fresh.
//
// SCOPE (reconciled at the 9.4 dispatch-prep spec walk):
//   Finding I — AnalystControlPanel emits no events; the race-semantics
//     "wiring from AnalystControlPanel events" is structurally a Batch 10
//     page-assembly concern (a hook cannot subscribe to a component's
//     events). 9.4 EXPOSES setAnalystActionTaken / setOverrideModalOpen via
//     the returned machine (9.1 passthrough — no new surface) and is tested
//     by calling those setters directly via renderHook. AnalystControlPanel
//     gaining event-callback props + the actual event→setter wiring are
//     Batch 10. Same orchestration/assembly layering as 9.3's Finding E.
//   Finding L — no API client existed; lib/api/decisioningClient.ts is the
//     typed route-contract wrapper this hook consumes. Route-contract
//     knowledge localizes there.
//
// === SPEC ANCHORS (multi-anchor synthesis per Batch 6+ docstring discipline) ===
//
//   Decision 32 — per-pass POST, re-audit reuses ?pass=2 with no signaling.
//     onPass2Start dispatches postPass2({ profile, pass1 }) identically for
//     the original audit and the re-audit; only input.pass1 differs (the
//     original Pass 1 output vs the corrected Pass 1 from Pass 3, decided by
//     the 9.1 reducer). The client and the server cannot tell them apart.
//   Decision 33 — L1/L3 cost protection is server-side. This hook handles
//     non-2xx (incl. 429) uniformly: the response body is a DecisioningError,
//     routed through the machine's fail(). NO client-side rate-limit logic,
//     NO Retry-After parsing (the route embeds the institutional-register
//     message in DecisioningError.message — Finding J #3), NO auto-retry
//     (Decision 34c). The user re-submits the form to retry; re-submission is
//     reset()-safe.
//   Decision 34 — DecisioningError discriminated union. Every non-2xx
//     response (5 errorType values) + every synthesized client-side error
//     (network failure → upstream_timeout) routes through fail(); the machine
//     advances to 'failed' with the typed error in state.error.
//   Decision 36h — race semantics. The race-flag SETTERS are exposed via the
//     returned machine (9.1 passthrough). The orchestration's response
//     handling routes cleanly through resolvePassN / fail() and never touches
//     the race flags. Batch 10 wires AnalystControlPanel events to the setters.
//   Decision 41c — errors route through fail() → 'failed' terminal; the 9.2
//     ticker's shouldAnimate derivation already skips animation on 'failed'.
//   9.1 post-A′ state-machine contract + 9.3 usePersonaPlayback architectural
//     shape — consumed, not re-derived.
//
// === audit_id — spec-silence-as-gap (Finding M) ===
//
// The Pass 3 orchestration envelope's audit_id: one ID per live run, generated
// at startLiveRun time and shared across Pass 1/2/3 — the established Batch 8
// pattern (auditReferenceId helper + AnalystControlPanel.auditRefSource).
// What audit_id formally represents in the orchestration envelope (run id?
// Pass-2-audit id? telemetry key?) is not pinned in the corpus. Implemented
// against the run-id pattern; Batch 11 ratification of the formal semantic.
//
// === attempt — structural-comment-makes-discipline-legible ===
//
// The Pass 3 envelope's attempt is derived as state.attemptCount + 1. When
// onPass3Start fires, the machine is in 'pass_3' with attemptCount still 0
// (it increments on resolvePass3, not on entry to 'pass_3'), so attempt = 1
// for the v1 Decision 21 cap-at-1 single attempt. The derivation is
// forward-compatible with a v2 cap-raise (first attempt → 1, second → 2, …)
// with no v1 modification needed.

import { useCallback, useMemo, useRef } from 'react';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';
import {
  useDecisioningMachine,
  type DecisioningMachine,
  type DecisioningTriggers,
} from './stateMachine';
import { generateAuditReferenceId } from './auditReferenceId';
import { postPass1, postPass2, postPass3 } from '@/lib/api/decisioningClient';

// useLiveDecisioning returns the full DecisioningMachine PLUS startLiveRun.
// Live mode needs an explicit kickoff trigger because a form submit is an
// EVENT, not a prop (persona playback auto-kicks via the personaId prop). The
// asymmetry is inherent and the type reflects it honestly.
export interface LiveDecisioningMachine extends DecisioningMachine {
  startLiveRun: (profile: CustomerProfile) => void;
}

export function useLiveDecisioning(): LiveDecisioningMachine {
  // machineRef / profileRef / auditIdRef break the trigger/resolution circular
  // dependency and give the async trigger callbacks the latest run context.
  // Read only when a trigger is INVOKED (post-render, in the drain effect) or
  // when a fetch resolves — the standard latest-value-ref pattern.
  const machineRef = useRef<DecisioningMachine | null>(null);
  const profileRef = useRef<CustomerProfile | null>(null);
  const auditIdRef = useRef<string | null>(null);

  // Async trigger callbacks — the live-mode resolution pattern. Each dispatches
  // a POST and, when the fetch resolves, calls resolvePassN (success) or
  // fail() (DecisioningError). SAME DecisioningTriggers interface persona
  // playback uses; the state-machine consumer code cannot tell the modes apart.
  const triggers = useMemo<DecisioningTriggers>(
    () => ({
      onPass1Start: async () => {
        const profile = profileRef.current;
        if (!profile) return;
        const r = await postPass1(profile);
        if (r.ok) machineRef.current?.resolvePass1(r.data);
        else machineRef.current?.fail(r.error);
      },
      onPass2Start: async (input) => {
        const profile = profileRef.current;
        if (!profile) return;
        // Reused for original audit AND re-audit (Decision 32 no-signaling).
        // input.pass1 is the original Pass 1 output OR the corrected Pass 1
        // from Pass 3 — the 9.1 reducer decides; the client cannot tell.
        const r = await postPass2({ profile, pass1: input.pass1 });
        if (r.ok) machineRef.current?.resolvePass2(r.data);
        else machineRef.current?.fail(r.error);
      },
      onPass3Start: async (input) => {
        const profile = profileRef.current;
        const auditId = auditIdRef.current;
        if (!profile || !auditId) return;
        const r = await postPass3({
          profile,
          pass1: input.pass1,
          pass2: input.pass2,
          orchestration: {
            audit_id: auditId,
            // attempt = attemptCount + 1 — see the docstring "attempt" note.
            // attemptCount is 0 when onPass3Start fires → attempt = 1 (v1).
            attempt: (machineRef.current?.state.attemptCount ?? 0) + 1,
          },
        });
        if (r.ok) machineRef.current?.resolvePass3(r.data);
        else machineRef.current?.fail(r.error);
      },
    }),
    [],
  );

  const machine = useDecisioningMachine(triggers);
  machineRef.current = machine;

  const startLiveRun = useCallback((profile: CustomerProfile) => {
    profileRef.current = profile;
    // One audit_id per live run, shared across Pass 1/2/3 (Finding M; Batch 8
    // pattern). sessionSeed combines the customer reference + a run timestamp
    // for a run-stable, collision-resistant seed.
    auditIdRef.current = generateAuditReferenceId({
      kind: 'live',
      sessionSeed: `${profile.customer_reference}-${Date.now()}`,
    });
    const m = machineRef.current;
    if (!m) return;
    // reset() makes re-submission safe (Decision 33: the user re-submits the
    // form to retry; cost-protection state lives server-side in Redis).
    // startPass1() kicks the async trigger cascade.
    m.reset();
    m.startPass1();
  }, []);

  return { ...machine, startLiveRun };
}
