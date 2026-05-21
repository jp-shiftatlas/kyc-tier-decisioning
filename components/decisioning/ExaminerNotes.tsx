'use client';
// components/decisioning/ExaminerNotes.tsx
// ExaminerNotes — Pass 1 hero composition per Decision 7.
// "The differentiator made visible. What a compliance officer would submit
//  to a BSP examiner." This is the §10 'I would pay for this section alone'
//  bar.
//
// Anchors (per Batch 6+ docstring back-reference discipline):
//   Decision 7 — Examiner notes hero treatment (not footer treatment).
//   Decision 11 — Two-layer progressive disclosure:
//     summary_finding (top-level 2-sentence string) collapsed by default;
//     examiner_notes_full (six-section structured object) expanded behind a
//     ChevronDisclosure control.
//   Decision 37 — Source Serif 4 editorial heavy-lifting register.
//   Amendment 13 — examiner_notes_full is structured (six sections), not a
//     single string. Iterate via SECTION_LABELS preserving spec order.
//     recommended_edd_procedures is null for Standard-tier personas (Maria);
//     conditionally filter null sections before mapping.
//   visual_system.md §5.3 — Hero treatment specifics:
//     - Header "Examiner Notes" in --text-xl semibold
//     - Persona name + customer reference below in --text-secondary
//     - Body in --font-serif (Source Serif 4) --text-md --leading-loose
//     - Rule IDs inline in mono (e.g., "ES-03"), embedded in prose
//     - PHP amounts inline (TabularNumber composition deferred — see below)
//     - "This is the differentiator made visible. Treat the type and spacing
//        here as load-bearing."
//
// === FIELD-MAPPING DISCIPLINE (Decision 11 ↔ Pass1OutputSchema) ===
//
// summary_finding (top-level Pass 1 field, 2-sentence string) maps to the
// collapsed view. NOT decision_summary (paragraph inside examiner_notes_full
// — that's part of the expanded six-section render). The 2-sentence anchor
// in Decision 11 disambiguates the two similarly-named fields. Field-mapping
// regression guard test enforces this — a future refactor that swaps these
// two fields trips the guard immediately.
//
// === DISCLOSURE PATTERN (single ChevronDisclosure, NOT per-section) ===
//
// One ChevronDisclosure instance controls the entire expanded section. Spec
// is two-layer (collapsed | expanded), not seven-layer (summary | six
// independently-toggleable sections). The disclosed content is owned by
// THIS component; the primitive owns only the trigger button + chevron
// rotation per the Batch 6 synthesis doc trust boundary.
//
// === COMPOSITION (three primitives) ===
//
// Card (variant="elevated") — hero-treatment panel surface per §5.3.
// ChevronDisclosure — single instance, toggles the expanded view.
// TabularNumber — NOT composed inline in this task. PHP amounts in
//   summary_finding (e.g., Maria: "PHP 80,000/mo... PHP 50,000/mo ceiling")
//   appear with "/mo" or "ceiling" suffixes attached as prose; surgical
//   wrapping breaks the prose flow. Per dispatch directive: "Default to
//   plain text if inline composition feels forced." Prose renders plain;
//   tabular alignment is reserved for column contexts (SeverityStrip,
//   RiskScore, ThresholdBlock).
//
// === ANTI-SPEC (what NOT to compose per dispatch directive) ===
//
//   - No Tooltip on rule IDs (mono inline treatment is the spec-named
//     affordance per §5.3; hover-definitions are unrequested).
//   - No Button (read-only display surface per Decision 7).
//   - No Chip (no status to surface — audit panel does status; ExaminerNotes
//     does prose).
//   - No per-section ChevronDisclosure (spec is two-layer, not seven-layer).
//   - No expand/collapse animation beyond the chevron's binary rotation.
//
// === SECTION ORDER (spec-positive, not derived) ===
//
// SECTION_LABELS preserves the §5.3 line 285 spec order verbatim. Order is
// the compliance-memo register established in prompts/pass_1_system_prompt.md
// "Output: Two Layers" structure. Do not reorder without a spec amendment.

import { useState } from 'react';
import type { Pass1Output } from '@/lib/schemas/pass1';
import { Card } from '@/components/primitives/Card';
import { ChevronDisclosure } from '@/components/primitives/ChevronDisclosure';
import { ExaminerNotesSection } from './ExaminerNotesSection';

interface ExaminerNotesProps {
  pass1: Pass1Output;
  personaName: string;
  customerReference: string;
}

const SECTION_LABELS = [
  { key: 'decision_summary', label: 'Decision Summary' },
  { key: 'profile_analysis', label: 'Profile Analysis' },
  { key: 'rule_application_and_risk_pattern', label: 'Rule Application and Risk Pattern' },
  { key: 'considered_alternatives', label: 'Considered Alternatives' },
  { key: 'recommended_edd_procedures', label: 'Recommended EDD Procedures' },
  { key: 'audit_trail', label: 'Audit Trail' },
] as const;

export function ExaminerNotes({ pass1, personaName, customerReference }: ExaminerNotesProps) {
  const [expanded, setExpanded] = useState(false);
  const notes = pass1.examiner_notes_full as Record<string, string | null>;

  return (
    <Card variant="elevated">
      <header className="mb-6">
        {/* "Examiner Notes" heading removed per JP Batch 12 Screen 4 feedback —
            ExaminerNotesScreen's panel headline already labels the section.
            Persona + customer-reference subline kept as page-context anchor. */}
        <p className="font-sans text-sm text-text-secondary">
          {personaName} · {customerReference}
        </p>
      </header>

      <p className="font-serif text-md leading-loose text-text-primary">
        {pass1.summary_finding}
      </p>

      <div className="mt-6">
        <ChevronDisclosure
          label={expanded ? 'Hide full memo' : 'Read full memo'}
          open={expanded}
          onToggle={setExpanded}
        />

        {expanded && (
          <div className="mt-6 space-y-6">
            {SECTION_LABELS.filter(({ key }) => notes[key] != null).map(({ key, label }) => (
              <ExaminerNotesSection key={key} label={label} content={notes[key] as string} />
            ))}
          </div>
        )}
      </div>
    </Card>
  );
}
