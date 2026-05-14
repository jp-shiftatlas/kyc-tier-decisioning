// components/decisioning/Pass3RaceBanner.tsx
// Pass 3 race banner per visual_system.md §5.5 lines 366–369 + Decision 36h.
//
// Renders when Pass 3 fires AFTER the analyst has already taken an action
// (Approve / Escalate / Override), as the race-coordination signal that the
// audit findings have been revised and the analyst's action surface has been
// reset. Live mode only — persona playback locks PASS clean per Decision 27,
// so this banner never renders during persona walkthrough.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   visual_system.md §5.5 lines 366–369:
//     - line 367: "Banner renders above the analyst panel in --violation-warn
//                  background, --text-primary text"
//     - line 368 (verbatim message): "Audit findings revised after your
//                  previous action. Action surface reset; please review the
//                  corrected recommendation."
//     - line 369: "If Pass 3 fires while Override modal is open, banner
//                  appears inside the modal; modal does not auto-close"
//   visual_system.md line 84 — RESERVED-USAGE rule:
//     "--violation-warn is reserved for one specific case — the Pass 3 race
//      banner per PRIMARY_PROMPT.md §6.5 (when re-audit completes after the
//      analyst has already taken an action). Distinguished from
//      --violation-primary because it signals 'audit findings revised, action
//      surface reset,' not 'this is a compliance violation.'"
//   This component is the SOLE canonical consumer of the --violation-warn
//   token; cross-component drift surfaces in Pass3CorrectionBanner.test.tsx
//   line ~102 (negative regression guard explicitly proving the correction
//   banner does NOT consume --violation-warn).
//
// Decision 36h — race coordination:
//   Pass3RaceBanner renders in two placement contexts:
//     - Default placement above AnalystControlPanel (line 367)
//     - Inside-Modal placement when the Override modal is open AND Pass 3
//       fires (line 369; modal does NOT auto-close — preserves typed-but-not-
//       submitted analyst reasoning)
//   The component itself does NOT inspect or discriminate context. Placement
//   orchestration lives at AnalystControlPanel (Task 8.5). This component is
//   the EXERCISE point for the render-context-agnostic discipline established
//   at Pass3CorrectionBanner Task 7.6 (which itself never exercised the
//   banner-inside-Modal placement; the discipline establishment was forward-
//   looking specifically for this component).
//
// Decision 41c — loading animation context: when the race banner appears, it
//   does so as a discrete state transition (not a tick or fade). Banner is
//   announcement-only per §5.5 — no animation utility on the banner root.
//
// === RENDER-CONTEXT-AGNOSTIC DISCIPLINE (inherited from Task 7.6) ===
//
// No `displayContext` prop. No `inModal` boolean. No DOM context inspection.
// The component renders identically standalone vs nested in any parent
// context. AnalystControlPanel (Task 8.5) chooses the placement; this
// component does not know which placement it's in. Regression-guarded via
// the innerHTML-equality pattern inherited verbatim from
// Pass3CorrectionBanner.test.tsx lines 132–151.
//
// === TRUST BOUNDARY ===
//
// The `pass3` prop's PRESENCE is the trigger for rendering — the prop's
// CONTENTS are not read by this component. The verbatim message is static
// per §5.5 line 368. (Compare to Pass3CorrectionBanner, which DOES read
// pass3.change_log to render the change-log table.) AnalystControlPanel
// (Task 8.5) is responsible for conditional mounting: when race state is
// active, the panel mounts `<Pass3RaceBanner pass3={pass3} />`; when not,
// the panel does not mount the banner at all. Non-nullable prop signature
// matches Pass3CorrectionBanner sibling-precedent (Finding 14 disposition A).
//
// === COMPOSITION (Finding 13 disposition A — severity chip OMITTED) ===
//
// visual_system.md §5.5 lines 366–369 do not name a severity chip for the
// race banner. The Chip primitive has a closed status set {PASS, FAIL,
// QUALITY} with QUALITY using --status-warning-bg (amber) — wrong color
// family for the --violation-warn (red) race banner per visual_system.md
// line 84. The verbatim message + --violation-warn background carry the
// signal independently. No chip composed.
//
// Spec-silence regression guards (Card/Chip/Button/Tooltip/Modal/Skeleton/
// ChevronDisclosure/Pass3CorrectionBanner pattern, extended for race banner):
//   - no border-radius on banner root
//   - no transition / animate utilities (announcement-only state transition)
//   - no <button> affordance (Decision 36h: modal does not auto-close;
//     banner is announcement-only with no acknowledge or dismiss action)
//   - no SVG (no decorative warning iconography; --violation-warn background
//     and verbatim message carry the signal)

import type { Pass3Output } from '@/lib/schemas/pass3';
import { Card } from '@/components/primitives/Card';

interface Pass3RaceBannerProps {
  // pass3 is the trigger prop — its presence signals AnalystControlPanel
  // mounted the banner in response to a Pass 3 race condition. Contents are
  // not read here; the verbatim message is static per §5.5 line 368.
  pass3: Pass3Output;
}

// eslint-disable-next-line @typescript-eslint/no-unused-vars
export function Pass3RaceBanner({ pass3: _pass3 }: Pass3RaceBannerProps) {
  return (
    <Card variant="elevated" className="bg-violation-warn">
      <p className="font-sans text-sm text-text-primary">
        Audit findings revised after your previous action. Action surface reset; please review the corrected recommendation.
      </p>
    </Card>
  );
}
