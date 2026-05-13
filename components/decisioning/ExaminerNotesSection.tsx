// components/decisioning/ExaminerNotesSection.tsx
// One section of the ExaminerNotes six-section expanded view per Amendment 13.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   visual_system.md §5.3 line 285 — "Memo structure: Decision Summary /
//     Profile Analysis / Rule Application / Considered Alternatives /
//     Recommended EDD Procedures / Audit Trail (per the brief — not all
//     sections appear in every persona's notes)."
//   Amendment 13 — "Render each section with a small-caps label above prose.
//     recommended_edd_procedures is null for Standard-tier personas (Maria)
//     — conditionally omit that section."
//   Plan recipe (line 118) — "small-caps treatment (xs uppercase tracking-wide
//     text-text-secondary) above each prose paragraph to preserve the
//     compliance-memo register without dropping into a heading hierarchy that
//     conflicts with the page's H1/H2 scale per visual_system.md §3."
//   §5.3 typography — Source Serif 4 (--font-serif), --text-md (17px,
//     spec-named "serif body for Examiner Notes" per globals.css line 78),
//     --leading-loose (1.7, spec-named "serif Examiner Notes paragraphs" per
//     globals.css line 86).
//
// TRUST BOUNDARY: this component does NOT check for null content. Caller
// filters null/undefined sections (Maria's null recommended_edd_procedures)
// before mapping. ExaminerNotesSection trusts caller to pass valid content
// per the Batch 6 synthesis doc trust-boundary pattern.
//
// HEADING LEVEL: h3, not h2 or h4. Section labels are sub-section markers
// within the Examiner Notes composition (h2 "Examiner Notes" header lives in
// the parent component). h3 preserves document outline order without
// conflicting with the page-level h1/h2 scale.
//
// PROSE FORMATTING: whitespace-pre-line preserves paragraph breaks from the
// persona JSON content (sections sometimes span multiple paragraphs separated
// by \n\n in the locked JSON).

interface ExaminerNotesSectionProps {
  label: string;
  content: string;
}

export function ExaminerNotesSection({ label, content }: ExaminerNotesSectionProps) {
  return (
    <section>
      <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-text-secondary">
        {label}
      </h3>
      <p className="whitespace-pre-line font-serif text-md leading-loose text-text-primary">
        {content}
      </p>
    </section>
  );
}
