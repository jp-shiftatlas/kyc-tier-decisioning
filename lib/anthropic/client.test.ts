import { describe, it, expect, vi, beforeEach } from 'vitest';
import { callPass, parseModelJson } from './client';
import type { ZodSchema } from 'zod';
import { z } from 'zod';

// Mock the SDK at module level
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: class FakeAnthropic {
      messages = {
        create: vi.fn(),
      };
    },
  };
});

describe('parseModelJson', () => {
  const Schema = z.object({ foo: z.string() });

  it('parses a clean JSON response', () => {
    const result = parseModelJson('{"foo":"bar"}', Schema, 1);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.data.foo).toBe('bar');
  });

  it('strips a leading code fence', () => {
    const result = parseModelJson('```json\n{"foo":"bar"}\n```', Schema, 1);
    expect(result.ok).toBe(true);
  });

  it('returns malformed_model_json on non-JSON', () => {
    const result = parseModelJson('not json', Schema, 1);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errorType).toBe('malformed_model_json');
  });

  it('returns validation_failed when JSON parses but schema rejects', () => {
    const result = parseModelJson('{"baz":1}', Schema, 2);
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errorType).toBe('validation_failed');
  });
});

describe('callPass', () => {
  beforeEach(() => { process.env.ANTHROPIC_API_KEY = 'test'; });

  it('returns parsed output on success', async () => {
    const Schema = z.object({ ok: z.boolean() });
    const result = await callPass({
      pass: 1,
      systemPrompt: 'sys',
      userMessage: 'user',
      schema: Schema,
      _injectClient: { messages: { create: async () => ({ content: [{ type: 'text', text: '{"ok":true}' }] }) } } as any,
    });
    expect(result.ok).toBe(true);
  });

  it('maps upstream timeout to DecisioningError', async () => {
    const Schema = z.object({ ok: z.boolean() });
    const result = await callPass({
      pass: 1,
      systemPrompt: 'sys',
      userMessage: 'user',
      schema: Schema,
      _injectClient: { messages: { create: async () => { const e: any = new Error('timeout'); e.name = 'AbortError'; throw e; } } } as any,
    });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.errorType).toBe('upstream_timeout');
  });
});
