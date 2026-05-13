import { describe, it, expect, vi } from 'vitest';
import { act, render, screen, fireEvent } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { CustomInputForm } from './CustomInputForm';
import type { CustomerProfile } from '@/lib/schemas/customerProfile';

// Test helper — fill all 13 fields with valid values matching Maria-like baseline.
// Composite fields default to primary-only (no secondary, no PhilSys-in-process).
// Occupation defaults to enum branch (no "Other..." reveal). Volume populated via
// the format-on-blur numeric input.
async function fillValidForm(user: ReturnType<typeof userEvent.setup>) {
  await user.type(screen.getByLabelText('Customer reference'), 'CUST-001');
  await user.selectOptions(screen.getByLabelText('Identity document'), 'PhilSys');
  await user.selectOptions(screen.getByLabelText('Residency status'), 'PH resident');
  await user.selectOptions(screen.getByLabelText('Customer type'), 'individual retail');

  // Occupation — enum branch (default kind=enum reveals the "from list" sub-select)
  await user.selectOptions(screen.getByLabelText('Occupation (from list)'), 'employed');

  await user.selectOptions(screen.getByLabelText('Source of funds'), 'salary');
  await user.selectOptions(screen.getByLabelText('Account purpose'), 'payroll');

  // Volume — type then blur to trigger format-on-blur + setValue
  const volumeInput = screen.getByLabelText('Expected monthly volume');
  await user.type(volumeInput, '80000');
  fireEvent.blur(volumeInput);

  await user.selectOptions(screen.getByLabelText('PEP status'), 'none');
  await user.selectOptions(screen.getByLabelText('Sanctions screening'), 'clean');
  await user.selectOptions(screen.getByLabelText('High-risk jurisdiction connection'), 'none');
  await user.selectOptions(screen.getByLabelText('Adverse media'), 'no');
  await user.selectOptions(screen.getByLabelText('Years with bank'), 'new');
}

describe('CustomInputForm — render (§5.6 / Decision 37c)', () => {
  it('renders the "Live audit" mode-disclosure label above the form', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    expect(screen.getByText('Live audit')).toBeInTheDocument();
  });

  it('renders all four group section labels (Decision 37c regulatory-function layout)', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    expect(screen.getByText('Customer identity')).toBeInTheDocument();
    expect(screen.getByText(/Account.*behavior/i)).toBeInTheDocument();
    expect(screen.getByText('Risk indicators')).toBeInTheDocument();
    expect(screen.getByText('Relationship')).toBeInTheDocument();
  });

  it('renders all 13 field labels', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    expect(screen.getByText('Customer reference')).toBeInTheDocument();
    expect(screen.getByText('Identity document')).toBeInTheDocument();
    expect(screen.getByText('Residency status')).toBeInTheDocument();
    expect(screen.getByText('Customer type')).toBeInTheDocument();
    expect(screen.getByText('Occupation')).toBeInTheDocument();
    expect(screen.getByText('Source of funds')).toBeInTheDocument();
    expect(screen.getByText('Account purpose')).toBeInTheDocument();
    expect(screen.getByText('Expected monthly volume')).toBeInTheDocument();
    expect(screen.getByText('PEP status')).toBeInTheDocument();
    expect(screen.getByText('Sanctions screening')).toBeInTheDocument();
    expect(screen.getByText('High-risk jurisdiction connection')).toBeInTheDocument();
    expect(screen.getByText('Adverse media')).toBeInTheDocument();
    expect(screen.getByText('Years with bank')).toBeInTheDocument();
  });

  it('renders submit button with exact text "Run three-pass analysis"', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    expect(screen.getByRole('button', { name: 'Run three-pass analysis' })).toBeInTheDocument();
  });

  it('renders the rate-limit footer microcopy (§4.8 / §5.6 line 420)', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    expect(
      screen.getByText(/rate-limited per session.*Pre-generated examples are not affected/),
    ).toBeInTheDocument();
  });
});

describe('CustomInputForm — Decision 27 wrapper-leakage prohibition', () => {
  // Regression guard: the form renders the 13 customer-profile fields only.
  // No orchestration metadata (demo intent, scenario type, persona ID, etc.)
  // ever lands at this surface. CustomerProfileSchema.strictObject() also
  // enforces this at the schema layer.
  it('does NOT render a "demo intent" field (Decision 27 wrapper-leakage)', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    expect(screen.queryByLabelText(/demo intent/i)).not.toBeInTheDocument();
  });

  it('does NOT render a "scenario type" field (Decision 27 wrapper-leakage)', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    expect(screen.queryByLabelText(/scenario type/i)).not.toBeInTheDocument();
  });
});

describe('CustomInputForm — years_with_bank renders as enum dropdown (dispatch-prep verification)', () => {
  // data/personas.json Maria's profile carries "years_with_bank": "new" (string enum).
  // Form field stays as enum dropdown in the Relationship group; Decision 37c layout holds.
  it('renders years_with_bank as a <select>, NOT a numeric <input>', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    const field = screen.getByLabelText('Years with bank');
    expect(field.tagName).toBe('SELECT');
  });
});

describe('CustomInputForm — Decision 37a composite wire-format integrity', () => {
  it('joins source_of_funds + secondary into "mixed (primary + secondary)" wire string', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(p: CustomerProfile) => void>();
    render(<CustomInputForm onValidatedSubmit={onSubmit} />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: /\+ Add additional source/i }));
    await user.selectOptions(screen.getByLabelText('Source of funds (additional)'), 'inheritance');

    await user.click(screen.getByRole('button', { name: 'Run three-pass analysis' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0]![0];
    expect(payload.source_of_funds).toBe('mixed (salary + inheritance)');
  });

  it('joins account_purpose + secondary into "{primary} and {secondary}" wire string', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(p: CustomerProfile) => void>();
    render(<CustomInputForm onValidatedSubmit={onSubmit} />);
    await fillValidForm(user);
    // Switch primary from payroll → business so the wire-string assertion is unambiguous
    await user.selectOptions(screen.getByLabelText('Account purpose'), 'business');
    await user.click(screen.getByRole('button', { name: /\+ Add additional purpose/i }));
    await user.selectOptions(screen.getByLabelText('Account purpose (additional)'), 'remittance');

    await user.click(screen.getByRole('button', { name: 'Run three-pass analysis' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0]![0];
    expect(payload.account_purpose).toBe('business and remittance');
  });

  it('joins identity_document + PhilSys-in-process checkbox into "{primary} (PhilSys enrollment in process)" wire string', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(p: CustomerProfile) => void>();
    render(<CustomInputForm onValidatedSubmit={onSubmit} />);
    await fillValidForm(user);
    // Switch primary to passport (so the PhilSys-in-process checkbox becomes active)
    await user.selectOptions(screen.getByLabelText('Identity document'), 'passport');
    // Source-of-funds switch from salary→business so wire-string is unambiguous in this test
    await user.selectOptions(screen.getByLabelText('Source of funds'), 'business');
    await user.click(screen.getByLabelText(/PhilSys enrollment in process/i));

    await user.click(screen.getByRole('button', { name: 'Run three-pass analysis' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0]![0];
    expect(payload.identity_document_type).toBe('passport (PhilSys enrollment in process)');
  });

  it('emits primary-only wire string when no secondary / no PhilSys-in-process', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(p: CustomerProfile) => void>();
    render(<CustomInputForm onValidatedSubmit={onSubmit} />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Run three-pass analysis' }));

    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0]![0];
    expect(payload.source_of_funds).toBe('salary');
    expect(payload.account_purpose).toBe('payroll');
    expect(payload.identity_document_type).toBe('PhilSys');
  });
});

describe('CustomInputForm — Decision 37b occupation_type three-guard chain (UI surface)', () => {
  // Guard 1 (min-3 on free-text) — UI surface exercise
  it('rejects free-text occupation shorter than 3 chars (Decision 37b guard 1)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(p: CustomerProfile) => void>();
    render(<CustomInputForm onValidatedSubmit={onSubmit} />);
    await fillValidForm(user);
    // Switch occupation to "Other..." free-text branch (§5.6 line 395 reveal)
    await user.selectOptions(screen.getByLabelText('Occupation'), 'other');
    await user.type(screen.getByLabelText('Occupation (free text)'), 'xy');
    await user.click(screen.getByRole('button', { name: 'Run three-pass analysis' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });

  // Guard 2 (case-insensitive enum match) — UI surface exercise
  it('normalizes case-variant enum free-text input to canonical enum value (Decision 37b guard 2)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(p: CustomerProfile) => void>();
    render(<CustomInputForm onValidatedSubmit={onSubmit} />);
    await fillValidForm(user);
    await user.selectOptions(screen.getByLabelText('Occupation'), 'other');
    await user.type(screen.getByLabelText('Occupation (free text)'), 'Employed');
    await user.click(screen.getByRole('button', { name: 'Run three-pass analysis' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0].occupation_type).toBe('employed');
  });

  // Guard 3 (trim + case-normalize) — UI surface exercise
  it('trims + lowercases free-text occupation for canonical storage (Decision 37b guard 3)', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(p: CustomerProfile) => void>();
    render(<CustomInputForm onValidatedSubmit={onSubmit} />);
    await fillValidForm(user);
    await user.selectOptions(screen.getByLabelText('Occupation'), 'other');
    await user.type(screen.getByLabelText('Occupation (free text)'), '  Software Engineer  ');
    await user.click(screen.getByRole('button', { name: 'Run three-pass analysis' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    expect(onSubmit.mock.calls[0]![0].occupation_type).toBe('software engineer');
  });
});

describe('CustomInputForm — Decision 37d regulatory citation tooltips', () => {
  it('renders ? tooltip glyphs on the four spec-named fields (pep_status, high_risk_jurisdiction_connection, source_of_funds, customer_type)', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    expect(screen.getByLabelText(/Regulatory citation for PEP status/i)).toBeInTheDocument();
    expect(
      screen.getByLabelText(/Regulatory citation for High-risk jurisdiction connection/i),
    ).toBeInTheDocument();
    expect(screen.getByLabelText(/Regulatory citation for Source of funds/i)).toBeInTheDocument();
    expect(screen.getByLabelText(/Regulatory citation for Customer type/i)).toBeInTheDocument();
  });

  it('does NOT render ? tooltip glyphs on the nine non-tooltip fields', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    expect(screen.queryByLabelText(/Regulatory citation for Customer reference/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Regulatory citation for Residency status/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Regulatory citation for Occupation/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Regulatory citation for Account purpose/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Regulatory citation for Sanctions screening/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Regulatory citation for Adverse media/i)).not.toBeInTheDocument();
    expect(screen.queryByLabelText(/Regulatory citation for Years with bank/i)).not.toBeInTheDocument();
  });

  it('tooltip-trigger buttons carry data-tooltip-trigger attribute (path A composition-layer ownership marker)', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    const pepTrigger = screen.getByLabelText(/Regulatory citation for PEP status/i);
    expect(pepTrigger.hasAttribute('data-tooltip-trigger')).toBe(true);
  });
});

describe('CustomInputForm — Tooltip mobile tap-to-dismiss (Batch 11 prerequisite #2 resolution, path A)', () => {
  // Path A: composition owns three mobile behaviors. Tap-elsewhere-to-dismiss
  // is enforced via the document-level pointerdown listener registered at mount.
  // When the active element is a tooltip-trigger button and the pointerdown
  // target is outside it, the listener blurs the button → Tooltip primitive's
  // onBlur closes the tooltip.
  it('document-level pointerdown outside a focused tooltip trigger blurs it (tap-elsewhere-to-dismiss)', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    const pepTrigger = screen.getByLabelText(/Regulatory citation for PEP status/i) as HTMLButtonElement;
    act(() => pepTrigger.focus());
    expect(document.activeElement).toBe(pepTrigger);
    const form = pepTrigger.closest('form')!;
    // jsdom lacks PointerEvent; a plain Event with type "pointerdown" reaches the listener.
    act(() => {
      form.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    expect(document.activeElement).not.toBe(pepTrigger);
  });

  it('tapping the focused tooltip glyph again blurs it (tap-glyph-again-to-dismiss)', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    const pepTrigger = screen.getByLabelText(/Regulatory citation for PEP status/i) as HTMLButtonElement;
    act(() => pepTrigger.focus());
    expect(document.activeElement).toBe(pepTrigger);
    act(() => pepTrigger.click());
    expect(document.activeElement).not.toBe(pepTrigger);
  });

  it('pointerdown on the trigger itself does NOT blur (tap-to-show preserves focus)', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    const pepTrigger = screen.getByLabelText(/Regulatory citation for PEP status/i) as HTMLButtonElement;
    act(() => pepTrigger.focus());
    expect(document.activeElement).toBe(pepTrigger);
    act(() => {
      pepTrigger.dispatchEvent(new Event('pointerdown', { bubbles: true }));
    });
    // The document-level listener must NOT blur when the pointerdown target is the trigger itself
    expect(document.activeElement).toBe(pepTrigger);
  });
});

describe('CustomInputForm — submit produces validated CustomerProfile', () => {
  it('invokes onValidatedSubmit with a CustomerProfileSchema-valid payload', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(p: CustomerProfile) => void>();
    render(<CustomInputForm onValidatedSubmit={onSubmit} />);
    await fillValidForm(user);
    await user.click(screen.getByRole('button', { name: 'Run three-pass analysis' }));
    expect(onSubmit).toHaveBeenCalledTimes(1);
    const payload = onSubmit.mock.calls[0]![0];
    expect(payload.customer_reference).toBe('CUST-001');
    expect(payload.identity_document_type).toBe('PhilSys');
    expect(payload.residency_status).toBe('PH resident');
    expect(payload.customer_type).toBe('individual retail');
    expect(payload.occupation_type).toBe('employed');
    expect(payload.source_of_funds).toBe('salary');
    expect(payload.account_purpose).toBe('payroll');
    expect(payload.expected_monthly_volume_php).toBe(80000);
    expect(payload.pep_status).toBe('none');
    expect(payload.sanctions_screening).toBe('clean');
    expect(payload.high_risk_jurisdiction_connection).toBe('none');
    expect(payload.adverse_media).toBe('no');
    expect(payload.years_with_bank).toBe('new');
  });

  it('does NOT invoke onValidatedSubmit when required fields are empty', async () => {
    const user = userEvent.setup();
    const onSubmit = vi.fn<(p: CustomerProfile) => void>();
    render(<CustomInputForm onValidatedSubmit={onSubmit} />);
    await user.click(screen.getByRole('button', { name: 'Run three-pass analysis' }));
    expect(onSubmit).not.toHaveBeenCalled();
  });
});

describe('CustomInputForm — Decision 37g inline error appearance discipline (no eager error spam)', () => {
  it('does NOT render any inline error messages on mount', () => {
    render(<CustomInputForm onValidatedSubmit={() => {}} />);
    // No violation-styled error text should be present before any interaction
    const violationNodes = document.querySelectorAll('.text-violation-primary');
    expect(violationNodes.length).toBe(0);
  });
});
