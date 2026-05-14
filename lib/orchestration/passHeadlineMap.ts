// lib/orchestration/passHeadlineMap.ts
// State-value → pass-naming-headline-props mapping per Decision 41 S3 / 41d.
//
// Lives in lib/orchestration/ (not folded into PassHeadline.tsx) because it is
// a state-contract concern, not a presentation concern: it consumes the 9.1
// DecisioningState union and produces props for the Batch-7 PassHeadline
// component. Folding it into PassHeadline.tsx would either pollute the
// Batch-7-frozen presentation component with state-machine knowledge or invert
// the layer dependency (presentation → orchestration). Keeping it here puts
// all DecisioningState consumers in one place, alongside stateMachine.ts.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   Decision 41 S3 / 41d — pass-naming headline pattern. The exact text the
//     four in-flight states map to:
//       pass_1   → "Pass 1 — Tier recommendation"  ({ pass: 1, recommendation })
//       pass_2   → "Pass 2 — Audit"                ({ pass: 2, audit })
//       pass_3   → "Pass 3 — Targeted correction"  ({ pass: 3, correction })
//       re_audit → "Pass 2 — Re-audit"             ({ pass: 2, reaudit })
//     The shorter "Pass 2 — Re-audit" form (vs the parenthetical "Re-audit of
//     corrected output") was already shipped in the Batch 7 PassHeadline
//     component; this map binds to it. Ratify the already-shipped short form
//     at Batch 11 per the synthesis-doc Things-to-Flag.
//   9.1 DecisioningState — the discriminated union this maps FROM. The 9.1
//     flat-enumeration choice makes original-audit 'pass_2' and 're_audit'
//     distinct state values, so the headline reads directly off the
//     discriminator — no separate "is this a re-audit?" flag needed.
//   Terminal + idle states → null (no headline). Decision 41 does not
//     enumerate terminal-state headline text — spec-silence-because-happy-
//     path-assumed (the fourth silence category surfaced in 9.1). Default to
//     no headline; flagged for Batch 11 ratification.
//
// === STRUCTURAL BINDING TO PassHeadline'S PROP UNION ===
//
// The return type's `pass` and `variant` are explicitly literal-narrowed —
// NOT imported from PassHeadline. This is deliberate: if PassHeadline's prop
// union shifts in a future batch, this return type does NOT auto-shift, and a
// typecheck failure surfaces at the binding site (the `<PassHeadline {...} />`
// spread in the consuming component). Same defensive pattern as the
// schema-canon regression guards — the contract drift becomes a compile error
// exactly where it would matter.

import type { DecisioningState } from './stateMachine';

export interface PassHeadlineProps {
  pass: 1 | 2 | 3;
  variant: 'recommendation' | 'audit' | 'correction' | 'reaudit';
}

export function passHeadlineProps(state: DecisioningState): PassHeadlineProps | null {
  switch (state) {
    case 'pass_1':
      return { pass: 1, variant: 'recommendation' };
    case 'pass_2':
      return { pass: 2, variant: 'audit' };
    case 'pass_3':
      return { pass: 3, variant: 'correction' };
    case 're_audit':
      return { pass: 2, variant: 'reaudit' };
    case 'idle':
    case 'passed_first_audit':
    case 'corrected_and_verified':
    case 'correction_failed_surfaced':
    case 'failed':
      // No headline for idle or any terminal state (spec-silence-because-
      // happy-path-assumed; Batch 11 ratification).
      return null;
    default: {
      // Exhaustiveness guard — a new DecisioningState value added in a future
      // batch fails typecheck here until this map is updated.
      const _exhaustive: never = state;
      return _exhaustive;
    }
  }
}
