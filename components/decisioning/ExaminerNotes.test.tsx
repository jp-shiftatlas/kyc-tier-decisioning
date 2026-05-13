import { describe, it, expect } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import { ExaminerNotes } from './ExaminerNotes';
import { loadPersona } from '@/lib/schemas/personaAdapters';

describe('ExaminerNotes — header + persona context (§5.3)', () => {
  it('renders "Examiner Notes" header (h2)', () => {
    const p = loadPersona('maria');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    expect(screen.getByRole('heading', { level: 2, name: 'Examiner Notes' })).toBeInTheDocument();
  });

  it('renders persona name and customer reference below the header (scoped to header line)', () => {
    const p = loadPersona('maria');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    // Exact header-line string match. The persona name may also appear inside
    // the summary_finding prose ("Maria's profile..."), so a bare regex on name
    // alone finds multiple matches. Combined dot-separator string disambiguates.
    const headerLine = `${p.name} · ${p.profile.customer_reference}`;
    expect(screen.getByText(headerLine)).toBeInTheDocument();
  });
});

describe('ExaminerNotes — Decision 11 two-layer disclosure (collapsed by default)', () => {
  it('renders summary_finding in collapsed view', () => {
    const p = loadPersona('maria');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    expect(screen.getByText(p.pass_1.summary_finding)).toBeInTheDocument();
  });

  it('collapsed view does NOT leak six-section content (disclosure-state regression guard)', () => {
    const p = loadPersona('carlos');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    // Section labels must NOT appear before expand
    expect(screen.queryByText('Decision Summary')).not.toBeInTheDocument();
    expect(screen.queryByText('Profile Analysis')).not.toBeInTheDocument();
    expect(screen.queryByText('Rule Application and Risk Pattern')).not.toBeInTheDocument();
    expect(screen.queryByText('Considered Alternatives')).not.toBeInTheDocument();
    expect(screen.queryByText('Recommended EDD Procedures')).not.toBeInTheDocument();
    expect(screen.queryByText('Audit Trail')).not.toBeInTheDocument();
  });

  it('renders ChevronDisclosure trigger with "Read full memo" label in collapsed state', () => {
    const p = loadPersona('maria');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    expect(screen.getByRole('button', { name: /read full memo/i })).toBeInTheDocument();
  });
});

describe('ExaminerNotes — field-mapping regression guard (Decision 11 ↔ Pass1OutputSchema)', () => {
  it('collapsed view shows pass1.summary_finding (top-level 2-sentence string)', () => {
    const p = loadPersona('maria');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    expect(screen.getByText(p.pass_1.summary_finding)).toBeInTheDocument();
  });

  it('collapsed view does NOT show pass1.examiner_notes_full.decision_summary (the paragraph inside the six-section object)', () => {
    const p = loadPersona('maria');
    const decisionSummaryParagraph = p.pass_1.examiner_notes_full.decision_summary;
    // Distinct strings — guard against field-mapping confusion
    expect(p.pass_1.summary_finding).not.toBe(decisionSummaryParagraph);
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    expect(screen.queryByText(decisionSummaryParagraph)).not.toBeInTheDocument();
  });
});

describe('ExaminerNotes — Amendment 13 six-section expanded render', () => {
  it('expands to render all six sections for an EDD-tier persona (Carlos)', () => {
    const p = loadPersona('carlos');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    fireEvent.click(screen.getByRole('button', { name: /read full memo/i }));
    expect(screen.getByText('Decision Summary')).toBeInTheDocument();
    expect(screen.getByText('Profile Analysis')).toBeInTheDocument();
    expect(screen.getByText('Rule Application and Risk Pattern')).toBeInTheDocument();
    expect(screen.getByText('Considered Alternatives')).toBeInTheDocument();
    expect(screen.getByText('Recommended EDD Procedures')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
  });

  it('omits Recommended EDD Procedures for Standard-tier personas (Maria — null in schema)', () => {
    const p = loadPersona('maria');
    // Confirm Maria's recommended_edd_procedures is null in the schema
    expect(p.pass_1.examiner_notes_full.recommended_edd_procedures).toBeNull();

    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    fireEvent.click(screen.getByRole('button', { name: /read full memo/i }));

    // The other five sections still render
    expect(screen.getByText('Decision Summary')).toBeInTheDocument();
    expect(screen.getByText('Profile Analysis')).toBeInTheDocument();
    expect(screen.getByText('Rule Application and Risk Pattern')).toBeInTheDocument();
    expect(screen.getByText('Considered Alternatives')).toBeInTheDocument();
    expect(screen.getByText('Audit Trail')).toBeInTheDocument();
    // Recommended EDD Procedures is omitted for Maria
    expect(screen.queryByText('Recommended EDD Procedures')).not.toBeInTheDocument();
  });

  it('toggle button label flips to "Hide full memo" when expanded', () => {
    const p = loadPersona('maria');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    fireEvent.click(screen.getByRole('button', { name: /read full memo/i }));
    expect(screen.getByRole('button', { name: /hide full memo/i })).toBeInTheDocument();
  });

  it('expanded state can be collapsed back via the same trigger', () => {
    const p = loadPersona('maria');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    const trigger = screen.getByRole('button', { name: /read full memo/i });
    fireEvent.click(trigger);
    expect(screen.getByText('Decision Summary')).toBeInTheDocument();
    fireEvent.click(screen.getByRole('button', { name: /hide full memo/i }));
    expect(screen.queryByText('Decision Summary')).not.toBeInTheDocument();
  });
});

describe('ExaminerNotes — Decision 17 / anti-spec composition discipline', () => {
  it('does NOT render a Chip (no status to surface — Decision 17 separation)', () => {
    const p = loadPersona('maria');
    const { container } = render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    // No bg-status-success-bg, bg-violation-bg, bg-status-warning-bg, bg-accent-subtle-bg anywhere
    expect(container.querySelector('.bg-status-success-bg')).toBeNull();
    expect(container.querySelector('.bg-violation-bg')).toBeNull();
    expect(container.querySelector('.bg-status-warning-bg')).toBeNull();
  });

  it('does NOT render Tooltip wrappers — rule IDs are inline mono per §5.3, not hover-defined', () => {
    const p = loadPersona('maria');
    const { container } = render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    // role="tooltip" is the Tooltip primitive's contract — must be absent
    expect(container.querySelector('[role="tooltip"]')).toBeNull();
  });

  it('does NOT render Override or other action buttons (read-only display surface)', () => {
    const p = loadPersona('maria');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    expect(screen.queryByRole('button', { name: /override/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /approve/i })).not.toBeInTheDocument();
    expect(screen.queryByRole('button', { name: /escalate/i })).not.toBeInTheDocument();
    // The only button is the disclosure trigger
    const buttons = screen.getAllByRole('button');
    expect(buttons).toHaveLength(1);
    expect(buttons[0]).toHaveAccessibleName(/read full memo|hide full memo/i);
  });
});

describe('ExaminerNotes — Decision 37 Source Serif 4 editorial register', () => {
  it('summary_finding renders in --font-serif (Source Serif 4)', () => {
    const p = loadPersona('maria');
    render(<ExaminerNotes pass1={p.pass_1} personaName={p.name} customerReference={p.profile.customer_reference} />);
    const summary = screen.getByText(p.pass_1.summary_finding);
    expect(summary).toHaveClass('font-serif');
    expect(summary).toHaveClass('text-md');
    expect(summary).toHaveClass('leading-loose');
  });
});
