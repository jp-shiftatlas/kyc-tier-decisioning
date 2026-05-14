'use client';
// lib/orchestration/personaPlayback.ts
// Persona playback orchestration — Batch 9.3.
//
// usePersonaPlayback wires loadPersona data into the 9.1 state machine's
// trigger callbacks: when a persona is selected, it drives the machine through
// idle → pass_1 → pass_2 → passed_first_audit using the persona's pre-generated
// Pass 1 + Pass 2 outputs, instead of API calls. The ticker (9.2) reads from
// the machine state + persona data and animates identically to live mode.
//
// SCOPE (reconciled at the 9.3 dispatch-prep spec walk — Finding E): this is
// the orchestration HOOK only. There is no persona-selector UI in the codebase
// and no assembled demo page (app/page.tsx is a token-verification harness;
// its own docstring defers "real page assembly" to Batch 10). The persona-
// selector UI and the page-level wiring are Batch 10 (assembly layer). 9.3
// produces the hook; Batch 10 consumes it. This preserves the layering:
// 9.1/9.2/9.3/9.4 = orchestration layer; Batch 10 = assembly layer.
//
// === SPEC ANCHORS (multi-anchor synthesis per Batch 6+ docstring discipline) ===
//
//   Decision 27 — persona playback locks PASS clean for all four personas; no
//     Pass 3 / re-audit / cap-reached. Verified: personas.json carries
//     correction_required:false for all four (Maria/Carlos/Persona C/
//     Persona D). The machine transitions idle → pass_1 → pass_2 →
//     passed_first_audit and stops. onPass3Start is DELIBERATELY OMITTED from
//     the triggers (see below) — a future maintainer who engineers a Pass-3
//     persona produces a structural failure, not a silent scope violation.
//   Decision 33 — persona playback is exempt from L1/L3 cost protection
//     because NO API calls fire. This hook imports only loadPersona (a
//     client-side JSON read) and useDecisioningMachine. Zero fetch / API
//     imports — structurally guaranteed, regression-guarded at the test layer
//     (fetch spy never called + source-read import guard).
//   Decision 34a / 41e — loadPersona is the CANONICAL entry point: it reads
//     personas.json, applies the schema normalizers (normalizeWireVariants /
//     normalizePass1 / normalizePass2), Zod-validates, returns typed output.
//     This hook uses loadPersona exclusively — never the raw personas.json
//     import — preserving the normalization + validation pipeline.
//   Decision 41a — symmetric animation. usePersonaPlayback feeds the SAME
//     useDecisioningMachine resolution functions via the SAME
//     DecisioningTriggers interface that live mode (9.4) will use. The
//     state-machine consumer code cannot tell which mode is active. The ticker
//     (9.2 AuditPanelTicker) animates identically in both modes.
//   9.1 state-machine contract + 9.2 ticker contract — consumed, not
//     re-derived. usePersonaPlayback returns the full DecisioningMachine; the
//     Batch 10 page assembly reads .state for rendering and may use
//     .setAnalystActionTaken / .setOverrideModalOpen for the
//     AnalystControlPanel race wiring.
//
// === INTER-PASS TIMING — Option A (instantaneous resolution) ===
//
// The trigger callbacks resolve SYNCHRONOUSLY: loadPersona already returned the
// persona data before the machine even starts, so there is no async work to
// "wait" for. onPass1Start immediately calls resolvePass1; onPass2Start
// immediately calls resolvePass2. No simulated latency, zero tuning parameters
// — purely state-machine-driven. (Option B, simulated latency, was rejected:
// no spec anchor, and the elapsed-time indicator is live-mode-only anyway per
// Finding B from 9.2, so persona mode shows no "work being done" framing.)
// Spec-silence-as-gap; Batch 11 ratification.
//
// This synchronous-resolution pattern is exactly what exposed Finding H — the
// latent 9.1 drain-effect bug where CLEAR_TRIGGER, dispatched after a
// synchronously-resolving trigger, clobbered the freshly-set pendingTrigger.
// Fixed by A′ (CLEAR_TRIGGER before the callback) in the same commit as this
// hook. Without A′, this hook's cascade would stall at pass_2.
//
// === THE TRIGGER/RESOLUTION CIRCULAR DEPENDENCY ===
//
// The trigger callbacks need the machine's resolution functions, but the
// machine is created FROM the triggers. machineRef + personaRef break the
// cycle: the triggers close over the refs and read them only when INVOKED
// (inside the 9.1 drain effect, post-render) — the standard latest-value-ref
// pattern. By the time any trigger fires, both refs are populated.
//
// === loadPersona FAILURE — spec-silence-as-discipline ===
//
// loadPersona throws synchronously on an unknown id or a Zod validation
// failure. Caught here and surfaced as a typed DecisioningError via the state
// machine's fail() transition — the SAME path a live-mode API failure takes
// (Decision 34). No new error semantics. fail() is not valid from 'idle' (the
// 9.1 reducer's IN_FLIGHT_STATES excludes it), so the failure sequence is
// reset() → startPass1() → fail(): startPass1() advances to 'pass_1' for one
// synchronous reducer tick within the batched effect, then fail() advances to
// 'failed'. The intermediate 'pass_1' tick is unobservable — no render commits
// between synchronous dispatches in a single effect run.
//
// === MID-FLIGHT PERSONA SWITCH — spec-silence-because-happy-path-assumed ===
//
// When personaId changes mid-playback, the effect re-runs: reset() returns the
// machine to idle (clearing the prior persona's accumulated state and, via
// 9.1's pendingTrigger:null-on-reset + the drain effect's null-guard, dropping
// any stale in-flight trigger), then startPass1() begins the new persona.
// Batch 11 ratification.

import { useEffect, useMemo, useRef } from 'react';
import {
  loadPersona,
  type PersonaId,
  type LoadedPersona,
} from '@/lib/schemas/personaAdapters';
import {
  useDecisioningMachine,
  type DecisioningMachine,
  type DecisioningTriggers,
} from './stateMachine';
import type { DecisioningError } from '@/lib/schemas/apiError';

type PersonaLoadResult =
  | { ok: true; persona: LoadedPersona }
  | { ok: false; error: DecisioningError }
  | null; // null = no persona selected

export function usePersonaPlayback(personaId: PersonaId | null): DecisioningMachine {
  // loadPersona is the ONLY entry point for persona data. It throws
  // synchronously on a bad id or Zod failure — caught here, surfaced as a
  // typed DecisioningError.
  const loadResult = useMemo<PersonaLoadResult>(() => {
    if (!personaId) return null;
    try {
      return { ok: true, persona: loadPersona(personaId) };
    } catch (e) {
      return {
        ok: false,
        error: {
          pass: 1,
          errorType: 'validation_failed',
          message: `Persona '${personaId}' could not be loaded: ${
            e instanceof Error ? e.message : 'unknown error'
          }`,
          retryable: false,
        },
      };
    }
  }, [personaId]);

  // machineRef + personaRef break the trigger/resolution circular dependency.
  // Read only when a trigger is INVOKED (post-render, in the drain effect).
  const machineRef = useRef<DecisioningMachine | null>(null);
  const personaRef = useRef<LoadedPersona | null>(null);
  personaRef.current = loadResult?.ok ? loadResult.persona : null;

  // Persona-playback triggers — the SAME DecisioningTriggers interface live
  // mode uses. Synchronously resolve with persona data (Option A).
  //
  // onPass3Start is DELIBERATELY OMITTED. Decision 27: no persona exercises
  // Pass 3. A future maintainer who engineers a Pass-3 persona produces a
  // structural failure (the machine would enter pass_3 with no trigger to
  // advance it), surfacing the Decision 27 boundary violation — not a silent
  // scope creep. Structural enforcement of an architectural discipline, same
  // class as the @ts-expect-error cap-at-1 (9.1) and no-mode-prop (9.2) guards.
  const triggers = useMemo<DecisioningTriggers>(
    () => ({
      onPass1Start: () => {
        const p = personaRef.current;
        if (p) machineRef.current?.resolvePass1(p.pass_1);
      },
      onPass2Start: () => {
        const p = personaRef.current;
        if (p) machineRef.current?.resolvePass2(p.pass_2);
      },
    }),
    [],
  );

  const machine = useDecisioningMachine(triggers);
  machineRef.current = machine;

  useEffect(() => {
    const m = machineRef.current;
    if (!m) return;

    if (loadResult === null) {
      // No persona selected — return the machine to idle.
      m.reset();
      return;
    }

    // reset() clears any prior persona's accumulated state (the mid-flight
    // persona-switch case). startPass1() begins the new persona — kicking the
    // synchronous trigger cascade for the happy path.
    m.reset();
    m.startPass1();

    if (!loadResult.ok) {
      // loadPersona failed — surface via fail(). See the docstring's
      // "loadPersona FAILURE" section for the reset → startPass1 → fail
      // sequencing rationale.
      m.fail(loadResult.error);
    }
  }, [loadResult]);

  return machine;
}
