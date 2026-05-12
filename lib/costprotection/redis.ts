// lib/costprotection/redis.ts
// Single Upstash client instance, lazy-initialized.

import { Redis } from '@upstash/redis';
import { requireUpstash } from '@/lib/env';

let _client: Redis | null = null;

export function redis(): Redis {
  if (_client) return _client;
  const { url, token } = requireUpstash();
  _client = new Redis({ url, token });
  return _client;
}

// Test-only override; used by integration tests in Batch 4 and downstream test suites.
export function __setRedisForTest(c: Redis | null) {
  _client = c;
}
