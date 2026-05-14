import { describe, it, expect } from 'vitest';
import {
  decisioningReducer,
  initialState,
  type DecisioningAction,
  type DecisioningMachineState,
  type DecisioningState,
} from './stateMachine';
import { loadPersona } from '@/lib/schemas/personaAdapters';
import type { Pass1Output } from '@/lib/schemas/pass1';
import type { Pass2Output } from '@/lib/schemas/pass2';
import type { Pass3Output } from '@/lib/schemas/pass3';
import type { DecisioningError } from '@/lib/schemas/apiError';

// === Fixtures ===
// Real Pass 1 / Pass 2 outputs come from loadPersona (schema-validated). The
// four locked personas all lock PASS clean (Decision 27) — none exercises
// Pass 3 — so the correction-required Pass 2, the Pass 3 output, and the
// re-audit variants are synthesized from validated persona data.

const maria = loadPersona('maria');
const carlos = loadPersona('carlos');

const pass1Fixture: Pass1Output = maria.pass_1;
const pass2CleanFixture: Pass2Output = maria.pass_2; // correction_required: false
const pass2CorrectionFixture: Pass2Output = { ...maria.pass_2, correction_required: true };
const reAuditCleanFixture: Pass2Output = { ...carlos.pass_2, correction_required: false };
const reAuditStillFlaggedFixture: Pass2Output = { ...carlos.pass_2, correction_required: true };
const pass3Fixture: Pass3Output = {
  correction_against_audit_id: 'audit-test-20260514120000',
  correction_attempt_number: 1,
  corrected_pass_1: carlos.pass_1, // a valid Pass1Output as the corrected output
  change_log: [
    {
      field: 'decision.recommended_tier',
      before: 'Standard',
      after: 'EDD',
      reason: 'ES-03 surfaced by Pass 2; tier corrected.',
    },
  ],
};

// drive — fold a sequence of actions through the pure reducer from initialState.
function drive(actions: DecisioningAction[]): DecisioningMachineState {
  return actions.reduce(decisioningReducer, initialState);
}

describe('decisioningReducer — happy path (no correction)', () => {
  it('idle → pass_1 → pass_2 → passed_first_audit when Pass 2 returns correction_required: false', () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CleanFixture },
    ]);
    expect(s.state).toBe('passed_first_audit');
    expect(s.pass1Output).not.toBeNull();
    expect(s.pass2Output).not.toBeNull();
    expect(s.pass3Output).toBeNull();
    expect(s.reAuditOutput).toBeNull();
    expect(s.attemptCount).toBe(0);
    expect(s.error).toBeNull();
  });
});

describe('decisioningReducer — correction succeeds', () => {
  it('idle → pass_1 → pass_2 → pass_3 → re_audit → corrected_and_verified', () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      { type: 'RESOLVE_PASS_3', output: pass3Fixture },
      { type: 'RESOLVE_PASS_2', output: reAuditCleanFixture },
    ]);
    expect(s.state).toBe('corrected_and_verified');
    expect(s.attemptCount).toBe(1);
    expect(s.pass1Output).not.toBeNull();
    expect(s.pass2Output).not.toBeNull();
    expect(s.pass3Output).not.toBeNull();
    expect(s.reAuditOutput).not.toBeNull();
    expect(s.reAuditOutput?.correction_required).toBe(false);
  });
});

describe('decisioningReducer — cap reached (Decision 21)', () => {
  it('idle → pass_1 → pass_2 → pass_3 → re_audit → correction_failed_surfaced when re-audit still flags', () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      { type: 'RESOLVE_PASS_3', output: pass3Fixture },
      { type: 'RESOLVE_PASS_2', output: reAuditStillFlaggedFixture },
    ]);
    expect(s.state).toBe('correction_failed_surfaced');
    expect(s.attemptCount).toBe(1);
  });
});

describe('decisioningReducer — each pass can fail (Decision 34; failure-origin distinguishable)', () => {
  // The DecisioningError.pass discriminator lets consumers distinguish which
  // pass failed. fail() is valid from any in-flight pass.
  const errorFor = (pass: DecisioningError['pass']): DecisioningError => ({
    pass,
    errorType: 'upstream_timeout',
    message: `Pass ${pass} timed out.`,
    retryable: true,
  });

  it("reaches 'failed' from pass_1 with error.pass === 1", () => {
    const s = drive([{ type: 'START_PASS_1' }, { type: 'FAIL', error: errorFor(1) }]);
    expect(s.state).toBe('failed');
    expect(s.error?.pass).toBe(1);
  });

  it("reaches 'failed' from pass_2 with error.pass === 2", () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'FAIL', error: errorFor(2) },
    ]);
    expect(s.state).toBe('failed');
    expect(s.error?.pass).toBe(2);
  });

  it("reaches 'failed' from pass_3 with error.pass === 3", () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      { type: 'FAIL', error: errorFor(3) },
    ]);
    expect(s.state).toBe('failed');
    expect(s.error?.pass).toBe(3);
  });

  it("reaches 'failed' from re_audit with error.pass === 're-audit'", () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      { type: 'RESOLVE_PASS_3', output: pass3Fixture },
      { type: 'FAIL', error: errorFor('re-audit') },
    ]);
    expect(s.state).toBe('failed');
    expect(s.error?.pass).toBe('re-audit');
  });
});

describe('decisioningReducer — Decision 36h race sub-case (a): analyst action taken on uncorrected output', () => {
  it('raceSignalActionTaken fires when reaching corrected_and_verified after analyst-action-taken flag set', () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      { type: 'RESOLVE_PASS_3', output: pass3Fixture },
      // analyst impatiently acts on the uncorrected output while re-audit runs
      { type: 'SET_ANALYST_ACTION_TAKEN', value: true },
      { type: 'RESOLVE_PASS_2', output: reAuditCleanFixture },
    ]);
    expect(s.state).toBe('corrected_and_verified');
    expect(s.raceSignalActionTaken).toBe(true);
  });

  it('raceSignalActionTaken fires when reaching correction_failed_surfaced after analyst-action-taken flag set', () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      { type: 'RESOLVE_PASS_3', output: pass3Fixture },
      { type: 'SET_ANALYST_ACTION_TAKEN', value: true },
      { type: 'RESOLVE_PASS_2', output: reAuditStillFlaggedFixture },
    ]);
    expect(s.state).toBe('correction_failed_surfaced');
    expect(s.raceSignalActionTaken).toBe(true);
  });

  it('raceSignalActionTaken does NOT fire on passed_first_audit (analyst acted on the FINAL clean output, not an uncorrected one)', () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'SET_ANALYST_ACTION_TAKEN', value: true },
      { type: 'RESOLVE_PASS_2', output: pass2CleanFixture },
    ]);
    expect(s.state).toBe('passed_first_audit');
    expect(s.raceSignalActionTaken).toBe(false);
  });
});

describe('decisioningReducer — Decision 36h race sub-case (b): Pass 3 fires while Override modal open', () => {
  it('raceSignalModalOpen fires when state advances to pass_3 with overrideModalOpen flag set', () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'SET_OVERRIDE_MODAL_OPEN', value: true },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
    ]);
    expect(s.state).toBe('pass_3');
    expect(s.raceSignalModalOpen).toBe(true);
  });

  it('raceSignalModalOpen does NOT fire when advancing to pass_3 with the modal flag unset', () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
    ]);
    expect(s.state).toBe('pass_3');
    expect(s.raceSignalModalOpen).toBe(false);
  });
});

describe('decisioningReducer — Decision 21 cap-at-1 enforcement', () => {
  it('from re_audit with correction_required:true, routes to correction_failed_surfaced — NOT a second pass_3', () => {
    // This test fails loudly if a future maintainer "fixes" the cap to 2
    // without changing Decision 21: the only outcome from re_audit +
    // correction_required is correction_failed_surfaced.
    const reAuditState = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      { type: 'RESOLVE_PASS_3', output: pass3Fixture },
    ]);
    expect(reAuditState.state).toBe('re_audit');
    expect(reAuditState.attemptCount).toBe(1);

    const next = decisioningReducer(reAuditState, {
      type: 'RESOLVE_PASS_2',
      output: reAuditStillFlaggedFixture,
    });
    expect(next.state).toBe('correction_failed_surfaced');
    expect(next.state).not.toBe('pass_3');
    expect(next.attemptCount).toBe(1); // never 2

    // RESOLVE_PASS_3 from the terminal state is a no-op — there is no path to
    // a second Pass 3 attempt.
    const afterStrayPass3 = decisioningReducer(next, { type: 'RESOLVE_PASS_3', output: pass3Fixture });
    expect(afterStrayPass3.state).toBe('correction_failed_surfaced');
    expect(afterStrayPass3.attemptCount).toBe(1);
  });

  it('attemptCount type forbids values beyond 1 (Decision 21 cap-at-1 type-level enforcement)', () => {
    // @ts-expect-error — attemptCount is typed `0 | 1`; literal 2 is not assignable.
    const widened: DecisioningMachineState['attemptCount'] = 2;
    void widened;
    // The runtime cap is verified by the path tests above; this guard fails
    // typecheck if a future maintainer widens the type.
    expect(true).toBe(true);
  });
});

describe('decisioningReducer — anti-pattern guard: re-audit reuses onPass2Start with no signaling (Decision 32)', () => {
  // Finding 20: the re-audit trigger reads pass3.corrected_pass_1 — the schema
  // field name AS IT CURRENTLY EXISTS. The canonical-contract name is
  // corrected_pass_1_output (07_PASS_3_DESIGN.md:77,280,459 +
  // 03_DESIGN_DECISIONS.md:370,389); pass3.ts:36's corrected_pass_1 is Batch 1
  // schema drift. When Finding 20's schema-correction commit lands, this test
  // updates to reference corrected_pass_1_output — that rename is part of
  // Finding 20's closure scope, not a 9.1 concern.
  it('RESOLVE_PASS_3 emits a pass2Start pendingTrigger carrying ONLY { pass1: <corrected_pass_1> } — no change_log, no metadata', () => {
    const reAuditEntry = decisioningReducer(
      drive([
        { type: 'START_PASS_1' },
        { type: 'RESOLVE_PASS_1', output: pass1Fixture },
        { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      ]),
      { type: 'RESOLVE_PASS_3', output: pass3Fixture },
    );
    expect(reAuditEntry.state).toBe('re_audit');
    const trigger = reAuditEntry.pendingTrigger;
    expect(trigger?.kind).toBe('pass2Start');
    if (trigger?.kind !== 'pass2Start') throw new Error('expected pass2Start trigger');
    // The trigger input carries ONLY pass1 — the Decision 32 "no signaling"
    // discipline made structural. No change_log, no correction metadata.
    expect(Object.keys(trigger.input)).toEqual(['pass1']);
    // And it is the corrected Pass 1 (pass3.corrected_pass_1), not the original.
    expect(trigger.input.pass1).toEqual(pass3Fixture.corrected_pass_1);
  });

  it('the re-audit trigger reuses the SAME pass2Start kind as the original audit trigger', () => {
    const afterPass1 = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
    ]);
    // Original audit trigger
    expect(afterPass1.pendingTrigger?.kind).toBe('pass2Start');
    const afterPass3 = decisioningReducer(
      drive([
        { type: 'START_PASS_1' },
        { type: 'RESOLVE_PASS_1', output: pass1Fixture },
        { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      ]),
      { type: 'RESOLVE_PASS_3', output: pass3Fixture },
    );
    // Re-audit trigger — same kind. The callback cannot distinguish them.
    expect(afterPass3.pendingTrigger?.kind).toBe('pass2Start');
  });
});

describe('decisioningReducer — anti-pattern guard: statelessness (no input-payload mutation)', () => {
  it('does not mutate the input payload; the state payload deep-equals the input', () => {
    const input = structuredClone(pass1Fixture);
    const snapshot = structuredClone(input);
    const s = drive([{ type: 'START_PASS_1' }, { type: 'RESOLVE_PASS_1', output: input }]);
    // Input object unchanged after passing through the machine.
    expect(input).toEqual(snapshot);
    // State payload deep-equals the input (zod parse is a defensive copy —
    // deep-equal, not reference-identical).
    expect(s.pass1Output).toEqual(input);
  });
});

describe('decisioningReducer — anti-pattern guard: race signal independence (Decision 36h)', () => {
  it('SET_OVERRIDE_MODAL_OPEN does not implicitly set the analyst-action-taken flag', () => {
    const s = decisioningReducer(initialState, { type: 'SET_OVERRIDE_MODAL_OPEN', value: true });
    expect(s.overrideModalOpen).toBe(true);
    expect(s.analystActionTaken).toBe(false);
  });

  it('SET_ANALYST_ACTION_TAKEN does not implicitly set the override-modal-open flag', () => {
    const s = decisioningReducer(initialState, { type: 'SET_ANALYST_ACTION_TAKEN', value: true });
    expect(s.analystActionTaken).toBe(true);
    expect(s.overrideModalOpen).toBe(false);
  });

  it('the two race signals are independently raisable — one firing does not raise the other', () => {
    // Sub-case (b) only: modal open, no analyst action → only raceSignalModalOpen.
    const onlyB = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'SET_OVERRIDE_MODAL_OPEN', value: true },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
    ]);
    expect(onlyB.raceSignalModalOpen).toBe(true);
    expect(onlyB.raceSignalActionTaken).toBe(false);

    // Sub-case (a) only: analyst action, no modal → only raceSignalActionTaken.
    const onlyA = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      { type: 'RESOLVE_PASS_3', output: pass3Fixture },
      { type: 'SET_ANALYST_ACTION_TAKEN', value: true },
      { type: 'RESOLVE_PASS_2', output: reAuditCleanFixture },
    ]);
    expect(onlyA.raceSignalActionTaken).toBe(true);
    expect(onlyA.raceSignalModalOpen).toBe(false);
  });
});

describe('decisioningReducer — spec-silence-as-discipline: no automatic retry (Decision 34)', () => {
  it("a 'failed' state does not auto-transition back to a pass; resolve actions from 'failed' are no-ops", () => {
    const failed = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'FAIL', error: { pass: 2, errorType: 'upstream_timeout', message: 'x', retryable: true } },
    ]);
    expect(failed.state).toBe('failed');
    // No resolve action revives the machine from 'failed'.
    expect(decisioningReducer(failed, { type: 'RESOLVE_PASS_1', output: pass1Fixture }).state).toBe(
      'failed',
    );
    expect(decisioningReducer(failed, { type: 'RESOLVE_PASS_2', output: pass2CleanFixture }).state).toBe(
      'failed',
    );
    expect(decisioningReducer(failed, { type: 'START_PASS_1' }).state).toBe('failed');
    // Only RESET clears 'failed'.
    expect(decisioningReducer(failed, { type: 'RESET' }).state).toBe('idle');
  });
});

describe('decisioningReducer — reset() from any state (Decision-22-adjacent; 9.3 persona-switching dependency)', () => {
  // reset() is the one transition that does not care about source state.
  const allStates: DecisioningState[] = [
    'idle',
    'pass_1',
    'pass_2',
    'pass_3',
    're_audit',
    'passed_first_audit',
    'corrected_and_verified',
    'correction_failed_surfaced',
    'failed',
  ];

  // Build a representative machine state for each state value.
  function stateAt(target: DecisioningState): DecisioningMachineState {
    switch (target) {
      case 'idle':
        return initialState;
      case 'pass_1':
        return drive([{ type: 'START_PASS_1' }]);
      case 'pass_2':
        return drive([{ type: 'START_PASS_1' }, { type: 'RESOLVE_PASS_1', output: pass1Fixture }]);
      case 'pass_3':
        return drive([
          { type: 'START_PASS_1' },
          { type: 'RESOLVE_PASS_1', output: pass1Fixture },
          { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
        ]);
      case 're_audit':
        return drive([
          { type: 'START_PASS_1' },
          { type: 'RESOLVE_PASS_1', output: pass1Fixture },
          { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
          { type: 'RESOLVE_PASS_3', output: pass3Fixture },
        ]);
      case 'passed_first_audit':
        return drive([
          { type: 'START_PASS_1' },
          { type: 'RESOLVE_PASS_1', output: pass1Fixture },
          { type: 'RESOLVE_PASS_2', output: pass2CleanFixture },
        ]);
      case 'corrected_and_verified':
        return drive([
          { type: 'START_PASS_1' },
          { type: 'RESOLVE_PASS_1', output: pass1Fixture },
          { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
          { type: 'RESOLVE_PASS_3', output: pass3Fixture },
          { type: 'RESOLVE_PASS_2', output: reAuditCleanFixture },
        ]);
      case 'correction_failed_surfaced':
        return drive([
          { type: 'START_PASS_1' },
          { type: 'RESOLVE_PASS_1', output: pass1Fixture },
          { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
          { type: 'RESOLVE_PASS_3', output: pass3Fixture },
          { type: 'RESOLVE_PASS_2', output: reAuditStillFlaggedFixture },
        ]);
      case 'failed':
        return drive([
          { type: 'START_PASS_1' },
          { type: 'FAIL', error: { pass: 1, errorType: 'upstream_timeout', message: 'x', retryable: true } },
        ]);
    }
  }

  for (const target of allStates) {
    it(`reset() from '${target}' returns the machine to initialState`, () => {
      const before = stateAt(target);
      expect(before.state).toBe(target);
      const after = decisioningReducer(before, { type: 'RESET' });
      expect(after).toEqual(initialState);
    });
  }

  it('reset() mid-flight gotcha: RESET from pass_3, then a stale RESOLVE_PASS_3 is dropped (no leak into next playback)', () => {
    const midFlight = stateAt('pass_3');
    expect(midFlight.state).toBe('pass_3');
    const afterReset = decisioningReducer(midFlight, { type: 'RESET' });
    expect(afterReset.state).toBe('idle');
    // The pending Pass 3 call resolves AFTER reset — must be ignored.
    const afterStaleResolve = decisioningReducer(afterReset, {
      type: 'RESOLVE_PASS_3',
      output: pass3Fixture,
    });
    expect(afterStaleResolve.state).toBe('idle');
    expect(afterStaleResolve.pass3Output).toBeNull();
  });
});

describe('decisioningReducer — resolve-transition no-op hygiene (load-bearing for reset() mid-flight safety)', () => {
  it('RESOLVE_PASS_1 is a no-op when state is not pass_1', () => {
    expect(decisioningReducer(initialState, { type: 'RESOLVE_PASS_1', output: pass1Fixture })).toEqual(
      initialState,
    );
  });

  it('RESOLVE_PASS_2 is a no-op when state is neither pass_2 nor re_audit', () => {
    const atPass1 = drive([{ type: 'START_PASS_1' }]);
    expect(decisioningReducer(atPass1, { type: 'RESOLVE_PASS_2', output: pass2CleanFixture })).toEqual(
      atPass1,
    );
  });

  it('RESOLVE_PASS_3 is a no-op when state is not pass_3', () => {
    const atPass2 = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
    ]);
    expect(decisioningReducer(atPass2, { type: 'RESOLVE_PASS_3', output: pass3Fixture })).toEqual(
      atPass2,
    );
  });

  it('START_PASS_1 is a no-op when state is not idle', () => {
    const atPass1 = drive([{ type: 'START_PASS_1' }]);
    expect(decisioningReducer(atPass1, { type: 'START_PASS_1' })).toEqual(atPass1);
  });
});

describe('decisioningReducer — Decision 22 cap-reached: full state surfaced to the analyst', () => {
  // 07_PASS_3_DESIGN.md §4 lines 300–305 — at the cap-reached terminal, the
  // analyst must see the full state. This is the orchestration substrate for
  // the Decision 22 cap-reached persona scenario (the visually-deprioritized
  // fourth persona showing the architecture's limits).
  it("at 'correction_failed_surfaced', all four pass payloads + attemptCount===1 are simultaneously readable", () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      { type: 'RESOLVE_PASS_3', output: pass3Fixture },
      { type: 'RESOLVE_PASS_2', output: reAuditStillFlaggedFixture },
    ]);
    expect(s.state).toBe('correction_failed_surfaced');
    // All four payloads simultaneously accessible — the "surface the full
    // state" contract.
    expect(s.pass1Output).not.toBeNull();
    expect(s.pass2Output).not.toBeNull();
    expect(s.pass3Output).not.toBeNull();
    expect(s.reAuditOutput).not.toBeNull();
    // The re-audit output still flags correction_required — the reason the cap
    // was reached.
    expect(s.reAuditOutput?.correction_required).toBe(true);
    expect(s.attemptCount).toBe(1);
  });
});

describe('decisioningReducer — schema validation at transition entry (Finding 8 double-validation discipline)', () => {
  it('RESOLVE_PASS_1 with a structurally-invalid payload routes to failed (errorType validation_failed, pass 1)', () => {
    const s = drive([{ type: 'START_PASS_1' }, { type: 'RESOLVE_PASS_1', output: { garbage: true } }]);
    expect(s.state).toBe('failed');
    expect(s.error?.errorType).toBe('validation_failed');
    expect(s.error?.pass).toBe(1);
  });

  it('RESOLVE_PASS_2 with a structurally-invalid payload routes to failed (pass 2)', () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: { not: 'a pass 2' } },
    ]);
    expect(s.state).toBe('failed');
    expect(s.error?.errorType).toBe('validation_failed');
    expect(s.error?.pass).toBe(2);
  });

  it('RESOLVE_PASS_2 invalid payload on the re-audit leg routes to failed with pass === re-audit', () => {
    const s = drive([
      { type: 'START_PASS_1' },
      { type: 'RESOLVE_PASS_1', output: pass1Fixture },
      { type: 'RESOLVE_PASS_2', output: pass2CorrectionFixture },
      { type: 'RESOLVE_PASS_3', output: pass3Fixture },
      { type: 'RESOLVE_PASS_2', output: { not: 'a re-audit' } },
    ]);
    expect(s.state).toBe('failed');
    expect(s.error?.pass).toBe('re-audit');
  });
});
