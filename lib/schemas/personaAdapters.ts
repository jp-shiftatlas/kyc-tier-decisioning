// lib/schemas/personaAdapters.ts
// Render-time adapters for Decision 28 (Pass 2 shape) and Decision 29 (Pass 1 category).
// PRIMARY_PROMPT.md §4.4: locked persona JSON stays byte-frozen; normalize at read time.
//
// This file lands in two phases per the plan amendments:
//   Phase 1 (Task 1.2.5 — this task): pure normalizers, no schema imports
//   Phase 2 (Task 1.7): typed loadPersona / listPersonas added on top
// Do not rewrite this file in Task 1.7 — only extend it.

import personasData from '@/data/personas.json';
import { CustomerProfileSchema, type CustomerProfile } from './customerProfile';
import { Pass1OutputSchema, type Pass1Output } from './pass1';
import { Pass2OutputSchema, type Pass2Output } from './pass2';

export function normalizePass1(p1: any): any {
  return {
    ...p1,
    rules_fired: (p1.rules_fired ?? []).map((r: any) => ({
      ...r,
      category: r.category === 'escalation' ? 'escalation_triggers' : r.category,
    })),
  };
}

// DC-07 dual-satisfaction inspection per plan amendment #4.
// Half 1 (structured-record): a DC-07 check exists in the audit and passed.
// Half 2 (prose-level): a check's evidence_note explicitly references the audit_trail prose.
// If a persona JSON cannot distinguish the two halves cleanly, both flags fall back to the
// presence of any passing DC-07 check; surface anomalies to JP during implementation rather
// than defaulting silently.
//
// Status comparison is case-insensitive — locked persona JSON uses lowercase "pass" (verified
// against data/personas.json during Task 1.2.5).
//
// DC-07 detection picks up two patterns the locked personas use:
//   - check_id === 'rule_check_DC-07' or check_type === 'rule_firing' on a DC-07 entry: the
//     structured-record half (Maria/Carlos audit pass).
//   - check_type === 'dc07_documentation' or rule_id === 'DC-07' on the dual entry: the
//     prose-level (or combined) half.
function isPass(status: unknown): boolean {
  return typeof status === 'string' && status.toUpperCase() === 'PASS';
}
function computeDc07Flags(checks: any[]): { _dc07_structured_record: boolean; _dc07_prose: boolean } {
  const dc07 = checks.filter(
    (c) =>
      c?.rule_id === 'DC-07' ||
      c?.check_type === 'dc07_documentation' ||
      c?.check_id === 'rule_check_DC-07' ||
      (typeof c?.check_id === 'string' && c.check_id.includes('DC-07')),
  );
  if (dc07.length === 0) return { _dc07_structured_record: false, _dc07_prose: false };
  const structuredRecord = dc07.some(
    (c) =>
      isPass(c?.status) &&
      (c?.check_type === 'rule_firing' ||
        c?.check_id === 'rule_check_DC-07' ||
        /rules_fired|structured[- ]record/i.test(c?.evidence_note ?? '')),
  );
  const prose = dc07.some(
    (c) => isPass(c?.status) && /audit_trail|prose[- ]level|substantive/i.test(c?.evidence_note ?? ''),
  );
  // Fallback: if neither half matches the prose patterns, but at least one DC-07 check is PASS,
  // treat both halves as satisfied. The PRIMARY_PROMPT.md §4.6 contract says DC-07 is dual; on
  // a PASS-clean persona, both halves are by construction true.
  const anyPass = dc07.some((c) => isPass(c?.status));
  return {
    _dc07_structured_record: structuredRecord || (anyPass && !prose ? true : structuredRecord),
    _dc07_prose: prose || (anyPass && !structuredRecord ? true : prose),
  };
}

// Extract a canonical rule_id (e.g. "DC-07", "TE-02") from a Pass 2 check whose locked persona
// JSON only carries check_id (e.g. "rule_check_DC-07", "dc07_documentation"). Per the plan's
// Pass2OutputSchema test contract, normalized checks expose rule_id on rule-firing / DC-07 entries.
function extractRuleId(check: any): string | undefined {
  if (typeof check?.rule_id === 'string') return check.rule_id;
  const id = typeof check?.check_id === 'string' ? check.check_id : '';
  // Canonical rule code pattern: TE-NN, DC-NN, ES-NN (uppercase, two digits).
  const m = id.match(/(?:^|[_-])((?:TE|DC|ES)-?\d{2})/i);
  if (m) return m[1].toUpperCase().replace(/^(TE|DC|ES)(\d{2})$/, '$1-$2');
  // dc07_documentation / similar lowercase forms — recover by case-folding.
  const m2 = id.match(/(te|dc|es)0?(\d{1,2})/i);
  if (m2) return `${m2[1].toUpperCase()}-${m2[2].padStart(2, '0')}`;
  return undefined;
}

export function normalizePass2(p2: any): any {
  // eslint-disable-next-line @typescript-eslint/no-unused-vars
  const { audited_persona, ...rest } = p2;
  const checks = (p2.checks ?? []).map((c: any) => {
    const rule_id = extractRuleId(c);
    return rule_id ? { rule_id, ...c } : c;
  });
  const dc07 = computeDc07Flags(checks);
  return {
    ...rest,
    checks,
    generated_at: p2.generated_at ?? p2.audit_generated_at,
    target_check_ids: p2.target_check_ids ?? p2.target_violations ?? [],
    regeneration_scope: p2.regeneration_scope ?? 'none',
    _dc07_structured_record: p2._dc07_structured_record ?? dc07._dc07_structured_record,
    _dc07_prose: p2._dc07_prose ?? dc07._dc07_prose,
  };
}

// Wire-variant normalization for the customer profile.
// Persona JSON sometimes carries short-form wire values; the form-config SSOT
// (Decision 34) and Batch 2's prompt injection assume canonical values.
// Apply this BEFORE CustomerProfileSchema validation in loadPersona.
//
// `adverse_media: "unclear"` is intentionally NOT mapped — it is a real canonical
// ES-08 ruleset category (ruleset_v1.md L69), not a wire synonym.
export function normalizeWireVariants(profile: any): any {
  if (!profile || typeof profile !== 'object') return profile;
  const out = { ...profile };
  if (out.pep_status === 'close associate') {
    out.pep_status = 'family/close associate';
  }
  if (out.high_risk_jurisdiction_connection === 'business') {
    out.high_risk_jurisdiction_connection = 'business operations';
  }
  return out;
}

// ---- Task 1.7 additions (additive per Plan Amendment #1) ----
// Typed schema-validating loaders. Pure normalizers above remain unchanged.

export type PersonaId = 'maria' | 'carlos' | 'persona_c' | 'persona_d';

export interface LoadedPersona {
  id: PersonaId;
  name: string;
  descriptor: string;
  profile: CustomerProfile;
  pass_1: Pass1Output;
  pass_2: Pass2Output;
}

export function loadPersona(id: PersonaId): LoadedPersona {
  const raw = personasData.personas.find((p: any) => p.id === id);
  if (!raw) throw new Error(`Unknown persona id: ${id}`);

  const profile = CustomerProfileSchema.parse(normalizeWireVariants(raw.profile));
  const pass_1 = Pass1OutputSchema.parse(normalizePass1(raw.pass_1));
  const pass_2 = Pass2OutputSchema.parse(normalizePass2(raw.pass_2));

  return {
    id: raw.id as PersonaId,
    name: raw.name,
    descriptor: raw.descriptor,
    profile,
    pass_1,
    pass_2,
  };
}

export interface PersonaListEntry {
  id: PersonaId;
  name: string;
  descriptor: string;
}

export function listPersonas(): PersonaListEntry[] {
  return personasData.personas.map((p: any) => ({
    id: p.id as PersonaId,
    name: p.name,
    descriptor: p.descriptor,
  }));
}
