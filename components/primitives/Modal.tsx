'use client';
// components/primitives/Modal.tsx
// Modal primitive per visual_system.md §5.5 lines 355–360 — the Override Modal.
//
// SINGLE-PURPOSE: §5.5 names exactly one modal use case in the demo (the
// Override Modal). This primitive bakes in the Override Modal contract
// internally — no variant prop, no size prop, no position prop, no children
// slot for caller body content. If a future Batch 7+ composition demands a
// different modal pattern (confirmation dialog, info modal, etc.), that's a
// checkpoint conversation: extend this primitive deliberately or build a
// sibling primitive. Don't pre-build variant surface for Override-only use.
//
// DISCIPLINE BOUNDARY — "the one allowed semi-transparent overlay" (§5.5
// line 355): this is the ONLY spec-named place in visual_system.md where a
// semi-transparent overlay is acceptable. Drop shadows are forbidden as
// elevation cues across the system (Card / Chip / Button / Tooltip all
// guarded); the semi-transparent backdrop is reserved for THIS modal pattern
// specifically. If a future Batch 7+ component wants a semi-transparent
// overlay treatment, that proposal should fail review citing §5.5 line 355.
//
// === BANNER SLOT EXTENSION (Task 8.5 / Finding 15 disposition A) ===
//
// Added at Task 8.5 as the FIRST primitive-layer modification since Batch 6
// closed. The extension is the contemplated path from this docstring's
// original framing: "extend this primitive deliberately or build a sibling
// primitive. Don't pre-build variant surface for Override-only use."
// Checkpoint approval was the Task 8.5 dispatch-prep exchange.
//
// Motivation: visual_system.md §5.5 line 369 + Decision 36h require
// Pass3RaceBanner to render INSIDE the Override modal when Pass 3 fires
// while the modal is open ("modal does not auto-close"). With the original
// prop surface {open, onClose, onSubmit, title}, this was not implementable.
//
// Contract:
//   - `banner?: React.ReactNode` — optional caller-supplied banner element,
//     rendered between the title (h2) and the textarea label.
//   - The slot is auxiliary: Modal's single-purpose Override-Modal contract
//     (textarea + Cancel + Submit override + APG dialog patterns) stays
//     unchanged. The banner doesn't alter focus-trap behavior; the textarea
//     remains the first focusable element on open per WAI-ARIA APG.
//   - AnalystControlPanel (Task 8.5) is the canonical consumer, injecting
//     <Pass3RaceBanner pass3={pass3} /> when raceTrigger AND overrideModalOpen.
//
// This is a primitive-layer evolution event, not a new spec-silent gap.
// Documented in the synthesis doc as Modal's prop-surface evolution at
// Task 8.5.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   §5.5 line 355 — "Override modal (the one allowed semi-transparent overlay)"
//   §5.5 line 356 — Textarea prompt verbatim:
//                    "Document the basis for overriding the AI recommendation."
//   §5.5 line 357 — Submit disabled until non-whitespace content entered.
//                    onSubmit emits the *trimmed* basis text.
//   §5.5 line 359 — Three dismissal paths: Escape, backdrop click, Cancel button.
//   §2 tokens — --surface-elevated (dialog box bg), --border-default (dialog
//                box border), --text-primary (header), --text-secondary
//                (textarea prompt label), --surface-base (textarea bg)
//   Globals (Batch 5 app/globals.css) — .modal-backdrop utility provides
//                background-color: rgba(31, 41, 51, 0.4) per §5.5 line 355.
//
// PLAN-RECIPE DIVERGENCE: plan recipe (line 4090–4128) was a generic dialog
// with children API:
//   <Modal open onClose>{children}</Modal>
// Spec at §5.5 lines 355–360 actually describes the Override Modal contract
// specifically: textarea + submit + cancel + validation + three dismissals.
// Per standing instruction #1 (visual_system.md is first read, plan recipe
// is second), built per spec. Plan recipe was an inference; spec is source.
//
// VARIANT SET: zero — no variant prop, no size prop, no position prop. The
// title is the only composition-parameter (aria-labelledby needs a referent;
// per-persona contextual titles like "Override Maria Lavarra's recommendation"
// are the natural composition need).
//
// COMPOSITION: Modal *uses* the Button primitive (Task 6.4) for Cancel and
// Submit — not duplicating button styles. This is the first inter-primitive
// composition in Batch 6: Modal owns the validation + dismissal + focus-trap
// + body-scroll-lock contract; Button owns the visual treatment per §2 line
// 92 hover contract + §5.5 variant naming. Cancel → Button variant="subtle";
// Submit → Button variant="primary".
//
// === FOCUS TRAP (third silence category — NOT a derivation flag) ===
//
// Spec does not explicitly describe focus-trap behavior. This is NOT
// spec-silence-as-gap (like Button's focus ring) and NOT spec-silence-as-
// discipline (like Card border-radius). It is spec-silence-because-standard-
// pattern-exists: WAI-ARIA Authoring Practices Guide for the dialog pattern
// is canonical and authoritative:
//   https://www.w3.org/WAI/ARIA/apg/patterns/dialog-modal/
//
// Implemented per APG:
//   - On open: focus moves to first focusable element (textarea)
//   - Tab cycles within modal (last focusable → first focusable)
//   - Shift+Tab cycles backward (first focusable → last focusable)
//   - Escape dismisses (already covered by §5.5)
//   - On close: focus returns to trigger element (composition-layer concern —
//     the trigger lives outside this primitive)
//
// This is implementation of an accessibility standard, not a derived demo-
// build default. Future maintainers should not read it as flexible.
//
// === BODY-SCROLL-LOCK (spec-silent GAP — flagged for Batch 11 ratification) ===
//
// When modal is open, the page behind shouldn't scroll. Spec is silent on
// this; deriving the standard institutional treatment: set
// document.body.style.overflow = 'hidden' on open, restore prior value on
// close. Same silence category as Button focus ring (spec-silent-as-gap, not
// spec-silence-as-discipline). Added to Batch 11 Things-to-Flag list:
// either ratify into visual_system.md §X or lock as project-knowledge
// decision before production deploy.
//
// === ARIA (mandatory accessibility, not optional) ===
//
//   - role="dialog"
//   - aria-modal="true"
//   - aria-labelledby pointing to header element id
//
// Spec-silence regression guards (Card/Chip/Button/Tooltip pattern):
//   - no border-radius on dialog box
//   - no shadow on dialog box (the semi-transparent backdrop IS the elevation
//     cue per §5.5 line 355; shadow would be redundant + register-failure)
//   - no transition / animation on open or close

import { useEffect, useId, useRef, useState, type ReactNode } from 'react';
import { Button } from './Button';

interface ModalProps {
  open: boolean;
  onClose: () => void;
  onSubmit: (basis: string) => void;
  title: string;
  // Optional banner slot per Decision 36h. Renders between title and textarea
  // label inside the dialog box. Canonical consumer is AnalystControlPanel
  // injecting <Pass3RaceBanner /> on a race-during-Override condition.
  banner?: ReactNode;
}

const TEXTAREA_PROMPT = 'Document the basis for overriding the AI recommendation.';

const FOCUSABLE_SELECTOR =
  'button:not([disabled]), [href], input:not([disabled]), select:not([disabled]), textarea:not([disabled]), [tabindex]:not([tabindex="-1"])';

export function Modal({ open, onClose, onSubmit, title, banner }: ModalProps) {
  const [text, setText] = useState('');
  const titleId = useId();
  const textareaId = useId();
  const containerRef = useRef<HTMLDivElement | null>(null);

  // Reset text when modal closes so reopening is a fresh state.
  useEffect(() => {
    if (!open) setText('');
  }, [open]);

  // Escape dismissal + body-scroll-lock (derived under spec silence — see header).
  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = 'hidden';

    const handle = (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    };
    document.addEventListener('keydown', handle);

    return () => {
      document.removeEventListener('keydown', handle);
      document.body.style.overflow = previousOverflow;
    };
  }, [open, onClose]);

  // Focus textarea on open per WAI-ARIA APG.
  useEffect(() => {
    if (!open) return;
    const container = containerRef.current;
    if (!container) return;
    const textarea = container.querySelector<HTMLTextAreaElement>('textarea');
    textarea?.focus();
  }, [open]);

  // Focus trap: cycle Tab within the dialog per WAI-ARIA APG.
  const handleKeyDown = (e: React.KeyboardEvent<HTMLDivElement>) => {
    if (e.key !== 'Tab') return;
    const container = containerRef.current;
    if (!container) return;
    const focusable = Array.from(container.querySelectorAll<HTMLElement>(FOCUSABLE_SELECTOR));
    if (focusable.length === 0) return;
    const first = focusable[0];
    const last = focusable[focusable.length - 1];
    const active = document.activeElement as HTMLElement | null;
    if (e.shiftKey && active === first) {
      e.preventDefault();
      last.focus();
    } else if (!e.shiftKey && active === last) {
      e.preventDefault();
      first.focus();
    }
  };

  if (!open) return null;

  const submitDisabled = text.trim() === '';
  const handleSubmit = () => {
    if (submitDisabled) return;
    onSubmit(text.trim());
  };

  return (
    <div
      data-testid="modal-backdrop"
      className="modal-backdrop fixed inset-0 z-50 flex items-center justify-center"
      onClick={onClose}
    >
      <div
        ref={containerRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        className="relative max-w-lg border border-border-default bg-surface-elevated p-6"
        onClick={(e) => e.stopPropagation()}
        onKeyDown={handleKeyDown}
      >
        <h2 id={titleId} className="font-sans text-lg font-semibold text-text-primary">
          {title}
        </h2>
        {banner && (
          <div data-testid="modal-banner" className="mt-4">
            {banner}
          </div>
        )}
        <label htmlFor={textareaId} className="mt-4 block text-sm text-text-secondary">
          {TEXTAREA_PROMPT}
        </label>
        <textarea
          id={textareaId}
          value={text}
          onChange={(e) => setText(e.target.value)}
          className="mt-2 w-full border border-border-default bg-surface-base p-3 font-sans text-sm text-text-primary"
          rows={4}
        />
        <div className="mt-6 flex justify-end gap-3">
          <Button variant="subtle" onClick={onClose}>
            Cancel
          </Button>
          <Button variant="primary" disabled={submitDisabled} onClick={handleSubmit}>
            Submit override
          </Button>
        </div>
      </div>
    </div>
  );
}
