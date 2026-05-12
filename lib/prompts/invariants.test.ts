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
});
