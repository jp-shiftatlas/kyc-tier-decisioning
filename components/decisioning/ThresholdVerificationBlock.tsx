// components/decisioning/ThresholdVerificationBlock.tsx
// Numeric threshold verification block per visual_system.md §5.2 lines 247–261
// (Decision 23 — "show the math" moment for numeric reasoning).
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §5.2 lines 247–261 — numeric_threshold_verification block:
//     "Render as a small bordered block inside the audit panel. Mono font for
//      the values, tabular figures for the PHP amounts, the → PASS|FAIL
//      indicator right-aligned. This is the 'show the math' moment — make it
//      legible, not decorative."
//   §5.2 line 261 — "Implementation uses bordered cards with --border-default,
//     proper mono typography, tabular figures, and right-aligned status
//     indicator with the appropriate color token."
//   Decision 23 — numeric reasoning hardened with explicit arithmetic
//     verification. The credibility surface answering "the model isn't
//     hallucinating threshold math."
//   §2 tokens — --border-default, --surface-elevated, --status-success (PASS),
//     --violation-primary (FAIL).
//
// COMPOSITION: composes TabularNumber for digit display (column-aligned PHP
// amounts, threshold values, comparison expressions). No Card wrap — the
// block lives inside AuditPanel's existing Card per §5.2 line 247 "bordered
// sub-block inside the audit panel" framing. This component adds its own
// --border-default border for sub-block separation; outer panel surface is
// AuditPanel's concern.
//
// STATUS DERIVATION: chip-style status text "→ PASS" / "→ FAIL" derives from
// check.status (lowercase 'pass'/'fail'/'quality' per Pass 2 schema). The
// arrow + label combination preserves the spec's literal vocabulary at line
// 255 ("→ PASS"). Status color comes from --status-success / --violation-primary
// per §2 reserved-token rules — primitive trusts caller for context-correct
// status binding.
//
// NULL DEFENSE: profile_value / rule_threshold / comparison_result are
// nullable per Pass2 schema. Falls back to '—' (em-dash) for missing values
// rather than rendering empty cells.

import type { AuditCheck } from '@/lib/schemas/pass2';
import { TabularNumber } from '@/components/primitives/TabularNumber';
import { formatPhp } from '@/lib/ui/format';

interface ThresholdVerificationBlockProps {
  check: AuditCheck;
}

function formatPhpDisplay(v: string | number | null | undefined): string {
  if (v == null) return '—';
  if (typeof v === 'number') return formatPhp(v);
  return v;
}

function formatComparison(v: string | null | undefined): string {
  return v ?? '—';
}

export function ThresholdVerificationBlock({ check }: ThresholdVerificationBlockProps) {
  const isPass = check.status === 'pass';
  const statusLabel = isPass ? '→ PASS' : '→ FAIL';
  const statusColor = isPass ? 'text-status-success' : 'text-violation-primary';

  return (
    <div
      data-testid="threshold-block"
      className="border border-border-default bg-surface-elevated p-4 font-mono text-sm"
    >
      <div className="text-text-secondary">
        {check.rule_id ?? '—'} numeric_threshold_verification
      </div>
      <dl className="mt-3 space-y-1 text-text-primary">
        <div className="flex">
          <dt className="w-44 text-text-tertiary">profile_value:</dt>
          <dd>
            <TabularNumber value={formatPhpDisplay(check.profile_value)} />
          </dd>
        </div>
        <div className="flex">
          <dt className="w-44 text-text-tertiary">rule_threshold:</dt>
          <dd>
            <TabularNumber value={formatPhpDisplay(check.rule_threshold)} />
          </dd>
        </div>
        <div className="flex items-baseline justify-between gap-4">
          <div className="flex">
            <dt className="w-44 text-text-tertiary">comparison_result:</dt>
            <dd>
              <TabularNumber value={formatComparison(check.comparison_result)} />
            </dd>
          </div>
          <span className={statusColor}>{statusLabel}</span>
        </div>
      </dl>
    </div>
  );
}
