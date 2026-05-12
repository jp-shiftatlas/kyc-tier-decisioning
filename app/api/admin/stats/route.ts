// app/api/admin/stats/route.ts
// PRIMARY_PROMPT.md §4.8: GET /api/admin/stats?key={env-var-secret}
// Returns the TelemetrySnapshot including redis_unreachable_count_24h
// (Amendment 16 — JP Constraint 3 single coherent failure metric).
//
// Auth contract:
//   - Reject if process.env.ADMIN_STATS_KEY is empty/unset (defensive: prevents
//     accidental key-disabled deploys from exposing telemetry to the world).
//   - Reject if query `key` is missing/empty.
//   - Reject if query `key` does not exactly match the env var.
//   - process.env read directly on each request (NOT captured via serverEnv at
//     module load) so env-var flips in tests/staging take effect immediately.
//
// Cache-Control: no-store on 200 + 401 — proxies/CDN must not serve stale
// telemetry under any path.

import { readTelemetry } from '@/lib/costprotection/telemetry';

export const runtime = 'nodejs';

const NO_STORE_JSON = {
  'content-type': 'application/json',
  'cache-control': 'no-store',
} as const;

function unauthorized(): Response {
  return new Response(JSON.stringify({ error: 'unauthorized' }), {
    status: 401,
    headers: NO_STORE_JSON,
  });
}

export async function GET(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const key = url.searchParams.get('key');
  const adminKey = process.env.ADMIN_STATS_KEY ?? '';
  if (!adminKey || !key || key !== adminKey) {
    return unauthorized();
  }
  const snapshot = await readTelemetry();
  return new Response(JSON.stringify(snapshot), {
    status: 200,
    headers: NO_STORE_JSON,
  });
}
