// lib/prompts/inject.ts
// Build-time prompt injection per Decision 35 (PRIMARY_PROMPT.md §4.10).
// Reads the byte-frozen source prompts via Turbopack/Vite raw-text imports
// (no ?raw suffix — Amendment 12) and substitutes content at the M1 markers.
//
// Strips HTML doc-block comments before substitution per Amendment 14 —
// the doc-blocks at the top of each source .md file are developer
// documentation, not prompt content; they stay in source but never reach
// the API call.

import pass1Prompt from '@/prompts/pass_1_system_prompt.md';
import pass2Prompt from '@/prompts/pass_2_system_prompt.md';
import pass3Prompt from '@/prompts/pass_3_system_prompt.md';
import ruleset from '@/ruleset_v1.md';
import { MARKERS } from './markers';

type Pass = 1 | 2 | 3;

interface InjectArgs {
  pass: Pass;
  profile: unknown;
  pass1?: unknown;
  pass2?: unknown;
  orchestration?: { audit_id: string; attempt: number };
}

/**
 * Strip HTML comment blocks from a string. Used to remove developer-facing
 * doc-blocks from prompt source files before they reach the model (Amendment 14).
 * Exported for direct test coverage of edge cases.
 */
export function stripDocComments(text: string): string {
  return text.replace(/<!--[\s\S]*?-->/g, '');
}

function replaceOnce(haystack: string, marker: string, value: string): string {
  const idx = haystack.indexOf(marker);
  if (idx === -1) throw new Error(`Marker not found in source prompt: ${marker.slice(0, 60)}…`);
  if (haystack.indexOf(marker, idx + marker.length) !== -1) {
    throw new Error(`Marker found more than once in source prompt: ${marker.slice(0, 60)}…`);
  }
  return haystack.slice(0, idx) + value + haystack.slice(idx + marker.length);
}

const json = (v: unknown) => JSON.stringify(v, null, 2);

function assertNonEmpty(label: string, content: string) {
  if (!content || content.trim().length === 0) {
    throw new Error(`Injection content is empty: ${label}`);
  }
}

export function injectPrompt(args: InjectArgs): string {
  // Strip doc-blocks from every source before substitution (Amendment 14).
  const cleanRuleset = stripDocComments(ruleset);
  assertNonEmpty('ruleset', cleanRuleset);

  if (args.pass === 1) {
    let out = stripDocComments(pass1Prompt);
    out = replaceOnce(out, MARKERS.ruleset, cleanRuleset);
    out = replaceOnce(out, MARKERS.customer_profile, json(args.profile));
    return out;
  }

  if (args.pass === 2) {
    if (!args.pass1) throw new Error('Pass 2 injection requires pass1 output');
    let out = stripDocComments(pass2Prompt);
    out = replaceOnce(out, MARKERS.ruleset_pass2, cleanRuleset);
    out = replaceOnce(out, MARKERS.pass1_output, json(args.pass1));
    out = replaceOnce(out, MARKERS.customer_profile, json(args.profile));
    return out;
  }

  // pass === 3
  if (!args.pass1) throw new Error('Pass 3 injection requires pass1 output');
  if (!args.pass2) throw new Error('Pass 3 injection requires pass2 output');
  if (!args.orchestration) throw new Error('Pass 3 injection requires orchestration context');
  let out = stripDocComments(pass3Prompt);
  out = replaceOnce(out, MARKERS.ruleset_pass3, cleanRuleset);
  out = replaceOnce(out, MARKERS.customer_profile, json(args.profile));
  out = replaceOnce(out, MARKERS.original_pass1_output, json(args.pass1));
  out = replaceOnce(out, MARKERS.pass2_output, json(args.pass2));
  out = replaceOnce(out, MARKERS.correction_audit_id, `correction_against_audit_id: ${args.orchestration.audit_id}`);
  out = replaceOnce(out, MARKERS.correction_attempt_number, `correction_attempt_number: ${args.orchestration.attempt}`);
  return out;
}
