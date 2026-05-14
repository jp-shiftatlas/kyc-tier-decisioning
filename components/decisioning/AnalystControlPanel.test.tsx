import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render, screen, fireEvent, cleanup, act } from '@testing-library/react';
import { AnalystControlPanel } from './AnalystControlPanel';
import { loadPersona } from '@/lib/schemas/personaAdapters';
import type { Pass3Output } from '@/lib/schemas/pass3';

afterEach(() => {
  cleanup();
  document.body.style.overflow = '';
});

const mockPass3: Pass3Output = {
  correction_against_audit_id: 'audit-test',
  correction_attempt_number: 1,
  corrected_pass_1_output: {} as unknown as Pass3Output['corrected_pass_1_output'],
  change_log: [
    { field: 'decision.recommended_tier', before: 'Standard', after: 'EDD', reason: 'test' },
  ],
};

// Helper: render with a Maria-like baseline (Standard tier, senior_approval=false,
// no Pass 3). Returns the rerender function for prop-change scenarios.
function renderPanel(overrides?: Parameters<typeof AnalystControlPanel>[0]) {
  const maria = loadPersona('maria');
  return render(
    <AnalystControlPanel
      personaId={maria.id}
      personaName={maria.name}
      pass1={maria.pass_1}
      {...overrides}
    />,
  );
}

describe('AnalystControlPanel — initial render (§5.5 lines 329–332)', () => {
  it('renders the three action buttons with spec-named labels (Maria baseline; senior_approval=false)', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escalate' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Override' })).toBeInTheDocument();
  });

  it('renders no confirmation block or Reset case link before any action', () => {
    renderPanel();
    expect(screen.queryByText(/Case approved/i)).not.toBeInTheDocument();
    expect(screen.queryByText(/Escalated/i)).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset case/i })).not.toBeInTheDocument();
  });
});

describe('AnalystControlPanel — Decision 36b concordance signaling (Carlos PEP case)', () => {
  // Carlos's pass_1.decision.senior_approval_required is true; per §5.5
  // line 335: Escalate label becomes "Confirm Escalation" pre-click, Approve
  // is visually de-emphasized.
  it('Escalate button reads "Confirm Escalation" when senior_approval_required:true', () => {
    const carlos = loadPersona('carlos');
    render(
      <AnalystControlPanel
        personaId={carlos.id}
        personaName={carlos.name}
        pass1={carlos.pass_1}
      />,
    );
    expect(screen.getByRole('button', { name: 'Confirm Escalation' })).toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /^Escalate$/ })).not.toBeInTheDocument();
  });

  it('Approve button visually de-emphasized (opacity-50 + --text-secondary border) when senior_approval_required:true', () => {
    const carlos = loadPersona('carlos');
    render(
      <AnalystControlPanel
        personaId={carlos.id}
        personaName={carlos.name}
        pass1={carlos.pass_1}
      />,
    );
    const approveBtn = screen.getByRole('button', { name: 'Approve' });
    expect(approveBtn).toHaveClass('opacity-50');
    expect(approveBtn).toHaveClass('border-text-secondary');
  });

  it('Approve button NOT de-emphasized when senior_approval_required:false (Maria)', () => {
    renderPanel();
    const approveBtn = screen.getByRole('button', { name: 'Approve' });
    // Button primitive's baseline carries `disabled:opacity-50` for the
    // disabled-state visual; the de-emphasis discipline adds an UNPREFIXED
    // `opacity-50` token. Tokenize and check for the bare class only.
    const classes = approveBtn.className.split(/\s+/);
    expect(classes).not.toContain('opacity-50');
    expect(classes).not.toContain('border-text-secondary');
  });
});

describe('AnalystControlPanel — Decision 36a Approve confirmation block', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:34:56Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('renders the "Case approved" confirmation block with field structure per §5.5 lines 342–347', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));

    expect(screen.getByText('Case approved')).toBeInTheDocument();
    expect(screen.getByText(/Analyst:/)).toBeInTheDocument();
    expect(screen.getByText('Demo Analyst')).toBeInTheDocument();
    expect(screen.getByText(/Timestamp:/)).toBeInTheDocument();
    expect(screen.getByText(/Tier:/)).toBeInTheDocument();
    expect(screen.getByText(/Decisive rules:/)).toBeInTheDocument();
    expect(screen.getByText(/Audit reference:/)).toBeInTheDocument();
  });

  it('renders the production-preview microcopy below the confirmation fields (§5.5 line 350)', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(
      screen.getByText(
        /Production: this record persists.*Demo: this record is not retained/,
      ),
    ).toBeInTheDocument();
  });
});

describe('AnalystControlPanel — Decision 36b Escalate confirmation', () => {
  it('renders "Escalated" heading (NOT "Case escalated"; concordance cue lived in pre-click button)', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Escalate' }));
    expect(screen.getByText('Escalated')).toBeInTheDocument();
    expect(screen.queryByText('Case escalated')).not.toBeInTheDocument();
  });
});

describe('AnalystControlPanel — Decision 36g audit reference format', () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-05-14T12:34:56Z'));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it('generates audit reference matching audit-{persona_id}-{YYYYMMDDHHMMSS} format', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    // Maria's persona id is "maria"; mocked time is 2026-05-14T12:34:56Z.
    expect(screen.getByText('audit-maria-20260514123456')).toBeInTheDocument();
  });

  it('audit reference value renders in --font-mono per §5.5 line 353', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    const refValue = screen.getByText(/^audit-maria-/);
    expect(refValue).toHaveClass('font-mono');
  });
});

describe('AnalystControlPanel — Decision 36d post-action button state lockdown', () => {
  it('disables all three action buttons after Approve', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByRole('button', { name: 'Approve' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Escalate' })).toBeDisabled();
    expect(screen.getByRole('button', { name: 'Override' })).toBeDisabled();
  });

  it('renders "Reset case" link in --text-tertiary --text-sm after any action', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    const resetLink = screen.getByRole('button', { name: /reset case/i });
    expect(resetLink).toBeInTheDocument();
    expect(resetLink).toHaveClass('text-text-tertiary');
    expect(resetLink).toHaveClass('text-sm');
  });

  it('Reset case link click returns state to idle (buttons re-enabled, confirmation gone)', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    fireEvent.click(screen.getByRole('button', { name: /reset case/i }));
    expect(screen.getByRole('button', { name: 'Approve' })).not.toBeDisabled();
    expect(screen.queryByText('Case approved')).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /reset case/i })).not.toBeInTheDocument();
  });
});

describe('AnalystControlPanel — Decision 36e persona switching reset', () => {
  it('switching personaId mid-action resets action state', () => {
    const maria = loadPersona('maria');
    const carlos = loadPersona('carlos');
    const { rerender } = render(
      <AnalystControlPanel
        personaId={maria.id}
        personaName={maria.name}
        pass1={maria.pass_1}
      />,
    );
    // Click Approve → state=approved
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByText('Case approved')).toBeInTheDocument();

    // Switch persona → state should reset to idle
    rerender(
      <AnalystControlPanel
        personaId={carlos.id}
        personaName={carlos.name}
        pass1={carlos.pass_1}
      />,
    );
    expect(screen.queryByText('Case approved')).not.toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Approve' })).not.toBeDisabled();
  });
});

describe('AnalystControlPanel — Decision 36c Override modal + post-submit "Superseded" view', () => {
  it('Override button click opens the modal with per-persona title', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Override' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    expect(screen.getByText(/Override Maria's recommendation/)).toBeInTheDocument();
  });

  it('submit-override is disabled until textarea contains non-whitespace content (Decision 36c)', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Override' }));
    const submitBtn = screen.getByRole('button', { name: /submit override/i });
    expect(submitBtn).toBeDisabled();
    const textarea = screen.getByRole('textbox');
    fireEvent.change(textarea, { target: { value: '   ' } }); // whitespace only
    expect(submitBtn).toBeDisabled();
    fireEvent.change(textarea, { target: { value: 'Documented basis text' } });
    expect(submitBtn).not.toBeDisabled();
  });

  it('on Override submit, modal closes and "Superseded by analyst override" view renders below panel (Finding 17 disposition A)', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Override' }));
    fireEvent.change(screen.getByRole('textbox'), {
      target: { value: 'Override basis: senior judgment overrides AI tier' },
    });
    fireEvent.click(screen.getByRole('button', { name: /submit override/i }));

    // Modal closed
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    // "Superseded by analyst override" header rendered
    expect(screen.getByText('Superseded by analyst override')).toBeInTheDocument();
    // Analyst basis rendered
    expect(screen.getByText(/Override basis: senior judgment overrides AI tier/)).toBeInTheDocument();
    // RecommendationCard composed (full-fidelity re-render per Decision 36c).
    // Maria's tier badge "Standard" is part of the composed RecommendationCard.
    const standardBadges = screen.getAllByText('Standard');
    expect(standardBadges.length).toBeGreaterThan(0);
  });
});

describe('AnalystControlPanel — Decision 36f Override modal cancellation paths', () => {
  it('Cancel button dismisses modal without recording action', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Override' }));
    fireEvent.click(screen.getByRole('button', { name: /cancel/i }));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Superseded by analyst override')).not.toBeInTheDocument();
  });

  it('Escape key dismisses modal without recording action', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Override' }));
    fireEvent.keyDown(document, { key: 'Escape' });
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Superseded by analyst override')).not.toBeInTheDocument();
  });

  it('Backdrop click dismisses modal without recording action', () => {
    renderPanel();
    fireEvent.click(screen.getByRole('button', { name: 'Override' }));
    fireEvent.click(screen.getByTestId('modal-backdrop'));
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument();
    expect(screen.queryByText('Superseded by analyst override')).not.toBeInTheDocument();
  });
});

describe('AnalystControlPanel — Decision 36h race coordination + Pass3 banner placement orchestration', () => {
  it('renders Pass3CorrectionBanner above the panel when pass3 != null AND actionState=idle AND !raceTrigger', () => {
    renderPanel({
      personaId: 'maria',
      personaName: 'Maria',
      pass1: loadPersona('maria').pass_1,
      pass3: mockPass3,
    });
    expect(screen.getByText('Pass 3 — Targeted correction applied')).toBeInTheDocument();
  });

  it('does NOT render Pass3CorrectionBanner after an analyst action is taken', () => {
    renderPanel({
      personaId: 'maria',
      personaName: 'Maria',
      pass1: loadPersona('maria').pass_1,
      pass3: mockPass3,
    });
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.queryByText('Pass 3 — Targeted correction applied')).not.toBeInTheDocument();
  });

  it('renders Pass3RaceBanner ABOVE the panel when raceTrigger:true AND no override modal open (default placement)', () => {
    renderPanel({
      personaId: 'maria',
      personaName: 'Maria',
      pass1: loadPersona('maria').pass_1,
      pass3: mockPass3,
      raceTrigger: true,
    });
    expect(
      screen.getByText(/Audit findings revised after your previous action/),
    ).toBeInTheDocument();
    // No modal-banner testid present (banner is above panel, not inside modal)
    expect(screen.queryByTestId('modal-banner')).not.toBeInTheDocument();
  });

  it('renders Pass3RaceBanner INSIDE the Modal banner slot when Override modal open AND raceTrigger flips to true (§5.5 line 369)', () => {
    const maria = loadPersona('maria');
    const { rerender } = render(
      <AnalystControlPanel
        personaId={maria.id}
        personaName={maria.name}
        pass1={maria.pass_1}
        pass3={mockPass3}
        raceTrigger={false}
      />,
    );
    // Open Override modal first
    fireEvent.click(screen.getByRole('button', { name: 'Override' }));
    expect(screen.getByRole('dialog')).toBeInTheDocument();

    // Race fires while modal is open
    rerender(
      <AnalystControlPanel
        personaId={maria.id}
        personaName={maria.name}
        pass1={maria.pass_1}
        pass3={mockPass3}
        raceTrigger={true}
      />,
    );

    // Modal stays open (does NOT auto-close per §5.5 line 369)
    expect(screen.getByRole('dialog')).toBeInTheDocument();
    // Race banner appears INSIDE the modal via banner slot
    expect(screen.getByTestId('modal-banner')).toBeInTheDocument();
    // Race banner verbatim message present inside the slot
    expect(
      screen.getByText(/Audit findings revised after your previous action/),
    ).toBeInTheDocument();
  });

  it('raceTrigger transition false→true resets actionState to idle (banner replaces confirmation block)', () => {
    const maria = loadPersona('maria');
    const { rerender } = render(
      <AnalystControlPanel
        personaId={maria.id}
        personaName={maria.name}
        pass1={maria.pass_1}
        pass3={null}
        raceTrigger={false}
      />,
    );
    // Click Approve → state=approved, confirmation visible
    fireEvent.click(screen.getByRole('button', { name: 'Approve' }));
    expect(screen.getByText('Case approved')).toBeInTheDocument();

    // Parent signals race
    rerender(
      <AnalystControlPanel
        personaId={maria.id}
        personaName={maria.name}
        pass1={maria.pass_1}
        pass3={mockPass3}
        raceTrigger={true}
      />,
    );

    // Action state reset → confirmation gone
    expect(screen.queryByText('Case approved')).not.toBeInTheDocument();
    // Race banner above panel
    expect(
      screen.getByText(/Audit findings revised after your previous action/),
    ).toBeInTheDocument();
  });
});

describe('AnalystControlPanel — Decision 17 action-surface boundary (corollary discipline)', () => {
  // AnalystControlPanel HAS the action affordances (which AuditPanel does not
  // — AuditPanel has the inverse regression guard at AuditPanel.test.tsx:96).
  // The corollary discipline here: positive presence of all three action
  // affordances at this component.
  it('renders Override button at this surface (counterpart to AuditPanel.test.tsx:96 inverse guard)', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Override' })).toBeInTheDocument();
  });

  it('renders Approve + Escalate buttons at this surface as the action authority', () => {
    renderPanel();
    expect(screen.getByRole('button', { name: 'Approve' })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: 'Escalate' })).toBeInTheDocument();
  });
});
