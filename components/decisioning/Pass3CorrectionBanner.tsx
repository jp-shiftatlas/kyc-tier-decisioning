'use client';
// components/decisioning/Pass3CorrectionBanner.tsx
// Pass 3 correction banner per Decision 8 / Decision 20.
//
// Fires when Pass 3 auto-corrects Pass 1 output after Pass 2 catches a material
// finding. Live mode only per Decision 27 — persona playback omits the banner
// entirely (locked personas lock PASS clean; Pass 3 doesn't fire on playback).
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   Decision 8 — Visible self-audit. Don't hide the correction. The banner is
//     the institutional commitment to making Pass 3 visible rather than silent.
//   Decision 20 — Change-log treatment for Pass 3 corrections. Banner renders
//     the change-log (field / before / after / reason) per the locked schema
//     contract (ChangeLogEntrySchema in lib/schemas/pass3.ts).
//   Decision 27 — Live-input-only firing. Persona playback omits.
//   PRIMARY_PROMPT.md line 335 — "Pass 3 correction actions when Pass 3 fires
//     (live input only) — explicit before/after change-log expandable"
//   §2 token usage — --accent-primary applied as a left-edge accent stripe via
//     border-l-4 border-l-accent-primary. Card primitive's default
//     border-border-default applies on the remaining three sides.
//
// DISTINGUISHED FROM Pass3RaceBanner (deferred to Batch 8):
// This component is the correction banner — Pass 3 produces a correction BEFORE
// analyst acts. Distinct from the race banner (§5.5 lines 366–369), which fires
// when Pass 3 produces a correction AFTER analyst has already acted. The race
// banner uses --violation-warn (reserved per visual_system.md line 84); this
// correction banner uses Card variant="elevated" + accent-primary left edge.
// Using --violation-warn here would dissolve the spec's banner-type
// distinction — regression-guarded at the test layer.
//
// COMPOSITION (three primitives + ChevronDisclosure is second composition-
// layer consumer):
//   Card — elevated panel surface with accent-primary left-edge stripe for
//     institutional emphasis without claiming violation severity.
//   Chip — variant="accent" for "CORRECTION APPLIED" label. Non-status variant
//     because no status mapping fits: PASS/FAIL/QUALITY are §2 reserved tokens
//     for Pass 2 audit checks, not Pass 3 correction events. accent variant
//     signals "system event" with the spec-aligned --accent-subtle-bg /
//     --accent-deep color family.
//   ChevronDisclosure — single instance controlling change-log expansion.
//     Second composition-layer consumer (ExaminerNotes was first at Task 7.4).
//     Same single-disclosure pattern: one trigger, one expanded section, NOT
//     per-change-log-entry disclosure.
//
// NO BUTTON: Change-log expansion via ChevronDisclosure is the primary
// affordance. A separate "Acknowledge" Button would be redundant — the banner
// doesn't dismiss; it stays until the underlying state changes (parent state
// machine in Batch 9 owns banner lifecycle).
//
// Ledger D4: banner has no dismiss handler by design — lifecycle is
// parent-owned, and race-signal flags clear at the state machine's `RESET`
// (see `lib/orchestration/stateMachine.ts`), not on banner unmount.
// Intentional, not a side effect.
//
// === TRUST BOUNDARY (generalized for future Pass3RaceBanner inheritance) ===
//
// Banner renders identically regardless of DOM placement context. No
// `displayContext` or `inModal` prop. No DOM context inspection. Parent owns
// the orchestration of where the banner appears.
//
// This trust boundary is forward-looking for the race banner: when
// Pass3RaceBanner lands in Batch 8 alongside AnalystControlPanel, the
// orchestration layer will choose where each banner renders (banner-above-
// panel for default case; banner-inside-Modal for race-during-override case
// per §5.5 line 369 — race banner specifically). Neither banner inspects its
// context. The correction banner doesn't itself exercise the banner-inside-
// Modal case (it always renders above AnalystControlPanel), but the
// discipline establishment is the load-bearing contract for the race banner.
//
// Regression-guarded at the test layer: render banner standalone vs nested in
// a mock parent context; assert identical DOM output.
//
// Spec-silence regression guards (Card/Chip/Button/Tooltip/Modal/
// ArchitectureStrip pattern, extended for banners):
//   - no --violation-warn background (race-banner token discipline boundary)
//   - no animate-* / transition-* on banner root (ChevronDisclosure's
//     functional state-toggle is permitted as composition-internal motion;
//     banner-level animation is theater)
//   - no SVG within banner content area (no decorative warning iconography;
//     headline + accent stripe + Chip carry the signal)
//   - no Modal opened by ChevronDisclosure (change-log expansion is inline,
//     not modal-spawned)
//   - no auto-dismiss (timer-driven banner removal; banner lifecycle owned
//     by parent state machine)
//   - no rounded utility on banner root or change-log entries (institutional
//     register, Card primitive's spec-silence discipline propagated)

import { useState } from 'react';
import type { Pass3Output } from '@/lib/schemas/pass3';
import { Card } from '@/components/primitives/Card';
import { Chip } from '@/components/primitives/Chip';
import { ChevronDisclosure } from '@/components/primitives/ChevronDisclosure';

interface Pass3CorrectionBannerProps {
  pass3: Pass3Output;
}

export function Pass3CorrectionBanner({ pass3 }: Pass3CorrectionBannerProps) {
  const [open, setOpen] = useState(false);
  return (
    <Card variant="elevated" className="border-l-4 border-l-accent-primary">
      <div className="flex flex-wrap items-baseline gap-3">
        <h3 className="font-sans text-lg font-semibold text-text-primary">
          Pass 3 — Targeted correction applied
        </h3>
        <Chip variant="accent">CORRECTION APPLIED</Chip>
      </div>
      <p className="mt-2 font-sans text-sm text-text-secondary">
        Audit findings revised by the correction pass. Review before action.
      </p>
      <div className="mt-4">
        <ChevronDisclosure
          label={open ? 'Hide change log' : 'Show change log'}
          open={open}
          onToggle={setOpen}
        />
        {open && (
          <ul className="mt-4 space-y-3 font-sans text-sm">
            {pass3.change_log.map((entry, i) => (
              <li
                key={i}
                className="border border-border-default bg-surface-recessed p-3"
              >
                <div className="font-mono text-text-tertiary">{entry.field}</div>
                <div className="mt-1">
                  <span className="text-text-tertiary">before: </span>
                  <span className="text-text-primary">{String(entry.before)}</span>
                </div>
                <div>
                  <span className="text-text-tertiary">after: </span>
                  <span className="text-text-primary">{String(entry.after)}</span>
                </div>
                <div className="mt-1 text-text-secondary">{entry.reason}</div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </Card>
  );
}
