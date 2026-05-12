// components/primitives/Button.tsx
// Button primitive per visual_system.md §5.5 + §5.6 + §2 token rules.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §2 tokens with reserved roles:
//     --accent-primary    — affirmative action fill (Approve / Submit)
//     --accent-secondary  — line 51: "slightly lighter for hover" on accent elements
//     --accent-deep       — line 52: "deeper variant for active / pressed". Token
//                            named but NOT bound by spec to <button>:active state;
//                            reserved for composition-layer use, not applied here.
//     --text-inverse      — text on filled --accent-primary surfaces
//     --text-secondary    — subtle-variant border AND text (§5.5 line 332)
//     --surface-recessed  — line 92: "non-accent elements get a subtle background
//                            shift via --surface-recessed" on hover
//   §2 line 92 — the load-bearing hover contract:
//     "No color emphasis on hover beyond the --accent-secondary shift on accent
//      elements; non-accent elements get a subtle background shift via --surface-recessed"
//     → primary uses --accent-secondary on hover; outline + subtle use --surface-recessed.
//   §4 line 120 — UI chrome typography: --font-sans regular/medium for button text.
//   §5.5 lines 329–332 — three buttons (Approve / Escalate / Override) map directly:
//     Approve  → primary  (filled --accent-primary)
//     Escalate → outline  (transparent fill, --accent-primary border + text)
//     Override → subtle   (transparent fill, --text-secondary border + text)
//   §5.5 line 362 — post-action disabled-state spec: opacity 0.5 + cursor: not-allowed.
//   §5.6 line 415 — Submit button: "in --accent-primary, --font-sans medium weight"
//                    → matches `primary` variant. Width / horizontal alignment are
//                    composition-layer concerns (full-width mobile, right-align desktop).
//   §6 line 464 — "Hover states have subtle transitions" — transitions are SPEC-NAMED
//                  for buttons (unlike Card and Chip where spec was silent). The
//                  `transition-colors` utility is in scope, not a drift vector.
//
// Variant set is the §5.5 spec-named three. No destructive, no ghost, no link, no
// icon-only. Adding a fourth variant requires editing the TypeScript union — a
// checkpoint moment by construction (Task 6.3 finite-enum-as-union discipline).
//
// Active/pressed state is intentionally NOT applied at primitive layer despite
// --accent-deep being a §2 token. Spec does not bind the token to <button>:active;
// composition layer may override via className if a context genuinely demands it.
//
// Loading state is also NOT applied at primitive layer. Spec describes loading
// only for panels (§5.8 — progress bar + skeleton); the submit button itself has
// no loading-state spec. Future composition needs (e.g., submit-in-flight) layer
// loading affordances on top, with checkpoint approval.
//
// Focus ring (DERIVED, spec-silent — flagged for review):
// visual_system.md does not name a button focus treatment. Per Batch 6 standing
// instruction on accessibility-required affordances under spec silence: defaulting
// to 2px --accent-primary outline with 2px offset on `focus-visible` (keyboard
// navigation only, not mouse click — `focus-visible` avoids showing the keyboard
// indicator when the button is clicked by mouse). If the spec amendment names a
// different treatment later, update here; the regression guards on shadow/scale
// remain unchanged.
//
// Spec-silence regression guards (Task 6.2 / 6.3 pattern, expanded for buttons):
//   - no border-radius (spec silent on button corner radius — Card/Chip discipline)
//   - no drop shadow (no `shadow-*` utility)
//   - no scale transforms (no `hover:scale-*`, no `transform`, no `scale-*`)
//   - no slide / fade / spin animations (no `animate-*`)
// `transition-colors` is the ONLY animation surface (spec line 464). The guards
// allow `transition-colors` but block everything else.

import type { ButtonHTMLAttributes, ReactNode } from 'react';
import { cx } from '@/lib/ui/classnames';

type Variant = 'primary' | 'outline' | 'subtle';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: Variant;
  children: ReactNode;
}

const BASE = [
  'inline-flex items-center justify-center',
  'px-4 py-2',
  'font-sans text-sm font-medium',
  'transition-colors',
  'disabled:cursor-not-allowed disabled:opacity-50',
  // Focus ring: derived under spec silence; keyboard-only via focus-visible.
  'focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-accent-primary',
].join(' ');

const VARIANT_CLASSES: Record<Variant, string> = {
  primary: 'bg-accent-primary text-text-inverse hover:bg-accent-secondary',
  outline: 'border border-accent-primary text-accent-primary bg-transparent hover:bg-surface-recessed',
  subtle:  'border border-text-secondary text-text-secondary bg-transparent hover:bg-surface-recessed',
};

export function Button({ variant = 'primary', className, children, ...rest }: ButtonProps) {
  return (
    <button {...rest} className={cx(BASE, VARIANT_CLASSES[variant], className)}>
      {children}
    </button>
  );
}
