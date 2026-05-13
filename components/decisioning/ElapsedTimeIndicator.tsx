'use client';
// components/decisioning/ElapsedTimeIndicator.tsx
// Elapsed-time counter per Decision 41 S1 + visual_system.md §5.2 line 234.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   visual_system.md §5.2 line 234 — "3.4s elapsed [live mode only]"
//   visual_system.md §5.2 line 237 — "Elapsed-time counter in --text-tertiary
//     --text-sm with tabular figures, appearing after 500ms threshold per
//     Decision 41 S1."
//   Decision 41 S1 — 500ms threshold + 200ms cadence. Fast warm-cache
//     responses transition directly to ticking without flashing a "0.1s
//     elapsed" indicator.
//   §5.2 line 239 — "Same pacing in persona playback and live mode per
//     Decision 41a" — applies to the per-check ticking animation, NOT to the
//     elapsed-time counter. The counter is live-mode-only per §5.2 line 234.
//
// MODE BOUNDARY (live-only): renders nothing when live=false. Persona playback
// uses the per-check ticking animation as the "in progress" signal; the
// elapsed counter is redundant for deterministic playback and would
// communicate "we're waiting on something" when actually we're just animating.
//
// COMPOSITION: composes TabularNumber for digit-stable display via
// formatElapsed (lib/ui/format.ts).

import { useEffect, useState } from 'react';
import { formatElapsed } from '@/lib/ui/format';
import { TabularNumber } from '@/components/primitives/TabularNumber';

interface ElapsedTimeIndicatorProps {
  startedAt: number;
  live: boolean;
}

const THRESHOLD_MS = 500;
const CADENCE_MS = 200;

export function ElapsedTimeIndicator({ startedAt, live }: ElapsedTimeIndicatorProps) {
  const [now, setNow] = useState<number>(startedAt);

  useEffect(() => {
    if (!live) return;
    const id = setInterval(() => setNow(Date.now()), CADENCE_MS);
    return () => clearInterval(id);
  }, [live]);

  if (!live) return null;
  const elapsed = now - startedAt;
  if (elapsed < THRESHOLD_MS) return null;

  return (
    <div className="mt-1 text-sm text-text-tertiary">
      <TabularNumber value={formatElapsed(elapsed)} />
    </div>
  );
}
