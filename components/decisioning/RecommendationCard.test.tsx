import { describe, it, expect, afterEach } from 'vitest';
import { render, screen, fireEvent, cleanup } from '@testing-library/react';
import { RecommendationCard } from './RecommendationCard';
import { loadPersona } from '@/lib/schemas/personaAdapters';
import type { Pass1Output } from '@/lib/schemas/pass1';

afterEach(() => {
  cleanup();
});

describe('RecommendationCard — TierBadge composition (§5.1 line 221 + Batch 6 composition-fitness rule)', () => {
  // The composition-fitness rule from docs/batch-6-primitive-bindings.md line 42:
  // "TierBadge is a separate Batch 7 primitive — NOT a chip variant. It shares
  // the --accent-subtle-bg + --accent-deep color family with variant='accent'
  // chips but differs in size, font (mono), and content (tier label)."
  // RecommendationCard MUST compose TierBadge — not Chip variant="accent" —
  // for the tier display.
  it('renders the tier via TierBadge (mono font + slate accent), not via Chip variant="accent"', () => {
    const p = loadPersona('carlos');
    render(<RecommendationCard pass1={p.pass_1} />);
    const tierBadge = screen.getByText('EDD');
    // TierBadge applies font-mono + bg-accent-subtle-bg + text-accent-deep + text-lg
    expect(tierBadge).toHaveClass('font-mono');
    expect(tierBadge).toHaveClass('bg-accent-subtle-bg');
    expect(tierBadge).toHaveClass('text-accent-deep');
    expect(tierBadge).toHaveClass('text-lg');
  });

  it('renders Maria tier as "Standard" via TierBadge', () => {
    const p = loadPersona('maria');
    render(<RecommendationCard pass1={p.pass_1} />);
    expect(screen.getByText('Standard')).toHaveClass('font-mono');
  });

  it('renders Persona C tier as "EDD" via TierBadge', () => {
    const p = loadPersona('persona_c');
    render(<RecommendationCard pass1={p.pass_1} />);
    expect(screen.getByText('EDD')).toHaveClass('font-mono');
  });

  it('renders Persona D tier as "Standard" via TierBadge', () => {
    const p = loadPersona('persona_d');
    render(<RecommendationCard pass1={p.pass_1} />);
    expect(screen.getByText('Standard')).toHaveClass('font-mono');
  });
});

describe('RecommendationCard — risk score + category breakdown (§5.1 line 222)', () => {
  it('renders the risk_score.total for each persona', () => {
    const carlos = loadPersona('carlos');
    render(<RecommendationCard pass1={carlos.pass_1} />);
    expect(screen.getByText(String(carlos.pass_1.risk_score.total))).toBeInTheDocument();
  });

  it('renders category breakdown labels for all three categories', () => {
    const p = loadPersona('carlos');
    render(<RecommendationCard pass1={p.pass_1} />);
    expect(screen.getByText('tier_eligibility')).toBeInTheDocument();
    expect(screen.getByText('escalation_triggers')).toBeInTheDocument();
    expect(screen.getByText('documentation_process')).toBeInTheDocument();
  });
});

describe('RecommendationCard — Finding 12 transparency: all three category chips render including zero values', () => {
  // §5.1 line 222 is silent on conditional rendering of zero-value categories.
  // Per institutional-register transparency discipline, all three chips
  // render uniformly including zeros — examiner reads each category's
  // contribution including absence of contribution.
  it("renders all three category chips for Maria even though every value is 0", () => {
    const maria = loadPersona('maria');
    // Confirm fixture: Maria's category_breakdown is all zeros
    expect(maria.pass_1.risk_score.category_breakdown.tier_eligibility).toBe(0);
    expect(maria.pass_1.risk_score.category_breakdown.escalation_triggers).toBe(0);
    expect(maria.pass_1.risk_score.category_breakdown.documentation_process).toBe(0);
    render(<RecommendationCard pass1={maria.pass_1} />);
    // All three category labels still present
    expect(screen.getByText('tier_eligibility')).toBeInTheDocument();
    expect(screen.getByText('escalation_triggers')).toBeInTheDocument();
    expect(screen.getByText('documentation_process')).toBeInTheDocument();
    // And the count "0" appears three times (one per chip)
    const zeros = screen.getAllByText('0');
    expect(zeros.length).toBeGreaterThanOrEqual(3);
  });
});

describe('RecommendationCard — schema-reading discipline for hold_reason (Decision 27 + Persona C ES-08)', () => {
  // Positive case: Persona C carries onboarding_hold:false AND a populated
  // hold_reason (ES-08 partial-hold for tier finalization). hold_reason
  // rendering is keyed off `decision.hold_reason !== null`, NOT off
  // `decision.onboarding_hold === true`.
  it('renders Persona C hold_reason text (onboarding_hold:false + populated hold_reason)', () => {
    const c = loadPersona('persona_c');
    expect(c.pass_1.decision.onboarding_hold).toBe(false);
    expect(c.pass_1.decision.hold_reason).not.toBeNull();
    render(<RecommendationCard pass1={c.pass_1} />);
    expect(screen.getByTestId('hold-reason')).toBeInTheDocument();
    expect(screen.getByTestId('hold-reason').textContent).toContain('ES-08');
  });

  // Negative case: Maria carries onboarding_hold:false AND hold_reason:null.
  // No hold-reason block renders.
  it('does NOT render hold_reason for Maria (onboarding_hold:false + hold_reason:null)', () => {
    const maria = loadPersona('maria');
    expect(maria.pass_1.decision.onboarding_hold).toBe(false);
    expect(maria.pass_1.decision.hold_reason).toBeNull();
    render(<RecommendationCard pass1={maria.pass_1} />);
    expect(screen.queryByTestId('hold-reason')).not.toBeInTheDocument();
  });

  // Independence regression guard #1: synthetic fixture with
  // onboarding_hold:true + hold_reason:null → no hold-reason render.
  // (Boolean is true but content is null — render keyed off content, not boolean.)
  it('does NOT render hold_reason when onboarding_hold:true but hold_reason:null (schema-reading discipline)', () => {
    const maria = loadPersona('maria');
    const synthetic: Pass1Output = {
      ...maria.pass_1,
      decision: { ...maria.pass_1.decision, onboarding_hold: true, hold_reason: null },
    };
    render(<RecommendationCard pass1={synthetic} />);
    expect(screen.queryByTestId('hold-reason')).not.toBeInTheDocument();
  });

  // Independence regression guard #2: synthetic fixture with
  // onboarding_hold:false + hold_reason populated → DOES render.
  // (Boolean is false but content is non-null — render keyed off content,
  // mirrors Persona C's canonical partial-hold case but on a different persona.)
  it('renders hold_reason when onboarding_hold:false + hold_reason populated (schema-reading discipline)', () => {
    const maria = loadPersona('maria');
    const synthetic: Pass1Output = {
      ...maria.pass_1,
      decision: { ...maria.pass_1.decision, onboarding_hold: false, hold_reason: 'synthetic hold reason text' },
    };
    render(<RecommendationCard pass1={synthetic} />);
    expect(screen.getByTestId('hold-reason')).toBeInTheDocument();
    expect(screen.getByTestId('hold-reason').textContent).toContain('synthetic hold reason text');
  });
});

describe('RecommendationCard — "Why this tier" expandable (Decision 11 progressive disclosure)', () => {
  it('renders ChevronDisclosure trigger with "Why this tier" label', () => {
    const p = loadPersona('maria');
    render(<RecommendationCard pass1={p.pass_1} />);
    expect(screen.getByRole('button', { name: /why this tier/i })).toBeInTheDocument();
  });

  it('collapsed by default — rule_id mono labels NOT in DOM', () => {
    const p = loadPersona('carlos');
    render(<RecommendationCard pass1={p.pass_1} />);
    // Carlos's rules_fired includes ES-03 (PEP) and TE-05 (volume).
    // In the collapsed state these rule_id strings should not appear.
    expect(screen.queryByText('ES-03')).not.toBeInTheDocument();
    expect(screen.queryByText('TE-05')).not.toBeInTheDocument();
  });

  it('expands on click — renders rule_id + rule_name + tier_impact (Finding 11 disposition A)', () => {
    const p = loadPersona('carlos');
    render(<RecommendationCard pass1={p.pass_1} />);
    fireEvent.click(screen.getByRole('button', { name: /why this tier/i }));
    // rule_id
    expect(screen.getByText('ES-03')).toBeInTheDocument();
    expect(screen.getByText('TE-05')).toBeInTheDocument();
    // rule_name (looseObject passthrough)
    expect(screen.getByText(/PEP — close associate/)).toBeInTheDocument();
    expect(screen.getByText(/New relationship \+ high volume/)).toBeInTheDocument();
    // tier_impact prose
    expect(screen.getByText(/Mandatory EDD with senior management approval/)).toBeInTheDocument();
  });
});

describe('RecommendationCard — Suggested EDD procedures (Finding 10 corrected structured shape)', () => {
  // §5.1 line 224 + Finding 10 disposition: top-level recommended_edd_procedures
  // is Array<{procedure_id, description, regulatory_basis}> per canonical
  // 05_PASS_1_DESIGN.md §2 contract. Empty array → section omitted.
  it('does NOT render the EDD procedures section for Maria (empty array, Standard tier)', () => {
    const maria = loadPersona('maria');
    render(<RecommendationCard pass1={maria.pass_1} />);
    expect(screen.queryByText('Suggested EDD procedures')).not.toBeInTheDocument();
  });

  it('renders the EDD procedures section for Carlos with structured numbered entries', () => {
    const carlos = loadPersona('carlos');
    render(<RecommendationCard pass1={carlos.pass_1} />);
    expect(screen.getByText('Suggested EDD procedures')).toBeInTheDocument();
    // Procedure numbering (procedure_id markers)
    expect(screen.getByText('(1)')).toBeInTheDocument();
    expect(screen.getByText('(2)')).toBeInTheDocument();
    // First procedure's regulatory_basis citation
    expect(screen.getByText(/MORB §921\(a\); DC-06/)).toBeInTheDocument();
  });

  it('renders the EDD procedures section for Persona C', () => {
    const c = loadPersona('persona_c');
    render(<RecommendationCard pass1={c.pass_1} />);
    expect(screen.getByText('Suggested EDD procedures')).toBeInTheDocument();
    expect(screen.getByText('(1)')).toBeInTheDocument();
  });
});

describe('RecommendationCard — render-context-agnostic discipline (Decision 36c; inherited from Pass3CorrectionBanner)', () => {
  // The Override modal at Decision 36c re-renders RecommendationCard inside
  // a Modal with full visual fidelity. Render-context-agnostic discipline
  // (inherited verbatim from Pass3CorrectionBanner Task 7.6) requires that
  // the component's render output be identical standalone vs nested in any
  // parent context — no displayContext prop, no DOM inspection.
  it('renders identically standalone vs nested in a mock Modal wrapper', () => {
    const carlos = loadPersona('carlos');
    // Standalone render
    const { container: standaloneContainer } = render(<RecommendationCard pass1={carlos.pass_1} />);
    const standaloneHTML = standaloneContainer.innerHTML;
    cleanup();

    // Nested render (mimics Decision 36c Override-modal "before" placement)
    const { container: nestedContainer } = render(
      <div data-testid="mock-modal">
        <RecommendationCard pass1={carlos.pass_1} />
      </div>,
    );
    const nestedHTML = nestedContainer.querySelector('[data-testid="mock-modal"]')!.innerHTML;

    expect(nestedHTML).toBe(standaloneHTML);
  });
});

describe('RecommendationCard — outer surface (§5.1 implicit hero treatment)', () => {
  it('wraps content in Card variant="elevated" (bg-surface-elevated)', () => {
    const p = loadPersona('maria');
    const { container } = render(<RecommendationCard pass1={p.pass_1} />);
    const card = container.firstElementChild as HTMLElement;
    expect(card).toHaveClass('bg-surface-elevated');
    expect(card).toHaveClass('border');
    expect(card).toHaveClass('border-border-default');
  });
});
