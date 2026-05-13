// components/decisioning/AuditPanel.tsx
// AuditPanel composite — the Pass 2 hero UI per Decision 27 / Differentiator #2.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   visual_system.md §5.2 lines 226–279 — Compliance audit panel: the hero UI
//     moment. Pass-naming headline (Decision 41 S3), per-check rendering
//     (lines 241–245), numeric threshold verification block (Decision 23,
//     lines 247–261), DC-07 dual-satisfaction indicator (Decision 25
//     corollary, lines 263–271), severity strip (line 273).
//   PRIMARY_PROMPT.md §4.11 — render-time canonical check ordering per
//     Decision 41 Path X. AuditPanel renders pre-sorted check slices; caller
//     applies sortChecks() once before passing.
//   Decision 27 — DC-07 dual-satisfaction is the hero. "Audit you can trust."
//   Decision 41a — same per-check ticking pacing in persona playback + live
//     mode. Animation behavior is symmetric; the elapsed-time counter is the
//     one asymmetric element (live-mode-only per §5.2 line 234).
//   Amendment 4 — _dc07_structured_record + _dc07_prose flags consumed from
//     normalized pass2 (NOT regex over evidence_note prose). Regression-
//     guarded by the composite test below.
//   Decision 17 — analyst as decision authority. AuditPanel is read-only:
//     displays findings, does not surface override actions. The override
//     action lives at AnalystControlPanel (§5.5) per the AuditPanel–
//     AnalystControlPanel concern separation. See Build Findings Log
//     candidate at Task 7.1 close-out.
//
// COMPOSITION (three Batch 6 primitives + four Batch 7 sub-components):
//   Primitives:    Card (panel surface), Chip (overall_status + per-check
//                  status via AuditCheckRow), TabularNumber (severity counts
//                  + threshold values + elapsed time, transitively)
//   Sub-components: PassHeadline, ElapsedTimeIndicator, SeverityStrip,
//                  AuditCheckRow, ThresholdVerificationBlock, DC07Indicator
//
// REVEAL SLICING: revealedCount prop drives the per-check ticking animation
// (80–120ms per check per §5.2 line 239, controlled by parent state machine
// in Batch 9). AuditPanel renders only `checks.slice(0, revealedCount)`;
// caller increments revealedCount over time.
//
// LIVE-MODE BOUNDARY: live + startedAt props are optional. When live=true and
// startedAt is provided, ElapsedTimeIndicator renders below the headline.
// Persona playback omits both (live defaults to false).
//
// OVERALL STATUS CHIP: §5.2 doesn't explicitly name an overall_status chip
// in the panel header, but the field exists in Pass 2 output and surfacing
// it at a glance helps the compliance officer reading the panel. Included
// alongside the headline. If JP wants this dropped, the deviation is small
// and reversible.

import type { Pass2Output, AuditCheck } from '@/lib/schemas/pass2';
import { Card } from '@/components/primitives/Card';
import { Chip } from '@/components/primitives/Chip';
import { PassHeadline } from './PassHeadline';
import { ElapsedTimeIndicator } from './ElapsedTimeIndicator';
import { SeverityStrip } from './SeverityStrip';
import { AuditCheckRow } from './AuditCheckRow';
import { ThresholdVerificationBlock } from './ThresholdVerificationBlock';
import { DC07Indicator } from './DC07Indicator';

interface AuditPanelProps {
  pass2: Pass2Output;
  /** Number of checks revealed so far — drives the ticker animation in Batch 9. */
  revealedCount: number;
  /** Live mode flag; defaults to false (persona playback). */
  live?: boolean;
  /** Start timestamp for ElapsedTimeIndicator; only used when live=true. */
  startedAt?: number;
}

function isNumericThreshold(c: AuditCheck): boolean {
  return c.check_type === 'numeric_threshold_verification';
}

function isDc07(c: AuditCheck): boolean {
  return (
    c.rule_id === 'DC-07' ||
    c.check_type === 'dc07_documentation' ||
    (typeof c.rule_id === 'string' && c.rule_id.includes('DC-07'))
  );
}

function overallStatusToChip(s: Pass2Output['overall_status']): 'PASS' | 'FAIL' | 'QUALITY' {
  if (s === 'FAIL') return 'FAIL';
  if (s === 'PASS_WITH_QUALITY_FLAGS') return 'QUALITY';
  return 'PASS';
}

export function AuditPanel({ pass2, revealedCount, live = false, startedAt }: AuditPanelProps) {
  const visible = pass2.checks.slice(0, revealedCount);
  const counts = pass2.severity_counts ?? { critical: 0, material: 0, quality: 0 };

  // Amendment 4: read computed DC-07 dual-satisfaction flags from normalized data.
  // The locked persona JSON does not carry these; normalizePass2 writes them.
  // If a future refactor feeds raw personasData here, both halves silently fall
  // back to false. The composite test below carries the regression guard.
  const structuredRecord = (pass2 as { _dc07_structured_record?: boolean })._dc07_structured_record === true;
  const prose = (pass2 as { _dc07_prose?: boolean })._dc07_prose === true;

  const regularChecks = visible.filter((c) => !isNumericThreshold(c) && !isDc07(c));
  const thresholdChecks = visible.filter(isNumericThreshold);
  const hasDc07 = visible.some(isDc07);

  return (
    <Card variant="elevated" className="space-y-6">
      <header className="space-y-1">
        <div className="flex flex-wrap items-baseline justify-between gap-4">
          <div className="flex items-baseline gap-3">
            <PassHeadline pass={2} variant="audit" />
            <Chip status={overallStatusToChip(pass2.overall_status)}>
              {pass2.overall_status}
            </Chip>
          </div>
          <SeverityStrip counts={counts} />
        </div>
        {live && startedAt != null && (
          <ElapsedTimeIndicator startedAt={startedAt} live={live} />
        )}
      </header>

      <p className="font-sans text-sm text-text-secondary">{pass2.audit_summary}</p>

      <ul className="divide-y divide-border-subtle">
        {regularChecks.map((c, i) => (
          <AuditCheckRow key={`${c.rule_id ?? 'unknown'}-${i}`} check={c} />
        ))}
      </ul>

      {thresholdChecks.map((c, i) => (
        <ThresholdVerificationBlock key={`ntv-${c.rule_id ?? 'unknown'}-${i}`} check={c} />
      ))}

      {hasDc07 && (
        <DC07Indicator structuredRecord={structuredRecord} prose={prose} />
      )}
    </Card>
  );
}
