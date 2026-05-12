// lib/prompts/markers.ts
// Marker strings that exist verbatim in prompts/pass_*.md.
// Source files stay byte-frozen per PRIMARY_PROMPT.md §8.5; markers mirror them here for substitution.
//
// Each marker is deliberately verbose and bracketed to prevent accidental collision
// with natural English in prompt body content — pattern enforced by Task 2.3's
// invariants test (bidirectional set equality + single-occurrence check).

export const MARKERS = {
  ruleset: '[FULL RULESET v1 INSERTED HERE — all 25 rules with IDs, triggers, tier impacts, citations, and weights. Plus the Tier Decision Logic section verbatim from 02_RULESET_v1.md.]',
  ruleset_pass2: '[FULL RULESET v1 INSERTED HERE — same insertion as Pass 1, all 25 rules with IDs, triggers, tier impacts, citations, weights, plus the Tier Decision Logic section verbatim from 02_RULESET_v1.md.]',
  ruleset_pass3: '[FULL RULESET v1 INSERTED HERE — same insertion as Pass 1 and Pass 2, all 25 rules with IDs, triggers, tier impacts, citations, weights, plus the Tier Decision Logic section verbatim from 02_RULESET_v1.md.]',
  customer_profile: '[CUSTOMER PROFILE JSON INSERTED HERE]',
  pass1_output: '[PASS 1 JSON OUTPUT INSERTED HERE]',
  original_pass1_output: '[ORIGINAL PASS 1 JSON OUTPUT INSERTED HERE]',
  pass2_output: '[PASS 2 JSON OUTPUT INSERTED HERE]',
  correction_audit_id: 'correction_against_audit_id: [STRING INSERTED HERE]',
  correction_attempt_number: 'correction_attempt_number: [INTEGER INSERTED HERE]',
} as const;

export type MarkerKey = keyof typeof MARKERS;
