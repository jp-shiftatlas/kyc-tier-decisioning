import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { readFileSync } from 'node:fs';
import {
  render,
  screen,
  fireEvent,
  cleanup,
  waitFor,
  act,
  within,
} from '@testing-library/react';
import { loadPersona } from '@/lib/schemas/personaAdapters';
import type { Pass2Output } from '@/lib/schemas/pass2';
import type { Pass3Output } from '@/lib/schemas/pass3';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';
import type { DecisioningError } from '@/lib/schemas/apiError';

// === CustomInputForm stub ===
//
// vi.mock hoists; the factory captures the orchestrator-supplied
// onValidatedSubmit handler into a module-scope ref so tests can fire live-
// mode submission with fixture data without filling all 13 form fields.
// CustomInputForm's own contract is tested at components/decisioning/
// CustomInputForm.test.tsx; here we test the orchestrator's wiring of the
// form's emit to liveMachine.startLiveRun.

const submitRef: { current: ((p: CustomerProfile) => void) | null } = {
  current: null,
};

vi.mock('@/components/decisioning/CustomInputForm', () => ({
  CustomInputForm: ({
    onValidatedSubmit,
  }: {
    onValidatedSubmit: (p: CustomerProfile) => void;
  }) => {
    submitRef.current = onValidatedSubmit;
    return <div data-testid="custom-input-form-stub" />;
  },
}));

// Imported AFTER the vi.mock above so the stub is registered first.
import { DecisioningOrchestrator } from './DecisioningOrchestrator';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
  vi.restoreAllMocks();
  document.body.style.overflow = '';
  submitRef.current = null;
});

// === Fixtures (real schema-validated persona data) ===

const maria = loadPersona('maria');
const carlos = loadPersona('carlos');

const pass2Correction: Pass2Output = {
  ...maria.pass_2,
  correction_required: true,
};
const reAuditClean: Pass2Output = {
  ...carlos.pass_2,
  correction_required: false,
};
const reAuditStillFlagged: Pass2Output = {
  ...carlos.pass_2,
  correction_required: true,
};
const pass3Fixture: Pass3Output = {
  correction_against_audit_id: 'audit-live-test-20260516000000',
  correction_attempt_number: 1,
  corrected_pass_1_output: carlos.pass_1,
  change_log: [
    {
      field: 'decision.recommended_tier',
      before: 'Standard',
      after: 'EDD',
      reason: 'ES-03 surfaced by Pass 2; tier corrected.',
    },
  ],
};

// === Helpers ===

const ok = (body: unknown) => ({ ok: true, status: 200, json: async () => body });

function stubFetchSequence(...responses: unknown[]) {
  const spy = vi.fn();
  for (const r of responses) spy.mockResolvedValueOnce(r);
  vi.stubGlobal('fetch', spy);
  return spy;
}

// Manually-resolvable response. Lets a test interleave UI actions between
// state transitions by hanging a specific fetch until the test resolves it.
function deferred<T = unknown>() {
  let resolveFn!: (value: T) => void;
  const promise = new Promise<T>((resolve) => {
    resolveFn = resolve;
  });
  return { promise, resolve: resolveFn };
}

function fireLiveSubmit(profile: CustomerProfile) {
  if (!submitRef.current) {
    throw new Error('CustomInputForm stub was not mounted; submit handler unavailable.');
  }
  act(() => {
    submitRef.current!(profile);
  });
}

// =====================================================================
// Persona mode — happy path
// =====================================================================

describe('DecisioningOrchestrator — persona-mode happy path (Decision 27 PASS clean)', () => {
  it("'idle' on mount renders the prompt; no decisioning content yet", () => {
    render(<DecisioningOrchestrator />);
    expect(screen.getByTestId('idle-prompt')).toBeInTheDocument();
    expect(
      screen.getByText(/Select a persona or fill the custom case form to begin/),
    ).toBeInTheDocument();
  });

  it('selecting Maria advances the persona machine to passed_first_audit; RecommendationCard + AnalystControlPanel mount', async () => {
    render(<DecisioningOrchestrator />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Maria' }));

    // At passed_first_audit, RecommendationCard renders Maria's Standard tier.
    await waitFor(() => {
      const surface = screen.getByTestId('decisioning-surface');
      expect(within(surface).getByText('Standard')).toBeInTheDocument();
    });
    // AnalystControlPanel mounted (three action buttons present).
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escalate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Override' })).toBeInTheDocument();
  });

  it('selecting Carlos (senior_approval_required) flips the Escalate button label per Decision 36b', async () => {
    render(<DecisioningOrchestrator />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Carlos' }));
    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Confirm Escalation' }),
      ).toBeInTheDocument();
    });
  });
});

// =====================================================================
// Persona mode — Decision 36h "live mode only" race-wiring discipline
// =====================================================================

describe('DecisioningOrchestrator — Decision 36h "live mode only" race wiring discipline', () => {
  it('persona-mode Approve click does NOT raise raceSignalActionTaken (no Pass3RaceBanner)', async () => {
    render(<DecisioningOrchestrator />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Maria' }));
    await waitFor(() => {
      expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    // The Approve confirmation block appears (panel-internal action).
    expect(screen.getByText('Case approved')).toBeInTheDocument();
    // But NO race banner — persona machine never reaches a state that raises
    // raceSignalActionTaken (no Pass 3, no re-audit, no terminal transition
    // with the analystActionTaken flag).
    expect(
      screen.queryByText(/Audit findings revised after your previous action/),
    ).not.toBeInTheDocument();
  });
});

// =====================================================================
// Live mode — happy path (no correction)
// =====================================================================

describe('DecisioningOrchestrator — live-mode happy path', () => {
  it('live submission → Pass 1 → Pass 2 (clean) → passed_first_audit; RecommendationCard renders', async () => {
    stubFetchSequence(ok(maria.pass_1), ok(maria.pass_2));
    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);
    await waitFor(() => {
      const surface = screen.getByTestId('decisioning-surface');
      expect(within(surface).getByText('Standard')).toBeInTheDocument();
    });
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });
});

// =====================================================================
// Live mode — Pass 3 correction path (corrected_and_verified terminal)
// =====================================================================

describe('DecisioningOrchestrator — live-mode Pass 3 correction path', () => {
  it('Pass 2 correction_required → Pass 3 → re-audit clean → corrected_and_verified', async () => {
    stubFetchSequence(
      ok(maria.pass_1),
      ok(pass2Correction),
      ok(pass3Fixture),
      ok(reAuditClean),
    );
    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    // Wait for terminal state — RecommendationCard now shows the CORRECTED tier (Carlos's EDD)
    await waitFor(() => {
      const surface = screen.getByTestId('decisioning-surface');
      expect(within(surface).getByText('EDD')).toBeInTheDocument();
    });
    // AnalystControlPanel still mounted with the corrected pass1.
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
  });
});

// =====================================================================
// Live mode — cap-reached (correction_failed_surfaced)
// =====================================================================

describe('DecisioningOrchestrator — live-mode cap-reached path (Decision 21 cap-at-1)', () => {
  it('re-audit still flagged → correction_failed_surfaced; four stacked sections render per Finding G layout', async () => {
    stubFetchSequence(
      ok(maria.pass_1),
      ok(pass2Correction),
      ok(pass3Fixture),
      ok(reAuditStillFlagged),
    );
    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    await waitFor(() => {
      expect(screen.getByTestId('cap-reached-surface')).toBeInTheDocument();
    });
    // Four section labels per Finding G layout
    expect(screen.getByText('Original recommendation')).toBeInTheDocument();
    expect(screen.getByText('Original audit')).toBeInTheDocument();
    expect(screen.getByText('Correction attempted')).toBeInTheDocument();
    expect(screen.getByText('Re-audit findings')).toBeInTheDocument();
  });
});

// =====================================================================
// Live mode — Decision 36h race sub-case (a): analyst action mid-flight
// =====================================================================

describe('DecisioningOrchestrator — Decision 36h race sub-case (a) — analyst action on uncorrected output', () => {
  it('Approve click during pass_3 → raceSignalActionTaken raises at terminal → Pass3RaceBanner renders', async () => {
    const pass3Deferred = deferred<unknown>();
    const spy = vi.fn();
    spy
      .mockResolvedValueOnce(ok(maria.pass_1))
      .mockResolvedValueOnce(ok(pass2Correction))
      .mockReturnValueOnce(pass3Deferred.promise)
      .mockResolvedValueOnce(ok(reAuditClean));
    vi.stubGlobal('fetch', spy);

    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    // Wait for state to advance to pass_3 (Pass 3 in flight).
    await waitFor(() =>
      expect(screen.getByTestId('pass-3-in-flight')).toBeInTheDocument(),
    );

    // Click Approve while Pass 3 is in flight (panel mounted from pass_2
    // onward — see DecisioningOrchestrator docstring on mid-flight mounting).
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByText('Case approved')).toBeInTheDocument();

    // Resolve Pass 3 → state advances pass_3 → re_audit → corrected_and_verified.
    await act(async () => {
      pass3Deferred.resolve(ok(pass3Fixture));
    });

    // Pass3RaceBanner renders at terminal because raceSignalActionTaken
    // raised when re-audit completed with analystActionTaken=true.
    await waitFor(() =>
      expect(
        screen.getByText(/Audit findings revised after your previous action/),
      ).toBeInTheDocument(),
    );
  });
});

// =====================================================================
// Live mode — Decision 36h race sub-case (b): Override modal open at pass_3 entry
// =====================================================================

describe('DecisioningOrchestrator — Decision 36h race sub-case (b) — Override modal open at pass_3 entry', () => {
  it('Override modal opened during pass_2 → raceSignalModalOpen raises on pass_3 entry → race banner inside Modal banner slot', async () => {
    const pass2Deferred = deferred<unknown>();
    const spy = vi.fn();
    spy
      .mockResolvedValueOnce(ok(maria.pass_1))
      .mockReturnValueOnce(pass2Deferred.promise)
      .mockResolvedValueOnce(ok(pass3Fixture))
      .mockResolvedValueOnce(ok(reAuditClean));
    vi.stubGlobal('fetch', spy);

    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    // Wait for state to advance to pass_2 (panel mounted; Pass 2 in flight).
    await waitFor(() =>
      expect(screen.getByText('Pass 2 — Audit')).toBeInTheDocument(),
    );

    // Click Override → modal opens; onOverrideModalOpen fires
    // setOverrideModalOpen(true) on the live machine.
    fireEvent.click(screen.getByRole('button', { name: 'Override' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Resolve Pass 2 with correction_required → state advances pass_2 → pass_3.
    // raceSignalModalOpen raises because overrideModalOpen was true at
    // the transition.
    await act(async () => {
      pass2Deferred.resolve(ok(pass2Correction));
    });

    // Modal STAYS OPEN per Decision 36h ("modal does not auto-close").
    // Race banner appears INSIDE the modal banner slot (Modal primitive's
    // banner extension from Task 8.5).
    await waitFor(() => {
      expect(screen.getByTestId('modal-banner')).toBeInTheDocument();
    });
    expect(screen.getByRole('dialog')).toBeInTheDocument();
  });
});

// =====================================================================
// Mode switching — Finding I hygiene
// =====================================================================

describe('DecisioningOrchestrator — mode switching (Finding I: explicit live machine reset)', () => {
  it('persona terminal → live submission: persona machine resets via personaId useEffect; live machine starts fresh', async () => {
    stubFetchSequence(ok(maria.pass_1), ok(maria.pass_2));
    render(<DecisioningOrchestrator />);

    // Persona mode → terminal
    fireEvent.click(screen.getByRole('button', { name: 'Select Maria' }));
    await waitFor(() => {
      const surface = screen.getByTestId('decisioning-surface');
      expect(within(surface).getByText('Standard')).toBeInTheDocument();
    });

    // Switch to live mode (submit live form)
    fireLiveSubmit(maria.profile);

    // After mode switch, the persona machine resets to idle (via the
    // mode === 'persona' ? personaId : null filter in the orchestrator);
    // the live machine starts a fresh run. The DOM transitions through
    // live-mode states. Wait for the live terminal.
    await waitFor(() => {
      // Maria's pass_1 + pass_2 again — live terminal. RecommendationCard
      // visible. The persona's prior terminal state should not be sticky.
      const surface = screen.getByTestId('decisioning-surface');
      expect(within(surface).getByText('Standard')).toBeInTheDocument();
    });
    // Persona is no longer "active" — PersonaSelector's active-pressed state
    // would have been cleared by the orchestrator's setPersonaId(null) path
    // (only relevant if we wanted to assert; mode is now 'live').
  });

  it('live terminal → persona selection: live machine resets via mode-switch useEffect; persona machine starts fresh', async () => {
    stubFetchSequence(ok(maria.pass_1), ok(maria.pass_2));
    render(<DecisioningOrchestrator />);

    // Live mode → terminal
    fireLiveSubmit(maria.profile);
    await waitFor(() => {
      const surface = screen.getByTestId('decisioning-surface');
      expect(within(surface).getByText('Standard')).toBeInTheDocument();
    });

    // Switch to persona mode (click Carlos)
    fireEvent.click(screen.getByRole('button', { name: 'Select Carlos' }));

    // Persona-mode terminal — Carlos's EDD tier visible. Live machine
    // resets via the mode-switch useEffect.
    await waitFor(() => {
      const surface = screen.getByTestId('decisioning-surface');
      expect(within(surface).getByText('EDD')).toBeInTheDocument();
    });
  });
});

// =====================================================================
// 'failed' state rendering — Finding H workaround
// =====================================================================

describe('DecisioningOrchestrator — failed state (Finding H workaround for §5.3 headline persistence)', () => {
  it("failed at Pass 2 → headline 'Pass 2 — Audit' persists, error message in --violation-primary", async () => {
    const errorBody: DecisioningError = {
      pass: 2,
      errorType: 'upstream_timeout',
      message: 'Pass 2 timed out. Please try again.',
      retryable: true,
    };
    const spy = vi.fn();
    spy.mockResolvedValueOnce(ok(maria.pass_1));
    spy.mockResolvedValueOnce({ ok: false, status: 503, json: async () => errorBody });
    vi.stubGlobal('fetch', spy);

    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    await waitFor(() => {
      expect(screen.getByTestId('failed-error-message')).toBeInTheDocument();
    });
    // Headline persists per §5.3 — passHeadlineMap returns null for 'failed'
    // so the orchestrator's failedHeadlineProps derives from error.pass.
    expect(screen.getByText('Pass 2 — Audit')).toBeInTheDocument();
    // Error message in --violation-primary
    const errorEl = screen.getByTestId('failed-error-message');
    expect(errorEl).toHaveClass('text-violation-primary');
    expect(errorEl.textContent).toBe('Pass 2 timed out. Please try again.');
  });
});

// =====================================================================
// Structural guards — composition discipline at the orchestration layer
// =====================================================================

// =====================================================================
// ExaminerNotes wiring — Batch 10.4 Iteration 1
// =====================================================================

describe('DecisioningOrchestrator — ExaminerNotes does NOT mount at idle / pass_1 (Iteration 1)', () => {
  it('idle state: no Examiner Notes heading rendered', () => {
    render(<DecisioningOrchestrator />);
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Examiner Notes' }),
    ).not.toBeInTheDocument();
  });

  it('pass_1 in flight (Pass 1 fetch pending): no Examiner Notes heading rendered', async () => {
    // Defer Pass 1 fetch so the machine stays at pass_1 — pass1Output is null
    // until RESOLVE_PASS_1 fires, so displayPass1 is null and ExaminerNotes
    // does not mount.
    const pass1Deferred = deferred<unknown>();
    const spy = vi.fn();
    spy.mockReturnValueOnce(pass1Deferred.promise);
    vi.stubGlobal('fetch', spy);

    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    // Wait for state to advance from idle to pass_1 (the headline appears).
    await waitFor(() =>
      expect(
        screen.getByText('Pass 1 — Tier recommendation'),
      ).toBeInTheDocument(),
    );

    // ExaminerNotes does NOT mount at pass_1 (Pass 1 in flight, no
    // pass1Output yet).
    expect(
      screen.queryByRole('heading', { level: 2, name: 'Examiner Notes' }),
    ).not.toBeInTheDocument();

    // Clean up the dangling promise so afterEach unstubs cleanly.
    pass1Deferred.resolve(ok(maria.pass_1));
  });
});

describe('DecisioningOrchestrator — ExaminerNotes mounts at terminal (persona mode + live mode)', () => {
  it('persona mode terminal (passed_first_audit): ExaminerNotes renders Maria original content + persona-mode header', async () => {
    render(<DecisioningOrchestrator />);
    fireEvent.click(screen.getByRole('button', { name: 'Select Maria' }));

    // Terminal state reached when Maria's RecommendationCard appears.
    await waitFor(() => {
      const surface = screen.getByTestId('decisioning-surface');
      expect(within(surface).getByText('Standard')).toBeInTheDocument();
    });

    // ExaminerNotes heading present.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Examiner Notes' }),
    ).toBeInTheDocument();
    // Maria's original summary_finding renders (no Pass 3 fired here).
    expect(
      screen.getByText(maria.pass_1.summary_finding),
    ).toBeInTheDocument();
    // Persona-mode header shows persona name + customer reference.
    // Maria's listPersonas() name + Maria's profile.customer_reference.
    expect(
      screen.getByText(
        `${maria.name} · ${maria.profile.customer_reference}`,
      ),
    ).toBeInTheDocument();
  });

  it("live mode terminal (passed_first_audit): ExaminerNotes renders Maria original content + 'Custom case' live-mode header (Iteration 2 livePersonaName rework)", async () => {
    stubFetchSequence(ok(maria.pass_1), ok(maria.pass_2));
    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    await waitFor(() => {
      const surface = screen.getByTestId('decisioning-surface');
      expect(within(surface).getByText('Standard')).toBeInTheDocument();
    });

    expect(
      screen.getByRole('heading', { level: 2, name: 'Examiner Notes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(maria.pass_1.summary_finding),
    ).toBeInTheDocument();
    // Iteration 2 Item 2: livePersonaName is now the 'Custom case' mode-label
    // (not duplicative with customerReference). Header reads
    // "Custom case · <customer_reference>" — distinct strings, role-
    // distinguished (label vs identifier).
    expect(
      screen.getByText(`Custom case · ${maria.profile.customer_reference}`),
    ).toBeInTheDocument();
    // Negative regression-guard against the Iteration 1 duplication.
    expect(
      screen.queryByText(
        `${maria.profile.customer_reference} · ${maria.profile.customer_reference}`,
      ),
    ).not.toBeInTheDocument();
  });

  it("live mode Override modal title uses 'Custom case' mode-label (Iteration 2 livePersonaName rework, second affected surface)", async () => {
    stubFetchSequence(ok(maria.pass_1), ok(maria.pass_2));
    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    await waitFor(() => {
      expect(
        screen.getByRole('button', { name: 'Override' }),
      ).toBeInTheDocument();
    });

    fireEvent.click(screen.getByRole('button', { name: 'Override' }));
    // Modal title reads "Override Custom case's recommendation" — institutional-
    // register mode-disclosure-by-label.
    expect(
      screen.getByText("Override Custom case's recommendation"),
    ).toBeInTheDocument();
  });
});

describe('DecisioningOrchestrator — Pass 3 dual-mode content selection (Iteration 1 Finding E)', () => {
  it('corrected_and_verified: ExaminerNotes renders CORRECTED content (Carlos summary, not Maria)', async () => {
    stubFetchSequence(
      ok(maria.pass_1),
      ok(pass2Correction),
      ok(pass3Fixture),
      ok(reAuditClean),
    );
    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    // Terminal: corrected tier "EDD" shown by RecommendationCard.
    await waitFor(() => {
      const surface = screen.getByTestId('decisioning-surface');
      expect(within(surface).getByText('EDD')).toBeInTheDocument();
    });

    // displayPass1 === effectivePass1 === pass3.corrected_pass_1_output === carlos.pass_1.
    expect(
      screen.getByText(carlos.pass_1.summary_finding),
    ).toBeInTheDocument();
    // Positive regression-guard against the "original at terminal" mistake.
    expect(
      screen.queryByText(maria.pass_1.summary_finding),
    ).not.toBeInTheDocument();
  });

  it('correction_failed_surfaced: ExaminerNotes renders CORRECTED content (Carlos summary) inside cap-reached layout', async () => {
    stubFetchSequence(
      ok(maria.pass_1),
      ok(pass2Correction),
      ok(pass3Fixture),
      ok(reAuditStillFlagged),
    );
    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    await waitFor(() => {
      expect(screen.getByTestId('cap-reached-surface')).toBeInTheDocument();
    });

    // ExaminerNotes mounts AFTER the four CapReachedSections, BEFORE the
    // analyst panel — preserves canonical visual_system.md:186 ordering.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Examiner Notes' }),
    ).toBeInTheDocument();
    // Corrected content (Carlos) renders.
    expect(
      screen.getByText(carlos.pass_1.summary_finding),
    ).toBeInTheDocument();
  });
});

describe('DecisioningOrchestrator — ExaminerNotes at failed state (Iteration 1 Finding F)', () => {
  it('failed at Pass 2: ExaminerNotes mounts with ORIGINAL Pass 1 content, AnalystControlPanel does NOT mount', async () => {
    const errorBody: DecisioningError = {
      pass: 2,
      errorType: 'upstream_timeout',
      message: 'Pass 2 timed out. Please try again.',
      retryable: true,
    };
    const spy = vi.fn();
    spy.mockResolvedValueOnce(ok(maria.pass_1));
    spy.mockResolvedValueOnce({ ok: false, status: 503, json: async () => errorBody });
    vi.stubGlobal('fetch', spy);

    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    await waitFor(() => {
      expect(screen.getByTestId('failed-error-message')).toBeInTheDocument();
    });

    // ExaminerNotes mounts with Maria's original content.
    expect(
      screen.getByRole('heading', { level: 2, name: 'Examiner Notes' }),
    ).toBeInTheDocument();
    expect(
      screen.getByText(maria.pass_1.summary_finding),
    ).toBeInTheDocument();
    // AnalystControlPanel does NOT mount at failed state — eighth-sub-class
    // divergence-by-design per Iteration 1 Finding F.
    expect(
      screen.queryByRole('button', { name: 'Approve' }),
    ).not.toBeInTheDocument();
    expect(
      screen.queryByRole('button', { name: 'Override' }),
    ).not.toBeInTheDocument();
  });

  it('failed state: ExaminerNotes positioned BELOW the error message', async () => {
    const errorBody: DecisioningError = {
      pass: 2,
      errorType: 'upstream_timeout',
      message: 'Pass 2 timed out.',
      retryable: true,
    };
    const spy = vi.fn();
    spy.mockResolvedValueOnce(ok(maria.pass_1));
    spy.mockResolvedValueOnce({ ok: false, status: 503, json: async () => errorBody });
    vi.stubGlobal('fetch', spy);

    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    await waitFor(() => {
      expect(screen.getByTestId('failed-error-message')).toBeInTheDocument();
    });

    // Locate the error message and the Examiner Notes heading; verify the
    // heading comes AFTER the error in document order (DOM positioning per
    // Iteration 1 Finding F disposition).
    const errorEl = screen.getByTestId('failed-error-message');
    const examinerHeading = screen.getByRole('heading', {
      level: 2,
      name: 'Examiner Notes',
    });
    expect(
      errorEl.compareDocumentPosition(examinerHeading) &
        Node.DOCUMENT_POSITION_FOLLOWING,
    ).toBeTruthy();
  });
});

describe('DecisioningOrchestrator — ExaminerNotes mid-flight → terminal boundary substitution (Iteration 1 hook-integration)', () => {
  it('pass_3 in flight: ExaminerNotes shows ORIGINAL content; corrected_and_verified terminal: ExaminerNotes shows CORRECTED content', async () => {
    // Defer Pass 3 so the boundary transition can be observed.
    const pass3Deferred = deferred<unknown>();
    const spy = vi.fn();
    spy
      .mockResolvedValueOnce(ok(maria.pass_1))
      .mockResolvedValueOnce(ok(pass2Correction))
      .mockReturnValueOnce(pass3Deferred.promise)
      .mockResolvedValueOnce(ok(reAuditClean));
    vi.stubGlobal('fetch', spy);

    render(<DecisioningOrchestrator />);
    fireLiveSubmit(maria.profile);

    // Wait for pass_3 state (Pass 3 in flight). At pass_3, ExaminerNotes
    // renders Maria's ORIGINAL summary_finding (mid-flight content rule).
    await waitFor(() =>
      expect(screen.getByTestId('pass-3-in-flight')).toBeInTheDocument(),
    );
    expect(
      screen.getByText(maria.pass_1.summary_finding),
    ).toBeInTheDocument();
    expect(
      screen.queryByText(carlos.pass_1.summary_finding),
    ).not.toBeInTheDocument();

    // Resolve Pass 3 → state advances pass_3 → re_audit → corrected_and_verified.
    await act(async () => {
      pass3Deferred.resolve(ok(pass3Fixture));
    });

    // At corrected_and_verified, displayPass1 swaps to the corrected content.
    // ExaminerNotes re-renders with Carlos's summary; the original is gone.
    await waitFor(() => {
      expect(
        screen.getByText(carlos.pass_1.summary_finding),
      ).toBeInTheDocument();
    });
    expect(
      screen.queryByText(maria.pass_1.summary_finding),
    ).not.toBeInTheDocument();
  });
});

describe('DecisioningOrchestrator — structural guards: lawful orchestration consumer, no API leakage', () => {
  // This component IS the designated wiring layer. Orchestration hook
  // imports are lawful here; API client imports are NOT (the hooks route
  // through decisioningClient internally — see liveDecisioning.ts).
  const src = readFileSync(
    'components/orchestration/DecisioningOrchestrator.tsx',
    'utf-8',
  );
  const fromPaths = [...src.matchAll(/from\s+['"]([^'"]+)['"]/g)].map((m) => m[1]);

  it('imports both orchestration hooks (the designated wiring layer)', () => {
    expect(fromPaths).toContain('@/lib/orchestration/personaPlayback');
    expect(fromPaths).toContain('@/lib/orchestration/liveDecisioning');
  });

  it('imports zero API-client modules (decisioningClient is consumed inside useLiveDecisioning, not here)', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/lib\/api\b|decisioningClient/);
    }
  });

  it('imports zero cost-protection / Upstash modules (server-side concerns)', () => {
    for (const p of fromPaths) {
      expect(p).not.toMatch(/upstash|redis|costprotection|rateLimit|killSwitch/i);
    }
  });
});
