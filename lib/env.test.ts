import { describe, it, expect, vi, beforeEach } from 'vitest';

describe('env', () => {
  beforeEach(() => {
    vi.resetModules();
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.UPSTASH_REDIS_REST_URL = 'https://example.upstash.io';
    process.env.UPSTASH_REDIS_REST_TOKEN = 'test-token';
    process.env.ADMIN_STATS_KEY = 'test-admin';
  });

  it('exports required server env vars', async () => {
    const { serverEnv } = await import('./env');
    expect(serverEnv.ANTHROPIC_API_KEY).toBe('test-key');
    expect(serverEnv.UPSTASH_REDIS_REST_URL).toBe('https://example.upstash.io');
    expect(serverEnv.UPSTASH_REDIS_REST_TOKEN).toBe('test-token');
    expect(serverEnv.ADMIN_STATS_KEY).toBe('test-admin');
  });

  it('throws on missing ANTHROPIC_API_KEY when read', async () => {
    delete process.env.ANTHROPIC_API_KEY;
    const { requireAnthropicKey } = await import('./env');
    expect(() => requireAnthropicKey()).toThrow(/ANTHROPIC_API_KEY/);
  });
});
