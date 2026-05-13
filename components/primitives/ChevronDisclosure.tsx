// components/primitives/ChevronDisclosure.tsx
// ChevronDisclosure primitive per visual_system.md §5.1 line 223.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §5.1 line 223 — "'Why this tier' expandable: chevron disclosure, expanded
//                     content uses serif body type for the rationale prose"
//   §2 tokens     — --text-secondary (chevron + label color)
//   §6 line 464   — motion discipline; chevron rotation is functional state
//                    indication (NOT decorative), but no transition — see below
//
// USE-CASE CONSTRAINT: this is the TRIGGER widget for a disclosure pattern.
// It does NOT render the disclosed content — composition layer renders the
// expandable body conditionally based on the `open` prop. The primitive
// shape mirrors §5.1 line 223 (chevron disclosure as a separate element from
// the rationale prose body it controls).
//
// === FOCUS TRAP / KEYBOARD (third silence category — WAI-ARIA APG) ===
//
// WAI-ARIA Authoring Practices Guide for the disclosure pattern is canonical:
//   https://www.w3.org/WAI/ARIA/apg/patterns/disclosure/
//
// Implemented per APG:
//   - Trigger is a native <button>, providing default keyboard activation
//     (Enter + Space) and focus indication without custom handling
//   - aria-expanded reflects current state
//   - aria-controls is NOT set here — the primitive does not know the
//     controlled-content element id; composition layer wires this if the
//     disclosure pattern requires the relationship to be ARIA-traceable
//
// This is implementation of an accessibility standard, not a derived
// demo-build default.
//
// === CHEVRON ROTATION (spec-silent, allowed as functional state indication) ===
//
// §6 line 464 "Nothing else animates" is a discipline statement against
// decorative animation, NOT a prohibition on functional state indication.
// The chevron has TWO discrete visual states tied to the data:
//   - closed: chevron points right  (rotate-0)
//   - open:   chevron points down   (rotate-90)
//
// Rotation is communicative, not theater. JP directive (Task 6.7): "If §6
// is silent, rotation is institutional (functional state indication, not
// theater) and is appropriate."
//
// NO TRANSITION on rotation — instantaneous state change. Hover transitions
// (§6 spec-allowed for Buttons) and width transitions (§5.8 spec-implied
// for ProgressBar) are spec-named exceptions; click-state rotation
// transitions are not. Default to the strictest discipline: state change is
// instantaneous. If a future composition genuinely needs smooth rotation,
// checkpoint conversation.
//
// VARIANT SET: zero — `label`, `open`, `onToggle`, `className`. No size
// variant, no color variant, no chevron-style variant. Single-purpose.
//
// Spec-silence regression guards (Card/Chip/Button/Tooltip/Modal pattern):
//   - no border-radius on button or chevron
//   - no transition or animate-* on chevron (rotation is instantaneous)
//   - no shadow

import { cx } from '@/lib/ui/classnames';

interface ChevronDisclosureProps {
  label: string;
  open: boolean;
  onToggle: (next: boolean) => void;
  className?: string;
}

export function ChevronDisclosure({ label, open, onToggle, className }: ChevronDisclosureProps) {
  return (
    <button
      type="button"
      aria-expanded={open}
      onClick={() => onToggle(!open)}
      className={cx(
        'inline-flex items-center gap-2 font-sans text-sm text-text-secondary',
        'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
        className,
      )}
    >
      <svg
        data-testid="chevron-icon"
        className={cx('h-3 w-3', open ? 'rotate-90' : 'rotate-0')}
        viewBox="0 0 12 12"
        fill="none"
        stroke="currentColor"
        strokeWidth={1.5}
        aria-hidden="true"
      >
        <path d="M4 2 L8 6 L4 10" />
      </svg>
      <span>{label}</span>
    </button>
  );
}
