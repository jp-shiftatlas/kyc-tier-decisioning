// lib/decisioning/ruleCatalog.ts
// Static lookup of canonical rule names + tier-impact descriptions for the
// 25 rules in ruleset_v1.md (TE-01–10, ES-01–08, DC-01–07). Used as a
// fallback display source when live-API Pass 1 output omits the spontaneous
// rule_name + tier_impact fields that the locked persona JSONs carry.
//
// Context: the four locked personas (Maria / Carlos / Convergent Hybrid /
// Documentation-Process) were curated from prose-then-JSON Claude sessions
// and emit rich rule entries carrying { rule_id, rule_name, tier_impact, ... }.
// The live model output is constrained by the Path Q template (Batch 11A
// Phase 2) to the schema's declared fields only — rule_name and tier_impact
// are NOT in the declared schema and therefore not emitted. This catalog
// closes the gap on the UI side without prompting changes to the locked
// pass_1_system_prompt.md.
//
// Source: ruleset_v1.md lines 43–85 (Tier Eligibility / Mandatory Escalation
// Triggers / Documentation & Process sections). If the ruleset changes, this
// catalog must be kept in sync — flagged for future regression-guard work.

export interface RuleCatalogEntry {
  /** Canonical rule name (lifted verbatim from ruleset_v1.md column 2). */
  name: string;
  /** Tier impact description (ruleset_v1.md column 4 — concise form). */
  tier_impact: string;
}

export const RULE_CATALOG: Record<string, RuleCatalogEntry> = {
  // Tier Eligibility — TE-01 through TE-10
  'TE-01': {
    name: 'Low-risk profile baseline',
    tier_impact: 'SDD eligible — salaried PH resident, single account purpose, low expected volume.',
  },
  'TE-02': {
    name: 'Standard profile baseline',
    tier_impact: 'Standard tier — employed/self-employed PH resident, expected volume PHP 50K–500K/mo.',
  },
  'TE-03': {
    name: 'High volume threshold',
    tier_impact: 'EDD required — expected monthly volume ≥ PHP 1M.',
  },
  'TE-04': {
    name: 'Mass affluent / private banking customer type',
    tier_impact: 'EDD required — customer type is mass affluent or private banking.',
  },
  'TE-05': {
    name: 'New relationship + high volume',
    tier_impact: 'EDD required — new relationship combined with expected volume ≥ PHP 500K/mo.',
  },
  'TE-06': {
    name: 'OFW with regular remittance pattern',
    tier_impact: 'SDD eligible — OFW residency, remittance purpose, salary source, expected volume <PHP 500K/mo.',
  },
  'TE-07': {
    name: 'Non-resident foreign individual',
    tier_impact: 'EDD required — non-resident foreign customer.',
  },
  'TE-08': {
    name: 'Student account, low volume',
    tier_impact: 'SDD eligible — student profile, low expected volume, no high-risk indicators.',
  },
  'TE-09': {
    name: 'Business owner, sole proprietor',
    tier_impact: 'Standard minimum; EDD if other triggers fire — business occupation + business purpose + business source.',
  },
  'TE-10': {
    name: 'Unclear or unverifiable source of funds',
    tier_impact: 'EDD required, escalate — source of funds is unclear or cannot be substantiated.',
  },

  // Mandatory Escalation Triggers — ES-01 through ES-08
  'ES-01': {
    name: 'PEP — self',
    tier_impact: 'Mandatory EDD, senior management approval required (FATF R.12).',
  },
  'ES-02': {
    name: 'PEP — immediate family',
    tier_impact: 'Mandatory EDD, senior management approval required (FATF R.12).',
  },
  'ES-03': {
    name: 'PEP — close associate',
    tier_impact: 'Mandatory EDD, senior management approval required (FATF R.12).',
  },
  'ES-04': {
    name: 'Sanctions hit',
    tier_impact: 'Decline / freeze, file STR — sanctions screening returned a hit.',
  },
  'ES-05': {
    name: 'Sanctions pending review',
    tier_impact: 'Hold onboarding, escalate to compliance — sanctions screening pending review.',
  },
  'ES-06': {
    name: 'High-risk jurisdiction connection',
    tier_impact: 'Mandatory EDD — personal, business, or both connections to a high-risk jurisdiction.',
  },
  'ES-07': {
    name: 'Adverse media — confirmed findings',
    tier_impact: 'Mandatory EDD, document rationale — adverse media confirmed.',
  },
  'ES-08': {
    name: 'Adverse media — unclear, requires review',
    tier_impact: 'Standard minimum, escalate for human review before tier finalization.',
  },

  // Documentation & Process — DC-01 through DC-07
  'DC-01': {
    name: 'PhilSys / PhilID acceptance',
    tier_impact: 'PhilSys ID presented as primary identification — acceptable as sole ID per RA 11055; e-KYC eligible.',
  },
  'DC-02': {
    name: 'Single non-PhilSys ID limitation',
    tier_impact: 'Non-PhilSys ID — secondary verification required; cannot be sole means of identification.',
  },
  'DC-03': {
    name: 'e-KYC face-to-face equivalence',
    tier_impact: 'Onboarding via e-KYC digital ID system — must meet face-to-face equivalent standards.',
  },
  'DC-04': {
    name: 'Repeat onboarding — existing relationship',
    tier_impact: 'Streamlined refresh — do not re-collect from scratch.',
  },
  'DC-05': {
    name: 'Source of funds — investment income',
    tier_impact: 'Verify investment account documentation; Standard minimum.',
  },
  'DC-06': {
    name: 'Source of funds — inheritance',
    tier_impact: 'Documentation of estate settlement required; Standard minimum.',
  },
  'DC-07': {
    name: 'NPC AI accountability disclosure',
    tier_impact: 'Must be auditable, explainable, with documented human review per NPC Advisory 2024-04. Fires on every AI-generated recommendation.',
  },
};

/**
 * Lookup a rule's canonical name + tier impact by rule_id. Returns null if
 * the rule_id is not in the v1 catalog (e.g., a model spontaneously emits
 * a rule_id outside the 25-rule ruleset — degrade gracefully at the UI).
 */
export function lookupRule(rule_id: string): RuleCatalogEntry | null {
  return RULE_CATALOG[rule_id] ?? null;
}
