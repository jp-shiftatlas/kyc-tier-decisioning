'use client';
// lib/orchestration/stateMachine.ts
// Decisioning orchestration state machine — Batch 9.1.
//
// Sequences Pass 1 → Pass 2 → conditional Pass 3 → re-audit → terminal. Owns
// the correction-attempt counter, surfaces typed DecisioningError, and exposes
// the consumable state contract that Batch 9.2 (ticker), 9.3 (persona playback
// wiring), and 9.4 (live decisioning hooks) consume forward. Logic only — no
// animation, no fetch, no loadPersona wiring, no component prop updates.
//
// === SPEC ANCHORS (multi-anchor synthesis per Batch 6+ docstring discipline) ===
//
//   07_PASS_3_DESIGN.md §4 / :265–292 — the canonical state-machine pseudocode.
//     BINDING METHOD: inlined-extraction. 07_PASS_3_DESIGN.md is parent-thread
//     knowledge, not in the worktree; the Batch 9.1 dispatch directive inlined
//     the load-bearing extraction (the 9-value state enumeration verbatim, all
//     flow paths, cap-enforcement rationale, the "Pass 3's prompt is stateless;
//     orchestration is stateful" discipline, the §4.2 "no signaling" re-audit
//     discipline, and the full API surface). This module binds to that inlined
//     extraction as authoritative; the binding-method is recorded in the Batch
//     9.1 synthesis doc for future reconciliation against the raw pseudocode.
//   Decision 21 — cap-at-1 lives in orchestration, not the prompt. The machine
//     owns attemptCount; the model echoes correction_attempt_number from input.
//     attemptCount is typed `0 | 1` — the cap is a TYPE constraint, not just a
//     runtime guard. No reducer path increments past 1; from `re_audit` with
//     correction_required:true the only outcome is `correction_failed_surfaced`.
//   Decision 32 — re-audit reuses the pass=2 path with NO signaling. The server
//     route does not distinguish original audit from re-audit; the client
//     machine does (via its state value). Made structural here: the re-audit
//     trigger reuses the SAME `onPass2Start` callback as the original audit,
//     invoked with `{ pass1 }` only — the callback cannot tell them apart.
//     The re-audit's `pass1` input is the corrected Pass 1 (pass3 output);
//     no change_log, no correction metadata leaks into the trigger payload.
//   Decision 34 — DecisioningError discriminated-union; NO automatic retry in
//     v1. `fail()` is a one-way transition to `'failed'`; the reducer has no
//     path that auto-retries a failed pass. The discriminated-union state
//     encoding (failure modes encoded in the type, not magic values) follows
//     the same canonical pattern as DecisioningError itself.
//   Decision 36h — race semantics, two independent sub-cases:
//     (a) analyst action taken on the uncorrected output → race signal fires
//         when state advances to `corrected_and_verified` / `correction_failed
//         _surfaced` (the terminal transition) with analystActionTaken set.
//     (b) Override modal open when Pass 3 fires → race signal fires when state
//         advances to `pass_3` with overrideModalOpen set.
//     Both flags are consumer-set; the machine reads them, derives the signals,
//     exposes the signals via the state payload. Signals are independent.
//   Decision 41c — failure path skips animation. The `'failed'` terminal state
//     is reachable from any in-flight pass; consumers distinguish "data ready,
//     animate" (any non-`failed` terminal) from "error, render directly"
//     (`'failed'`). NOTE — label drift: visual_system.md §5.8 labels this
//     sub-decision "Decision 41 S2"; 03_DESIGN_DECISIONS.md / this directive
//     use "Decision 41c". Same decision; the label convention diverges between
//     two durable-state files. Recorded in the synthesis doc Things-to-Flag for
//     parent-thread reconciliation at Batch 11. Code/test/docstring use "41c"
//     consistently per the directive.
//   lib/schemas/pass1.ts / pass2.ts / pass3.ts — the validated contracts the
//     machine outputs reference (post-2babca2 corrected pass1.ts shape).
//     Pass3Output's corrected-Pass-1 field is read as `corrected_pass_1` (the
//     schema name as it currently exists). Finding 20: the canonical contract
//     name is `corrected_pass_1_output` (07_PASS_3_DESIGN.md:77,280,459 +
//     03_DESIGN_DECISIONS.md:370,389); pass3.ts:36's `corrected_pass_1` is
//     Batch 1 schema drift, same class as Findings 9/10/19. A small mechanical
//     schema-correction commit closes Finding 20 before Batch 10; this module
//     and its re-audit anti-pattern test update to `corrected_pass_1_output`
//     as part of that closure scope, not a 9.1 concern.
//
// === 'failed' STATE — project-addition beyond the canonical pseudocode ===
//
// The canonical 07_PASS_3_DESIGN.md pseudocode assumes happy-path API success
// and silently does not enumerate failure states — a fourth silence category
// ("spec-silence-because-happy-path-assumed", implied by the three-silence
// framework but not formally in it; flagged in the synthesis doc). `'failed'`
// is the project-specific addition that satisfies Decision 41c (failure skips
// animation) + Decision 34 (typed-error surface). Carried as a Things-to-Flag
// for Batch 11 spec-amendment-or-project-knowledge-lock.
//
// === CONSUMER-SUBSCRIPTION MECHANISM — spec-silence-as-gap ===
//
// The corpus does not specify how 9.2/9.3/9.4 subscribe to state changes.
// Minimal fit for the project's scale (no state-management library, small
// consumer set): a custom hook (`useDecisioningMachine`) over `useReducer` +
// plain React state. Implemented here; flagged in the synthesis doc for
// Batch 11 ratification.
//
// === MODULE SHAPE ===
//
// Pure reducer (`decisioningReducer`) + types + `initialState` — fully testable
// with zero React mounting; all regression-guard tests exercise the pure
// reducer directly. Thin React hook wrapper (`useDecisioningMachine`) folds
// into this file (the union does not sprawl — no separate types.ts).
//
// Triggers vs resolutions (the two-callback-category split):
//   - Trigger callbacks (machine → consumer, injected at hook init): the
//     machine asks the consumer to do work. 9.3 wires to loadPersona; 9.4
//     wires to fetch; 9.1 + tests stub them. Emitted by the pure reducer as
//     a `pendingTrigger` field (effect-as-state — keeps the reducer pure and
//     the trigger shape directly testable); the hook drains it.
//   - Resolution functions (consumer → machine, exposed by the hook): the
//     consumer reports work done. Each `resolvePassN` is valid ONLY from the
//     matching `pass_N` state — no-op (silent drop, dev-mode warn, no state
//     mutation) otherwise. This hygiene is load-bearing for the reset()
//     mid-flight case: after reset() returns the machine to `idle`, a stale
//     in-flight pass resolution arriving late is dropped, not leaked.

import { useCallback, useEffect, useReducer, useRef } from 'react';
import { Pass1OutputSchema, type Pass1Output } from '@/lib/schemas/pass1';
import { Pass2OutputSchema, type Pass2Output } from '@/lib/schemas/pass2';
import { Pass3OutputSchema, type Pass3Output } from '@/lib/schemas/pass3';
import { DecisioningErrorSchema, type DecisioningError } from '@/lib/schemas/apiError';

// === State value — the canonical 9-value discriminated union ===
// 'idle' | in-flight passes | terminal states. Verbatim from the directive's
// inlined extraction of 07_PASS_3_DESIGN.md:265–292.
export type DecisioningState =
  | 'idle'
  | 'pass_1'
  | 'pass_2'
  | 'pass_3'
  | 're_audit'
  | 'passed_first_audit'
  | 'corrected_and_verified'
  | 'correction_failed_surfaced'
  | 'failed';

// pendingTrigger — effect-as-state. The pure reducer emits a description of
// the trigger callback to invoke; the hook wrapper drains it. Param names are
// explicit (`{ pass1: Pass1Output }`, not shorthand) to keep the FE/BE
// contract symmetry visible at the trigger site — /api/decisioning?pass=2
// consumes `{ pass1: <pass1-output> }` per Decision 32.
export type PendingTrigger =
  | { kind: 'pass1Start' }
  | { kind: 'pass2Start'; input: { pass1: Pass1Output } }
  | { kind: 'pass3Start'; input: { pass1: Pass1Output; pass2: Pass2Output } }
  | null;

export interface DecisioningMachineState {
  state: DecisioningState;
  // Accumulating output payloads — all simultaneously readable. At the
  // `correction_failed_surfaced` terminal, all four are populated (the
  // Decision 22 cap-reached "surface the full state to the analyst" contract).
  pass1Output: Pass1Output | null;
  pass2Output: Pass2Output | null; // original audit
  pass3Output: Pass3Output | null;
  reAuditOutput: Pass2Output | null; // re-audit (a fresh Pass 2)
  // Decision 21 cap-at-1 — typed `0 | 1`; the cap is a type constraint.
  attemptCount: 0 | 1;
  // Decision 34 — populated when state === 'failed'.
  error: DecisioningError | null;
  // Decision 36h — consumer-set flags (read by the machine, never set by it).
  analystActionTaken: boolean;
  overrideModalOpen: boolean;
  // Decision 36h — derived race signals. Independent: setting one flag never
  // implicitly raises the other's signal.
  raceSignalActionTaken: boolean; // sub-case (a)
  raceSignalModalOpen: boolean; // sub-case (b)
  // effect-as-state — drained by the hook wrapper into trigger-callback calls.
  pendingTrigger: PendingTrigger;
}

export type DecisioningAction =
  | { type: 'START_PASS_1' }
  | { type: 'RESOLVE_PASS_1'; output: unknown }
  | { type: 'RESOLVE_PASS_2'; output: unknown } // reused for original audit AND re-audit
  | { type: 'RESOLVE_PASS_3'; output: unknown }
  | { type: 'FAIL'; error: unknown }
  | { type: 'SET_ANALYST_ACTION_TAKEN'; value: boolean }
  | { type: 'SET_OVERRIDE_MODAL_OPEN'; value: boolean }
  | { type: 'CLEAR_TRIGGER' }
  | { type: 'RESET' };

// Trigger callbacks — injected by the consumer at hook init. The machine
// invokes them; it does not implement them. 9.3 wires to loadPersona, 9.4
// wires to fetch, 9.1 + tests stub. `onPass2Start` is reused for the re-audit
// (Decision 32 "no signaling" — the callback cannot distinguish original
// audit from re-audit; only the machine's state value knows).
export interface DecisioningTriggers {
  onPass1Start?: () => void;
  onPass2Start?: (input: { pass1: Pass1Output }) => void;
  onPass3Start?: (input: { pass1: Pass1Output; pass2: Pass2Output }) => void;
}

export const initialState: DecisioningMachineState = {
  state: 'idle',
  pass1Output: null,
  pass2Output: null,
  pass3Output: null,
  reAuditOutput: null,
  attemptCount: 0,
  error: null,
  analystActionTaken: false,
  overrideModalOpen: false,
  raceSignalActionTaken: false,
  raceSignalModalOpen: false,
  pendingTrigger: null,
};

const IN_FLIGHT_STATES: ReadonlySet<DecisioningState> = new Set([
  'pass_1',
  'pass_2',
  'pass_3',
  're_audit',
]);

function devWarn(message: string): void {
  if (process.env.NODE_ENV === 'development') {
    // eslint-disable-next-line no-console
    console.warn(`[decisioningReducer] ${message}`);
  }
}

// Map the current in-flight state to its DecisioningError `pass` discriminator.
function passOfState(state: DecisioningState): 1 | 2 | 3 | 're-audit' {
  switch (state) {
    case 'pass_1':
      return 1;
    case 'pass_2':
      return 2;
    case 'pass_3':
      return 3;
    case 're_audit':
      return 're-audit';
    default:
      return 1;
  }
}

// Transition to 'failed' with a typed DecisioningError. Used both for explicit
// FAIL actions and for schema-validation failures at transition entry (Finding
// 8 double-validation discipline — the machine is the central contract and
// does not trust callers; a structurally-invalid payload routes to 'failed').
function toFailed(
  state: DecisioningMachineState,
  error: DecisioningError,
): DecisioningMachineState {
  return { ...state, state: 'failed', error, pendingTrigger: null };
}

function validationError(pass: 1 | 2 | 3 | 're-audit', issues: unknown[]): DecisioningError {
  return {
    pass,
    errorType: 'validation_failed',
    zodIssues: issues,
    message: `Pass ${pass} output failed schema validation at the orchestration boundary.`,
    retryable: true,
  };
}

export function decisioningReducer(
  state: DecisioningMachineState,
  action: DecisioningAction,
): DecisioningMachineState {
  switch (action.type) {
    case 'START_PASS_1': {
      if (state.state !== 'idle') {
        devWarn(`START_PASS_1 ignored — machine is in '${state.state}', not 'idle'.`);
        return state;
      }
      return { ...state, state: 'pass_1', pendingTrigger: { kind: 'pass1Start' } };
    }

    case 'RESOLVE_PASS_1': {
      // Valid only from 'pass_1'. No-op otherwise (reset() mid-flight safety).
      if (state.state !== 'pass_1') {
        devWarn(`RESOLVE_PASS_1 ignored — machine is in '${state.state}', not 'pass_1'.`);
        return state;
      }
      const parsed = Pass1OutputSchema.safeParse(action.output);
      if (!parsed.success) {
        return toFailed(state, validationError(1, parsed.error.issues));
      }
      return {
        ...state,
        state: 'pass_2',
        pass1Output: parsed.data,
        pendingTrigger: { kind: 'pass2Start', input: { pass1: parsed.data } },
      };
    }

    case 'RESOLVE_PASS_2': {
      // Reused for the original audit (from 'pass_2') AND the re-audit (from
      // 're_audit'). The reducer branches on current state — the consumer-
      // facing resolvePass2 function does not need to distinguish them
      // (Decision 32 "client knows which, the call does not need to").
      if (state.state === 'pass_2') {
        const parsed = Pass2OutputSchema.safeParse(action.output);
        if (!parsed.success) {
          return toFailed(state, validationError(2, parsed.error.issues));
        }
        if (!parsed.data.correction_required) {
          return {
            ...state,
            state: 'passed_first_audit',
            pass2Output: parsed.data,
            pendingTrigger: null,
          };
        }
        // correction_required → Pass 3. Decision 36h sub-case (b): if the
        // Override modal is open as we enter pass_3, raise raceSignalModalOpen.
        return {
          ...state,
          state: 'pass_3',
          pass2Output: parsed.data,
          raceSignalModalOpen: state.overrideModalOpen ? true : state.raceSignalModalOpen,
          pendingTrigger: {
            kind: 'pass3Start',
            input: { pass1: state.pass1Output as Pass1Output, pass2: parsed.data },
          },
        };
      }

      if (state.state === 're_audit') {
        const parsed = Pass2OutputSchema.safeParse(action.output);
        if (!parsed.success) {
          return toFailed(state, validationError('re-audit', parsed.error.issues));
        }
        // Decision 21 cap-at-1: from re_audit, correction_required:true has no
        // path to a second Pass 3 — it routes to correction_failed_surfaced.
        const terminal: DecisioningState = parsed.data.correction_required
          ? 'correction_failed_surfaced'
          : 'corrected_and_verified';
        // Decision 36h sub-case (a): if an analyst action was taken on the
        // uncorrected output, the terminal transition raises raceSignalActionTaken.
        return {
          ...state,
          state: terminal,
          reAuditOutput: parsed.data,
          raceSignalActionTaken: state.analystActionTaken ? true : state.raceSignalActionTaken,
          pendingTrigger: null,
        };
      }

      devWarn(
        `RESOLVE_PASS_2 ignored — machine is in '${state.state}', not 'pass_2' or 're_audit'.`,
      );
      return state;
    }

    case 'RESOLVE_PASS_3': {
      // Valid only from 'pass_3'. No-op otherwise (reset() mid-flight safety).
      if (state.state !== 'pass_3') {
        devWarn(`RESOLVE_PASS_3 ignored — machine is in '${state.state}', not 'pass_3'.`);
        return state;
      }
      const parsed = Pass3OutputSchema.safeParse(action.output);
      if (!parsed.success) {
        return toFailed(state, validationError(3, parsed.error.issues));
      }
      return {
        ...state,
        state: 're_audit',
        pass3Output: parsed.data,
        // Decision 21 cap-at-1: increment 0 → 1. attemptCount is typed `0 | 1`;
        // no reducer path sets it beyond 1.
        attemptCount: 1,
        // Re-audit reuses the SAME onPass2Start trigger (Decision 32 no-
        // signaling). Input is `{ pass1 }` ONLY — the corrected Pass 1.
        // Read as `corrected_pass_1` (schema name; Finding 20 tracks the
        // canonical-contract `corrected_pass_1_output` rename).
        pendingTrigger: {
          kind: 'pass2Start',
          input: { pass1: parsed.data.corrected_pass_1 },
        },
      };
    }

    case 'FAIL': {
      // Decision 34 — explicit typed-error transition. Valid from any in-flight
      // pass. One-way: no auto-retry (spec-silence-as-discipline).
      if (!IN_FLIGHT_STATES.has(state.state)) {
        devWarn(`FAIL ignored — machine is in '${state.state}', not an in-flight pass.`);
        return state;
      }
      const parsed = DecisioningErrorSchema.safeParse(action.error);
      const error: DecisioningError = parsed.success
        ? parsed.data
        : {
            pass: passOfState(state.state),
            errorType: 'malformed_model_json',
            message: 'An error payload was reported but did not match the DecisioningError contract.',
            retryable: false,
          };
      return toFailed(state, error);
    }

    case 'SET_ANALYST_ACTION_TAKEN': {
      // Decision 36h sub-case (a) flag — consumer-set, independent of sub-case (b).
      return { ...state, analystActionTaken: action.value };
    }

    case 'SET_OVERRIDE_MODAL_OPEN': {
      // Decision 36h sub-case (b) flag — consumer-set, independent of sub-case (a).
      return { ...state, overrideModalOpen: action.value };
    }

    case 'CLEAR_TRIGGER': {
      return { ...state, pendingTrigger: null };
    }

    case 'RESET': {
      // Valid from ANY state, including all terminals. The one transition that
      // does not care about source state: discard all accumulating state,
      // return to idle, clear payloads / attemptCount / error / both race
      // flags / both race signals. 9.3 persona-switching and 9.4 "run another
      // custom input" both depend on this.
      return { ...initialState };
    }

    default:
      return state;
  }
}

// === React hook wrapper ===
//
// Custom hook over useReducer + plain React state — the minimal-fit
// consumer-subscription mechanism (spec-silence-as-gap; flagged for Batch 11
// ratification). Exposes the resolution functions and drains pendingTrigger
// into the injected trigger callbacks.

export interface DecisioningMachine {
  state: DecisioningMachineState;
  startPass1: () => void;
  resolvePass1: (output: unknown) => void;
  resolvePass2: (output: unknown) => void;
  resolvePass3: (output: unknown) => void;
  fail: (error: unknown) => void;
  setAnalystActionTaken: (value: boolean) => void;
  setOverrideModalOpen: (value: boolean) => void;
  reset: () => void;
}

export function useDecisioningMachine(triggers: DecisioningTriggers = {}): DecisioningMachine {
  const [state, dispatch] = useReducer(decisioningReducer, initialState);

  // triggers held in a ref so the drain effect depends only on pendingTrigger —
  // consumers need not memoize the triggers object.
  const triggersRef = useRef(triggers);
  triggersRef.current = triggers;

  // Drain pendingTrigger into the injected trigger callbacks.
  //
  // CLEAR_TRIGGER is dispatched BEFORE invoking the callback (Finding H fix,
  // A′). A synchronously-resolving trigger — the persona-playback pattern
  // (Batch 9.3): onPass1Start immediately calls resolvePass1 — dispatches a
  // RESOLVE_PASS_N action INSIDE the callback, which sets a NEW pendingTrigger.
  // If CLEAR_TRIGGER fired AFTER the callback, that same-batch CLEAR would
  // clobber the freshly-set trigger (React 18+ batches both dispatches) and
  // the cascade would stall. Clearing first means the batch is
  // [CLEAR_TRIGGER (old → null), RESOLVE_PASS_N (→ new pendingTrigger)] — the
  // committed state carries the new trigger and the cascade continues.
  // Correct for async triggers too (live mode, Batch 9.4): the callback starts
  // a fetch and returns without dispatching, so the batch is just
  // [CLEAR_TRIGGER]; the later fetch resolution sets the next trigger fresh.
  // The 9.1 pure-reducer test suite structurally cannot exercise this — see
  // the hook-integration cascade test in stateMachine.test.ts.
  useEffect(() => {
    const pending = state.pendingTrigger;
    if (!pending) return;
    const t = triggersRef.current;
    dispatch({ type: 'CLEAR_TRIGGER' });
    if (pending.kind === 'pass1Start') {
      t.onPass1Start?.();
    } else if (pending.kind === 'pass2Start') {
      t.onPass2Start?.(pending.input);
    } else if (pending.kind === 'pass3Start') {
      t.onPass3Start?.(pending.input);
    }
  }, [state.pendingTrigger]);

  const startPass1 = useCallback(() => dispatch({ type: 'START_PASS_1' }), []);
  const resolvePass1 = useCallback(
    (output: unknown) => dispatch({ type: 'RESOLVE_PASS_1', output }),
    [],
  );
  const resolvePass2 = useCallback(
    (output: unknown) => dispatch({ type: 'RESOLVE_PASS_2', output }),
    [],
  );
  const resolvePass3 = useCallback(
    (output: unknown) => dispatch({ type: 'RESOLVE_PASS_3', output }),
    [],
  );
  const fail = useCallback((error: unknown) => dispatch({ type: 'FAIL', error }), []);
  const setAnalystActionTaken = useCallback(
    (value: boolean) => dispatch({ type: 'SET_ANALYST_ACTION_TAKEN', value }),
    [],
  );
  const setOverrideModalOpen = useCallback(
    (value: boolean) => dispatch({ type: 'SET_OVERRIDE_MODAL_OPEN', value }),
    [],
  );
  const reset = useCallback(() => dispatch({ type: 'RESET' }), []);

  return {
    state,
    startPass1,
    resolvePass1,
    resolvePass2,
    resolvePass3,
    fail,
    setAnalystActionTaken,
    setOverrideModalOpen,
    reset,
  };
}
