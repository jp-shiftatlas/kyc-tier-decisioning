// lib/anthropic/client.ts
// Anthropic SDK wrapper: makes one /v1/messages call per pass, parses + validates,
// returns Result<T, DecisioningError>.
//
// Verified against @anthropic-ai/sdk@0.95.2, model claude-sonnet-4-6 confirmed current
// (PRIMARY_PROMPT.md §4.5 + §8.1, 2026-05-12). Sonnet 4.6 released 2026-02-15 and remains
// the active mid-tier model on the Claude Platform.
// MODEL_ID is locked to claude-sonnet-4-6 — the four locked personas (Maria, Carlos,
// persona_c, persona_d) were generated against this model. Changing the model invalidates
// the persona lockfile.

import Anthropic from '@anthropic-ai/sdk';
import type { ZodSchema } from 'zod';
import { requireAnthropicKey } from '@/lib/env';
import type { DecisioningError } from '@/lib/schemas/apiError';

export const MODEL_ID = 'claude-sonnet-4-6';

interface AnthropicLike {
  messages: {
    create: (args: any) => Promise<any>;
  };
}

let _client: AnthropicLike | null = null;
function client(): AnthropicLike {
  if (_client) return _client;
  _client = new Anthropic({ apiKey: requireAnthropicKey() }) as unknown as AnthropicLike;
  return _client;
}

export type ParseResult<T> = { ok: true; data: T } | { ok: false; error: DecisioningError };

export function parseModelJson<T>(raw: string, schema: ZodSchema<T>, pass: 1 | 2 | 3 | 're-audit'): ParseResult<T> {
  const stripped = raw.trim().replace(/^```(?:json)?\s*\n?/, '').replace(/\n?```\s*$/, '');
  let parsed: unknown;
  try {
    parsed = JSON.parse(stripped);
  } catch {
    return {
      ok: false,
      error: { pass, errorType: 'malformed_model_json', message: 'Model output was not valid JSON.', retryable: true },
    };
  }
  const result = schema.safeParse(parsed);
  if (!result.success) {
    return {
      ok: false,
      error: {
        pass,
        errorType: 'validation_failed',
        zodIssues: result.error.issues as any,
        message: 'Model output did not match the expected schema.',
        retryable: true,
      },
    };
  }
  return { ok: true, data: result.data };
}

export interface CallPassArgs<T> {
  pass: 1 | 2 | 3 | 're-audit';
  systemPrompt: string;
  userMessage: string;
  schema: ZodSchema<T>;
  maxTokens?: number;
  /** Test-only injection seam. */
  _injectClient?: AnthropicLike;
}

export async function callPass<T>(args: CallPassArgs<T>): Promise<ParseResult<T>> {
  const c = args._injectClient ?? client();
  try {
    const resp = await c.messages.create({
      model: MODEL_ID,
      max_tokens: args.maxTokens ?? 8000,
      system: args.systemPrompt,
      messages: [{ role: 'user', content: args.userMessage }],
    });
    const text = (resp.content ?? [])
      .filter((b: any) => b.type === 'text')
      .map((b: any) => b.text)
      .join('');
    return parseModelJson(text, args.schema, args.pass);
  } catch (err: any) {
    if (err?.name === 'AbortError' || /timeout/i.test(err?.message ?? '')) {
      return { ok: false, error: { pass: args.pass, errorType: 'upstream_timeout', message: 'Upstream model request timed out.', retryable: true } };
    }
    return { ok: false, error: { pass: args.pass, errorType: 'upstream_timeout', message: `Upstream error: ${err?.message ?? 'unknown'}`, retryable: true } };
  }
}
