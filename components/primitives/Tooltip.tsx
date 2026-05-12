'use client';
// components/primitives/Tooltip.tsx
// Tooltip primitive per visual_system.md §5.6 lines 398–410 (regulatory
// citation tooltips, Decision 37d).
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §5.6 lines 398–410:
//     - "Hover or focus triggers the tooltip; no click required" (line 400)
//     - "Small bordered box in --surface-elevated" (line 403)
//     - "--text-sm, --text-secondary" (line 404)
//     - "Citation-only content, no explanation" (line 405)
//     - Mobile tap-to-show / tap-elsewhere-to-dismiss (line 406) — NOT
//       implemented at primitive layer; see touch note below
//   §2 tokens — --surface-elevated, --border-default, --text-secondary
//
// USE-CASE CONSTRAINT (spec-bound):
// This primitive renders regulatory citations — short legal/regulatory
// references like "FATF R.12, MORB §923" or "Circular 1230 §X." It is NOT
// general help text, NOT feature explanations, NOT a consumer-app "?" pattern.
// If a future Batch 7+ composition wants help-text rendering or extended
// disclosure, build a different primitive (HelpText / Disclosure) rather than
// extending Tooltip — same separation as Chip vs TierBadge (Task 6.3).
//
// TRIGGER MODEL (spec-named, line 400):
//   - hover: mouse users     — onMouseEnter/onMouseLeave
//   - focus: keyboard users  — onFocus/onBlur (focus-within on the wrapper
//                              when child is a focusable element)
//   - click: DELIBERATELY EXCLUDED by spec. No onClick handler on the wrapper.
// Regression-guarded: clicking the trigger does not toggle the tooltip.
//
// POSITIONING (spec-silent):
// Spec does not name above/below/left/right. Defaulted to "below trigger,
// left-aligned to origin" — least-intrusive for inline form-label citations
// (§5.6 use case). No placement prop exposed; expanding to a placement set is
// a checkpoint conversation (TypeScript-union expansion).
//
// ANIMATION (spec-silent → no animation, per Card/Chip/Button pattern):
// Institutional-register tooltips appear. No fade, no scale-from-95%, no
// translate. Regression-guarded.
//
// MOBILE / TOUCH (spec-described but NOT implemented at primitive layer):
// §5.6 line 406 specifies tap-to-show / tap-elsewhere-to-dismiss on touch.
// This primitive ships hover + focus (desktop + keyboard). Most touch browsers
// synthesize mouseenter on tap, so the tooltip may partially work on touch by
// accident — but robust tap-to-dismiss-on-outside-tap requires explicit
// pointerdown handling that belongs at the composition layer where the
// container context is known. Future Batch 8 custom-input-form composition
// can add this, or it can be promoted to the primitive later via a deliberate
// extension with checkpoint approval.
//
// ACCESSIBILITY:
// role="tooltip" on the content + aria-describedby linking trigger to content
// when open. Standard ARIA pattern; not a discretionary affordance.
//
// Spec-silence regression guards (Card/Chip/Button pattern extended):
//   - no border-radius (plan recipe `rounded` dropped — spec silent)
//   - no drop shadow (plan recipe `shadow-sm` dropped — spec says "bordered
//     box"; the border is the elevation cue, not shadow)
//   - no transition or animation
//   - no click trigger on wrapper

import { useState, useId, type ReactNode } from 'react';

interface TooltipProps {
  content: ReactNode;
  children: ReactNode;
}

export function Tooltip({ content, children }: TooltipProps) {
  const [open, setOpen] = useState(false);
  const id = useId();
  return (
    <span
      className="relative inline-flex items-center"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onFocus={() => setOpen(true)}
      onBlur={() => setOpen(false)}
      aria-describedby={open ? id : undefined}
    >
      {children}
      {open && (
        <span
          id={id}
          role="tooltip"
          className="absolute left-0 top-full z-10 mt-1 max-w-xs border border-border-default bg-surface-elevated px-3 py-2 text-sm text-text-secondary"
        >
          {content}
        </span>
      )}
    </span>
  );
}
