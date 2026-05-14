'use client';
// components/decisioning/AuditPanelTicker.tsx
// Per-check reveal animation driver per Decision 41a — Batch 9.2.
//
// AuditPanelTicker is the animation DRIVER; AuditPanel (Batch 7) is the
// DISPLAY. AuditPanel renders `checks.slice(0, revealedCount)`; this component
// owns the `revealedCount` state and the interval loop that increments it.
// Batch 7's AuditPanel was explicitly built to be driven this way — its
// docstring: "revealedCount prop drives the per-check ticking animation...
// controlled by parent state machine in Batch 9."
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   Decision 41a — per-check reveal at 80–120ms cadence. The exact value
//     within that range is a calibration choice; 100ms (the midpoint) is the
//     default, exposed as `cadenceMs` — a designer-tunable to be calibrated
//     against actual demo viewing at Batch 11 visual review.
//   Decision 41c — failure-path skips animation. When `shouldAnimate` is
//     false (which the 9.3/9.4 wiring derives from state-machine
//     state === 'failed', among other non-animating states), NO animation
//     timers are set up — `revealedCount` jumps straight to `checks.length`.
//     Regression-guarded: `vi.getTimerCount() === 0` when shouldAnimate=false.
//   Decision 41 Path X / 41e — render-time canonical check ordering. This
//     component sorts `pass2.checks` via `sortChecks` internally (useMemo).
//     sortChecks is pure + idempotent, so the internal sort is safe even if a
//     caller pre-sorted. Render-time sort, NEVER source-edit sort — the
//     locked persona JSON stays byte-frozen (Decisions 28, 29).
//   Decision 41e Path Y rejection — NO mode-branching. This component does
//     NOT accept a `mode: 'persona' | 'live'` prop and does NOT conditional
//     on data-source type. "Same component, same logic, both modes" is the
//     binding architectural constraint. The per-check reveal animation runs
//     identically in persona playback and live mode; the only asymmetric
//     element is the elapsed-time counter (see the `live` prop note below).
//     Regression-guarded: a `mode` prop is a typecheck error.
//   visual_system.md §5.2 line 239 — the per-check ticker symmetry is scoped
//     to THIS animation. The elapsed-time counter is NOT symmetric — it is
//     live-mode-only (§5.2 line 234).
//   Composes: AuditPanel (Batch 7 — the display), sortChecks (Batch 7 — the
//     canonical sort).
//
// === THE `live` PROP — pass-through, NOT a ticker behavior modifier ===
//
// `live` is passed through to the composed AuditPanel → ElapsedTimeIndicator
// sub-tree, which IS live-mode-scoped per Decision 41b / visual_system.md
// §5.2 line 234. The ticker's per-check reveal animation does NOT branch on
// `live` — see Decision 41a + 41 Path X for the no-mode-branching symmetry
// discipline. A future reader must not infer that the ticker branches on
// `live`: the prop is a pass-through to a live-scoped sub-tree, full stop.
//
// === ANIMATION LIFECYCLE ===
//
//   shouldAnimate=true  → revealedCount ticks 0 → checks.length at cadenceMs.
//                         The interval re-runs (resets to 0, re-animates) when
//                         the sorted-checks array identity changes — i.e. when
//                         new audit data arrives (original audit → re-audit).
//   shouldAnimate=false → revealedCount jumps to checks.length immediately,
//                         NO timers. Covers state==='failed' (Decision 41c)
//                         and any direct-data path that skips animation.
//   no checks           → renders nothing.
//
// The `data-revealed-count` attribute on the wrapper is a test seam — the
// animation state made observable without coupling tests to AuditPanel's
// internal check-row rendering.

import { useEffect, useMemo, useState } from 'react';
import type { Pass2Output } from '@/lib/schemas/pass2';
import { sortChecks } from '@/lib/orchestration/sortChecks';
import { AuditPanel } from './AuditPanel';

// Decision 41a 80–120ms range; 100ms midpoint. Designer-tunable; Batch 11
// visual-calibration item.
const DEFAULT_CADENCE_MS = 100;

interface AuditPanelTickerProps {
  pass2: Pass2Output;
  // Derived by the 9.3/9.4 wiring from state-machine state: true for the
  // audit-bearing in-flight states (pass_2 / re_audit), false otherwise
  // (including state === 'failed' per Decision 41c).
  shouldAnimate: boolean;
  // Per-check reveal cadence. Default 100ms (Decision 41a midpoint).
  cadenceMs?: number;
  // Pass-through to AuditPanel → ElapsedTimeIndicator (live-mode-scoped per
  // Decision 41b). NOT a ticker behavior modifier — see the docstring note.
  live?: boolean;
  // Pass-through to AuditPanel → ElapsedTimeIndicator (only used when live).
  startedAt?: number;
}

export function AuditPanelTicker({
  pass2,
  shouldAnimate,
  cadenceMs = DEFAULT_CADENCE_MS,
  live = false,
  startedAt,
}: AuditPanelTickerProps) {
  // Render-time canonical sort (Decision 41 Path X). sortChecks is pure +
  // idempotent — safe even if a caller pre-sorted.
  const sortedChecks = useMemo(() => sortChecks(pass2.checks), [pass2.checks]);
  const total = sortedChecks.length;

  // Initialize to the correct value to avoid a flash of 0 checks on a
  // shouldAnimate=false first render.
  const [revealedCount, setRevealedCount] = useState<number>(shouldAnimate ? 0 : total);

  useEffect(() => {
    const count = sortedChecks.length;
    if (!shouldAnimate) {
      // No animation: reveal all at once, NO timers (Decision 41c).
      setRevealedCount(count);
      return;
    }
    // Animate: reset to 0, tick up at cadenceMs. The dependency on
    // `sortedChecks` (not just `total`) means a new audit array of the same
    // length still restarts the reveal loop.
    setRevealedCount(0);
    if (count === 0) return;
    let revealed = 0;
    const id = setInterval(() => {
      revealed += 1;
      setRevealedCount(revealed);
      if (revealed >= count) clearInterval(id);
    }, cadenceMs);
    return () => clearInterval(id);
  }, [shouldAnimate, sortedChecks, cadenceMs]);

  // No checks → render nothing.
  if (total === 0) return null;

  return (
    <div data-testid="audit-panel-ticker" data-revealed-count={revealedCount}>
      <AuditPanel
        pass2={{ ...pass2, checks: sortedChecks }}
        revealedCount={revealedCount}
        live={live}
        startedAt={startedAt}
      />
    </div>
  );
}
