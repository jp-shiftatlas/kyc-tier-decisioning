// lib/env.ts
// Server-side env access. PRIMARY_PROMPT.md §7.2: ANTHROPIC_API_KEY is server-only.
// Upstash env-var names confirmed match Vercel Marketplace integration defaults (verified 2026-05-12).

export const serverEnv = {
  ANTHROPIC_API_KEY: process.env.ANTHROPIC_API_KEY ?? '',
  UPSTASH_REDIS_REST_URL: process.env.UPSTASH_REDIS_REST_URL ?? '',
  UPSTASH_REDIS_REST_TOKEN: process.env.UPSTASH_REDIS_REST_TOKEN ?? '',
  ADMIN_STATS_KEY: process.env.ADMIN_STATS_KEY ?? '',
};

export function requireAnthropicKey(): string {
  const k = process.env.ANTHROPIC_API_KEY;
  if (!k) throw new Error('ANTHROPIC_API_KEY not set — configure in Vercel project env vars (PRIMARY_PROMPT.md §7.2)');
  return k;
}

export function requireUpstash(): { url: string; token: string } {
  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) {
    throw new Error('Upstash credentials missing — configure via Vercel Marketplace integration (PRIMARY_PROMPT.md §4.8)');
  }
  return { url, token };
}
