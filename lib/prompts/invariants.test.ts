import { describe, it, expect } from 'vitest';
import { MARKERS, type MarkerKey } from './markers';
import { stripDocComments } from './inject';
import pass1Prompt from '@/prompts/pass_1_system_prompt.md';
import pass2Prompt from '@/prompts/pass_2_system_prompt.md';
import pass3Prompt from '@/prompts/pass_3_system_prompt.md';
import ruleset from '@/ruleset_v1.md';

const occurrences = (haystack: string, needle: string) => haystack.split(needle).length - 1;

// Amendment 14: invariants assert on stripped content (no HTML doc-block).
const p1 = stripDocComments(pass1Prompt);
const p2 = stripDocComments(pass2Prompt);
const p3 = stripDocComments(pass3Prompt);
const rs = stripDocComments(ruleset);

const ORPHAN_PATTERN = /\[[^\]]*INSERTED HERE[^\]]*\]/g;

// Per-pass canonical marker sets (which MARKERS entries belong to which pass).
const PASS1_MARKERS: readonly MarkerKey[] = ['ruleset', 'customer_profile'] as const;
const PASS2_MARKERS: readonly MarkerKey[] = ['ruleset_pass2', 'pass1_output', 'customer_profile'] as const;
const PASS3_MARKERS: readonly MarkerKey[] = [
  'ruleset_pass3',
  'customer_profile',
  'original_pass1_output',
  'pass2_output',
  'correction_audit_id',
  'correction_attempt_number',
] as const;

describe('Prompt injection invariants — PRIMARY_PROMPT.md §4.10 (Decision 35)', () => {
  // ─────────────────────────────────────────────────────────────────────────
  // Invariant A: marker uniqueness (each marker appears EXACTLY ONCE)
  // Failure mode caught: marker appears 0 or 2+ times in stripped source.
  // ─────────────────────────────────────────────────────────────────────────

  describe('A — single-occurrence per marker (stripped)', () => {
    it('each Pass 1 marker appears exactly once in pass_1_system_prompt.md', () => {
      expect(occurrences(p1, MARKERS.ruleset)).toBe(1);
      expect(occurrences(p1, MARKERS.customer_profile)).toBe(1);
    });

    it('each Pass 2 marker appears exactly once in pass_2_system_prompt.md', () => {
      expect(occurrences(p2, MARKERS.ruleset_pass2)).toBe(1);
      expect(occurrences(p2, MARKERS.pass1_output)).toBe(1);
      expect(occurrences(p2, MARKERS.customer_profile)).toBe(1);
    });

    it('each Pass 3 marker appears exactly once in pass_3_system_prompt.md', () => {
      expect(occurrences(p3, MARKERS.ruleset_pass3)).toBe(1);
      expect(occurrences(p3, MARKERS.customer_profile)).toBe(1);
      expect(occurrences(p3, MARKERS.original_pass1_output)).toBe(1);
      expect(occurrences(p3, MARKERS.pass2_output)).toBe(1);
      expect(occurrences(p3, MARKERS.correction_audit_id)).toBe(1);
      expect(occurrences(p3, MARKERS.correction_attempt_number)).toBe(1);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Invariant B: non-empty injection content
  // Failure mode caught: ruleset accidentally cleared or stripDocComments removes everything.
  // ─────────────────────────────────────────────────────────────────────────

  describe('B — non-empty content after strip', () => {
    it('stripped ruleset has substantive content', () => {
      expect(rs.trim().length).toBeGreaterThan(0);
      // Defensive lower bound — ruleset_v1.md is ~11KB; arbitrary low threshold
      // catches the failure mode "doc-block strip eats everything".
      expect(rs.trim().length).toBeGreaterThan(500);
    });

    it('each stripped pass prompt has substantive content', () => {
      expect(p1.trim().length).toBeGreaterThan(500);
      expect(p2.trim().length).toBeGreaterThan(500);
      expect(p3.trim().length).toBeGreaterThan(500);
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Invariant C: bidirectional marker-set equality (no orphans either way)
  // Failure mode caught:
  //   - Source has a marker not in MARKERS → silently left in prompt to API (A→B)
  //   - MARKERS has an entry not in source → replaceOnce throws at runtime (B→A)
  // ─────────────────────────────────────────────────────────────────────────

  describe('C — bidirectional marker-set equality', () => {
    // A → B: every "[…INSERTED HERE…]" pattern in source is accounted for by
    // a known MARKERS entry. Implementation: remove every known marker from
    // the source, then assert no orphan pattern remains. This is stricter than
    // a per-match `includes` check — it catches the case where a stray
    // "[INTEGER INSERTED HERE]" pattern appears in source disconnected from
    // its key-value prefix (which a substring check would miss).

    const stripKnownMarkers = (source: string, keys: readonly MarkerKey[]) =>
      keys.reduce((acc, k) => acc.split(MARKERS[k]).join(''), source);

    it('no orphan markers in Pass 1 source after removing PASS1_MARKERS', () => {
      const residual = stripKnownMarkers(p1, PASS1_MARKERS);
      expect(residual.match(ORPHAN_PATTERN) ?? []).toEqual([]);
    });

    it('no orphan markers in Pass 2 source after removing PASS2_MARKERS', () => {
      const residual = stripKnownMarkers(p2, PASS2_MARKERS);
      expect(residual.match(ORPHAN_PATTERN) ?? []).toEqual([]);
    });

    it('no orphan markers in Pass 3 source after removing PASS3_MARKERS', () => {
      const residual = stripKnownMarkers(p3, PASS3_MARKERS);
      expect(residual.match(ORPHAN_PATTERN) ?? []).toEqual([]);
    });

    // B → A: every MARKERS entry for a pass IS present in that pass's source.
    // Catches the failure mode "markers.ts has an entry that doesn't actually
    // appear in the .md anymore" — replaceOnce would throw at runtime.

    it('every Pass 1 marker entry is present in pass_1_system_prompt.md', () => {
      for (const key of PASS1_MARKERS) {
        expect(p1.includes(MARKERS[key])).toBe(true);
      }
    });

    it('every Pass 2 marker entry is present in pass_2_system_prompt.md', () => {
      for (const key of PASS2_MARKERS) {
        expect(p2.includes(MARKERS[key])).toBe(true);
      }
    });

    it('every Pass 3 marker entry is present in pass_3_system_prompt.md', () => {
      for (const key of PASS3_MARKERS) {
        expect(p3.includes(MARKERS[key])).toBe(true);
      }
    });

    // Belt-and-suspenders: the per-pass marker sets above cover all 9 MARKERS
    // entries between them. Verify no MARKERS key is forgotten by the per-pass
    // assignments.
    it('every MARKERS key is covered by at least one per-pass set', () => {
      const allKeys = new Set<MarkerKey>(Object.keys(MARKERS) as MarkerKey[]);
      const covered = new Set<MarkerKey>([...PASS1_MARKERS, ...PASS2_MARKERS, ...PASS3_MARKERS]);
      for (const k of allKeys) {
        expect(covered.has(k)).toBe(true);
      }
    });
  });

  // ─────────────────────────────────────────────────────────────────────────
  // Invariant D: JSON output template present per pass (Batch 11A Phase 2)
  // Failure mode caught: future prompt edits delete the JSON template block or
  // remove key required field names, re-opening the live-API schema mismatch
  // diagnosed in Batch 11 rehearsal. The required field names are derived from
  // the schema files (Pass1OutputSchema / Pass2OutputSchema / Pass3OutputSchema)
  // and hardcoded here so the regression guard binds to the schema source of
  // truth rather than re-parsing the schema at runtime.
  // ─────────────────────────────────────────────────────────────────────────

  describe('D — JSON output template embedded per pass', () => {
    const TEMPLATE_FENCE = '```json';
    const CONSTRAIN_INSTRUCTION = 'Do NOT add fields not in this template';

    // Extract the content of the first ```json fenced block from a stripped
    // prompt. Returns the empty string when no block is found; callers assert
    // a positive length first.
    function extractJsonTemplate(stripped: string): string {
      const start = stripped.indexOf(TEMPLATE_FENCE);
      if (start === -1) return '';
      const blockStart = start + TEMPLATE_FENCE.length;
      const end = stripped.indexOf('```', blockStart);
      if (end === -1) return '';
      return stripped.slice(blockStart, end);
    }

    it('Pass 1 prompt embeds a JSON template with every required Pass1OutputSchema field', () => {
      // Source of truth: lib/schemas/pass1.ts — Pass1OutputSchema required fields
      // plus the six examiner_notes_full sub-keys and the six decision sub-keys.
      const block = extractJsonTemplate(p1);
      expect(block.length).toBeGreaterThan(0);
      // Top-level required fields
      for (const field of [
        '"decision"',
        '"risk_score"',
        '"rules_fired"',
        '"examiner_notes_full"',
        '"summary_finding"',
      ]) {
        expect(block).toContain(field);
      }
      // decision sub-keys (the structural mismatch from Batch 11 rehearsal:
      // model was emitting these flat at the root)
      for (const field of [
        '"recommended_tier"',
        '"decision_basis"',
        '"decisive_rule_ids"',
        '"senior_approval_required"',
        '"onboarding_hold"',
        '"hold_reason"',
      ]) {
        expect(block).toContain(field);
      }
      // examiner_notes_full sub-keys (the other structural mismatch:
      // model was emitting examiner_notes_full as a single prose string)
      for (const field of [
        '"decision_summary"',
        '"profile_analysis"',
        '"rule_application_and_risk_pattern"',
        '"considered_alternatives"',
        '"recommended_edd_procedures"',
        '"audit_trail"',
      ]) {
        expect(block).toContain(field);
      }
      // risk_score sub-keys
      for (const field of [
        '"total"',
        '"category_breakdown"',
        '"tier_eligibility"',
        '"escalation_triggers"',
        '"documentation_process"',
      ]) {
        expect(block).toContain(field);
      }
      // Path Q (constrain, don't expand) — schema-conformance instruction present
      expect(p1).toContain(CONSTRAIN_INSTRUCTION);
    });

    it('Pass 2 prompt embeds a JSON template with every required Pass2OutputSchema field', () => {
      // Source of truth: lib/schemas/pass2.ts — Pass2OutputSchema required fields.
      const block = extractJsonTemplate(p2);
      expect(block.length).toBeGreaterThan(0);
      for (const field of [
        '"target_check_ids"',
        '"regeneration_scope"',
        '"correction_required"',
        '"audit_summary"',
        '"overall_status"',
        '"checks"',
      ]) {
        expect(block).toContain(field);
      }
      // AuditCheckSchema sub-keys (required-per-entry plus the three
      // numeric_threshold_verification fields the audit discipline depends on)
      for (const field of [
        '"check_type"',
        '"status"',
        '"severity"',
        '"evidence_note"',
        '"profile_value"',
        '"rule_threshold"',
        '"comparison_result"',
      ]) {
        expect(block).toContain(field);
      }
      expect(p2).toContain(CONSTRAIN_INSTRUCTION);
    });

    it('Pass 3 prompt embeds a JSON template matching the FLAT Pass3OutputSchema shape', () => {
      // Source of truth: lib/schemas/pass3.ts — Pass3OutputSchema required fields.
      // Per Findings 4/5 and Batch 11A directive: schema is FLAT (correction_against_audit_id,
      // correction_attempt_number, corrected_pass_1_output, change_log all at root) —
      // NOT nested under a correction_metadata envelope.
      const block = extractJsonTemplate(p3);
      expect(block.length).toBeGreaterThan(0);
      for (const field of [
        '"correction_against_audit_id"',
        '"correction_attempt_number"',
        '"corrected_pass_1_output"',
        '"change_log"',
      ]) {
        expect(block).toContain(field);
      }
      // ChangeLogEntrySchema fields — strictObject, must use the schema's exact
      // field names (field/before/after/reason, NOT field_path/rationale/cascade_basis
      // which are the prompt-vs-schema-gap names from the deferred Resolution(Batch 11)
      // nested-envelope tightening).
      for (const field of [
        '"field"',
        '"before"',
        '"after"',
        '"reason"',
      ]) {
        expect(block).toContain(field);
      }
      // Optional fields — present in template even though optional, since their
      // shape is non-obvious.
      for (const field of [
        '"regeneration_scope_applied"',
        '"addressed_violations"',
        '"correction_summary"',
        '"preservation_attestation"',
      ]) {
        expect(block).toContain(field);
      }
      // Flat-shape negative assertion: the template must NOT introduce
      // correction_metadata or metadata envelopes (the prior nested shape
      // that the schema rejects).
      expect(block).not.toContain('"correction_metadata"');
      expect(p3).toContain(CONSTRAIN_INSTRUCTION);
    });
  });
});
