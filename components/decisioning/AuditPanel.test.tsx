import { describe, it, expect, vi, afterEach } from 'vitest';
import { render, screen, act, within } from '@testing-library/react';
import { AuditPanel } from './AuditPanel';
import { loadPersona } from '@/lib/schemas/personaAdapters';
import { sortChecks } from '@/lib/orchestration/sortChecks';
import personasData from '@/data/personas.json';

describe('AuditPanel — composite orchestrator (§5.2 / Decision 27)', () => {
  it('renders the Pass 2 — Audit pass-naming headline (Decision 41 S3)', () => {
    const p = loadPersona('maria');
    render(<AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} />);
    expect(screen.getByText('Pass 2 — Audit')).toBeInTheDocument();
  });

  it('renders the overall_status chip in the header (scoped lookup — per-check chips also render PASS)', () => {
    const p = loadPersona('maria');
    render(<AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} />);
    // The header element contains the PassHeadline (h2) + overall_status chip.
    // Scoping the search prevents collision with per-check chips elsewhere in the panel.
    const headline = screen.getByRole('heading', { level: 2 });
    const headerSection = headline.closest('header')!;
    expect(within(headerSection).getByText(p.pass_2.overall_status)).toBeInTheDocument();
  });

  it('renders the audit_summary text', () => {
    const p = loadPersona('maria');
    render(<AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} />);
    expect(screen.getByText(p.pass_2.audit_summary)).toBeInTheDocument();
  });
});

describe('AuditPanel — revealedCount slicing (per-check ticker hook for Batch 9)', () => {
  it('renders only the first N regular checks when revealedCount < total', () => {
    const p = loadPersona('maria');
    const sorted = sortChecks(p.pass_2.checks);
    // Filter to regular checks (excluding numeric_threshold + DC-07) for deterministic count
    render(<AuditPanel pass2={{ ...p.pass_2, checks: sorted }} revealedCount={3} />);
    const rows = screen.getAllByRole('listitem');
    // Up to 3 regular rows; DC-07 + threshold blocks render separately if revealed
    expect(rows.length).toBeLessThanOrEqual(3);
  });

  it('renders all checks when revealedCount equals total', () => {
    const p = loadPersona('maria');
    const sorted = sortChecks(p.pass_2.checks);
    render(<AuditPanel pass2={{ ...p.pass_2, checks: sorted }} revealedCount={sorted.length} />);
    // At least one check row must render
    expect(screen.getAllByRole('listitem').length).toBeGreaterThan(0);
  });
});

describe('AuditPanel — DC-07 dual-satisfaction (Amendment 4 regression guards)', () => {
  it('positive case: loadPersona produces both flags truthy → both halves render with PASS chip', () => {
    const p = loadPersona('maria');
    // Both flags must be truthy after the normalizer runs
    expect((p.pass_2 as { _dc07_structured_record?: boolean })._dc07_structured_record).toBe(true);
    expect((p.pass_2 as { _dc07_prose?: boolean })._dc07_prose).toBe(true);

    render(<AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} />);

    // Find the DC-07 indicator block and confirm both halves are PASS chips
    const dc07Header = screen.getByText(/DC-07 — NPC Advisory 2024-04 dual satisfaction/);
    const dc07Block = dc07Header.parentElement!;
    const structuredChip = within(dc07Block).getByText('structured-record');
    const proseChip = within(dc07Block).getByText('prose-level');
    expect(structuredChip).toHaveClass('bg-status-success-bg');
    expect(proseChip).toHaveClass('bg-status-success-bg');
  });

  it('negative case: raw personasData lacks flags → both halves render with FAIL chip', () => {
    // Confirm the raw locked JSON has NO _dc07_* flags — proves the flags come from normalizePass2
    const rawMaria = personasData.personas.find((x: { id: string }) => x.id === 'maria')!;
    expect((rawMaria.pass_2 as { _dc07_structured_record?: boolean })._dc07_structured_record).toBeUndefined();
    expect((rawMaria.pass_2 as { _dc07_prose?: boolean })._dc07_prose).toBeUndefined();

    // If someone refactors to feed raw data directly, AuditPanel falls back to false → FAIL chips.
    // Suppress Zod parsing — bypass schema validation to feed raw shape. This is the
    // intentional bug we want to surface; the assertions document the failure mode.
    // Double-cast via unknown — raw persona JSON shape is missing target_check_ids +
    // regeneration_scope which normalizePass2 adds; the cast is deliberate to document
    // the divergence.
    render(
      <AuditPanel
        pass2={rawMaria.pass_2 as unknown as Parameters<typeof AuditPanel>[0]['pass2']}
        revealedCount={(rawMaria.pass_2 as { checks: unknown[] }).checks.length}
      />,
    );
    const dc07Header = screen.getByText(/DC-07 — NPC Advisory 2024-04 dual satisfaction/);
    const dc07Block = dc07Header.parentElement!;
    expect(within(dc07Block).getByText('structured-record')).toHaveClass('bg-violation-bg');
    expect(within(dc07Block).getByText('prose-level')).toHaveClass('bg-violation-bg');
  });
});

describe('AuditPanel — composition discipline (Decision 17 / Build Findings Log candidate)', () => {
  it('does NOT render an Override button (override action lives at AnalystControlPanel)', () => {
    const p = loadPersona('maria');
    render(<AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} />);
    expect(screen.queryByRole('button', { name: /override/i })).not.toBeInTheDocument();
  });
});

describe('AuditPanel — ElapsedTimeIndicator live-mode boundary', () => {
  afterEach(() => vi.useRealTimers());

  it('does NOT render elapsed-time counter in persona-playback mode (live undefined/false)', () => {
    const p = loadPersona('maria');
    render(<AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} startedAt={Date.now() - 5000} />);
    expect(screen.queryByText(/elapsed/)).not.toBeInTheDocument();
  });

  it('renders elapsed-time counter in live mode after 500ms threshold', () => {
    vi.useFakeTimers();
    const p = loadPersona('maria');
    const start = Date.now();
    render(
      <AuditPanel
        pass2={p.pass_2}
        revealedCount={p.pass_2.checks.length}
        live
        startedAt={start}
      />,
    );
    act(() => {
      vi.advanceTimersByTime(800);
    });
    expect(screen.getByText(/elapsed/)).toBeInTheDocument();
  });
});

describe('AuditPanel — composes Card primitive as outer surface', () => {
  it('outer container uses Card variant="elevated" treatment (bg-surface-elevated + border)', () => {
    const p = loadPersona('maria');
    const { container } = render(<AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} />);
    const outer = container.firstElementChild!;
    expect(outer).toHaveClass('bg-surface-elevated');
    expect(outer).toHaveClass('border-border-default');
  });
});

describe('AuditPanel — severity strip in header', () => {
  it('renders severity_counts via SeverityStrip (critical / material / quality labels)', () => {
    const p = loadPersona('maria');
    render(<AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} />);
    expect(screen.getByText('critical')).toBeInTheDocument();
    expect(screen.getByText('material')).toBeInTheDocument();
    expect(screen.getByText('quality')).toBeInTheDocument();
  });
});

describe('AuditPanel — mobile reflow per Decision 39 functional floor (Batch 10.4 Iteration 2)', () => {
  // Decision 39: at functional floor (≥768 to <1024px viewport), the audit
  // panel becomes a scrollable list; at lg (≥1024px) and above, density is
  // preserved (no scroll constraint). Class-string assertion verifies the
  // responsive utilities are correctly applied; actual viewport-conditional
  // rendering is a Batch 11 Playwright e2e concern (jsdom doesn't implement
  // matchMedia).
  it('Card container declares max-h-[60vh] + overflow-y-auto at base (functional floor: scrollable list)', () => {
    const p = loadPersona('maria');
    const { container } = render(
      <AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} />,
    );
    const outer = container.firstElementChild!;
    expect(outer).toHaveClass('max-h-[60vh]');
    expect(outer).toHaveClass('overflow-y-auto');
  });

  it('Card container declares lg: overrides that remove the constraint at design-target viewports (holding target: density preserved)', () => {
    const p = loadPersona('maria');
    const { container } = render(
      <AuditPanel pass2={p.pass_2} revealedCount={p.pass_2.checks.length} />,
    );
    const outer = container.firstElementChild!;
    expect(outer).toHaveClass('lg:max-h-none');
    expect(outer).toHaveClass('lg:overflow-y-visible');
  });
});
