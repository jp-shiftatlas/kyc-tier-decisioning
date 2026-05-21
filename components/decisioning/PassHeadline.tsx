// components/decisioning/PassHeadline.tsx
// Pass-naming headline per Decision 41 S3 — persistent architectural section
// label.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   visual_system.md §5.2 lines 230–237 — "Pass-naming headline (Decision 41
//     S3) — persistent section label". Headline in --text-lg semibold
//     --font-sans. "Headline persists throughout the pass as section label —
//     not a transient status message."
//   Decision 41 S3 — pass-naming pattern: names what the pass IS ("Pass 2 —
//     Audit"), not what it's doing ("Auditing..."). The institutional read of
//     "section label, not status message" is load-bearing per §6 line 476.
//
// VARIANT SET: four spec-named variants matching the §6.2 / Decision 41 pass
// pattern: recommendation (Pass 1), audit (Pass 2), correction (Pass 3),
// reaudit (Pass 2 re-audit after Pass 3 correction).

interface PassHeadlineProps {
  pass: 1 | 2 | 3;
  variant: 'recommendation' | 'audit' | 'correction' | 'reaudit';
}

// Labels per JP Batch 12 Screen 3 feedback (overrides prior Decision 41 S3
// canonical names). The reaudit variant uses a distinct label from audit so
// "Pass 2" doesn't appear with the same suffix twice when Pass 3 fires.
const LABELS: Record<PassHeadlineProps['variant'], string> = {
  recommendation: 'Recommendation',
  audit: 'Re-check Pass 1',
  correction: 'Correction',
  reaudit: 'Re-check Pass 1 (after correction)',
};

export function PassHeadline({ pass, variant }: PassHeadlineProps) {
  return (
    <h2 className="font-sans text-lg font-semibold text-text-primary">
      {`Pass ${pass} — ${LABELS[variant]}`}
    </h2>
  );
}
