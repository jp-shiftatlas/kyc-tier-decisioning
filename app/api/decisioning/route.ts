// app/api/decisioning/route.ts
// PRIMARY_PROMPT.md §4.9 (Decision 32): single Vercel serverless route,
// per-pass POSTs branched by ?pass=N.
// PRIMARY_PROMPT.md §4.8 (Decision 33): cost protection (L1 rate-limit +
// L3 kill-switch) executes BEFORE pass dispatch — failing fast on throttle
// or cap avoids incurring API cost on requests that would be denied anyway.
//
// Addition 2 — rate-limit response headers (X-RateLimit-Limit / Remaining /
// Reset) emitted on every response, sourced directly from
// checkRateLimit() return values (which pass through @upstash/ratelimit's
// Ratelimit.limit() result). Browser dev-tools visibility during
// discovery-call demos — bank-engineer credibility signal.
// Fail-open path (rl.count === null per Constraint 3) omits the headers
// to avoid emitting NaN/null literals.
//
// Amendment 3 — DEBUG_MODE + ?force_correction=1 toggle injects
// correction_required: true on Pass 2 responses, gated behind env var.
// Used during Batch 11 rehearsal of the Pass 3 + cap-reached path.
// Unset DEBUG_MODE before production deploy.

import { z } from 'zod';
import { CustomerProfileSchema } from '@/lib/schemas/customerProfile';
import { Pass1OutputSchema } from '@/lib/schemas/pass1';
import { Pass2OutputSchema } from '@/lib/schemas/pass2';
import { Pass3OutputSchema } from '@/lib/schemas/pass3';
import type { DecisioningError } from '@/lib/schemas/apiError';
import { ERROR_MESSAGES } from '@/lib/schemas/apiError';
import { injectPrompt } from '@/lib/prompts/inject';
import { callPass } from '@/lib/anthropic/client';
import {
  checkRateLimit,
  RATE_LIMIT_HOURLY,
} from '@/lib/costprotection/rateLimit';
import { checkKillSwitch } from '@/lib/costprotection/killSwitch';
import { incrementCounter } from '@/lib/costprotection/telemetry';

// runtime = 'nodejs' (Anthropic SDK requires nodejs; not compatible with edge).
export const runtime = 'nodejs';

const PassQuerySchema = z.union([
  z.literal('1'),
  z.literal('2'),
  z.literal('3'),
]);

const RequestBodySchema = z.object({
  profile: z.unknown(),
  pass1: z.unknown().optional(),
  pass2: z.unknown().optional(),
  orchestration: z
    .object({
      audit_id: z.string(),
      attempt: z.number().int().positive(),
    })
    .optional(),
});

function getIp(req: Request): string {
  const fwd = req.headers.get('x-forwarded-for');
  if (fwd) return fwd.split(',')[0].trim();
  return '0.0.0.0';
}

function makeError(
  pass: 1 | 2 | 3 | 're-audit',
  errorType: DecisioningError['errorType'],
  message: string,
  retryable: boolean,
  zodIssues?: unknown[],
): DecisioningError {
  return {
    pass,
    errorType,
    message,
    retryable,
    ...(zodIssues ? { zodIssues } : {}),
  };
}

/**
 * Addition 2 — build rate-limit response headers from checkRateLimit()
 * return values. Fail-open path (count/remaining/reset all null) omits
 * the headers entirely to avoid emitting NaN/null literals in numeric
 * HTTP header positions.
 */
function buildRateLimitHeaders(rl: {
  count: number | null;
  remaining: number | null;
  reset: number | null;
}): Record<string, string> {
  if (rl.remaining === null || rl.reset === null) {
    // Fail-open: headers omitted. Dev-tools renders "absent" cleanly;
    // emitting "NaN" or "null" would mislead.
    return {};
  }
  return {
    'X-RateLimit-Limit': String(RATE_LIMIT_HOURLY),
    'X-RateLimit-Remaining': String(rl.remaining),
    'X-RateLimit-Reset': String(rl.reset),
  };
}

export async function POST(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const rawPass = url.searchParams.get('pass');
  const passResult = PassQuerySchema.safeParse(rawPass);

  // Helper: builds a Response with content-type + rate-limit headers merged in.
  // Defined here so rate-limit-header context can be threaded through every
  // response without restructuring the code. `extraHeaders` is the merged-in
  // rate-limit header bag; empty {} for early-fail paths that run before the
  // rate-limit check.
  const respond = (
    body: unknown,
    status: number,
    extraHeaders: Record<string, string> = {},
  ): Response =>
    new Response(JSON.stringify(body), {
      status,
      headers: { 'content-type': 'application/json', ...extraHeaders },
    });

  if (!passResult.success) {
    // Pass parameter invalid — no point running rate-limit; bad request shape.
    // Headers omitted (we haven't checked rate-limit yet).
    return respond(
      makeError(
        1,
        'validation_failed',
        'Invalid pass parameter; expected 1, 2, or 3.',
        true,
      ),
      400,
    );
  }
  const pass = Number(passResult.data) as 1 | 2 | 3;

  // Parse body BEFORE rate-limit check so malformed JSON doesn't burn a
  // rate-limit token. Decision 33 ordering puts cost-protection before
  // API-cost work; body-shape validation is free, so it can precede.
  let body: z.infer<typeof RequestBodySchema>;
  try {
    body = RequestBodySchema.parse(await req.json());
  } catch (e: unknown) {
    const issues = (e as { issues?: unknown[] })?.issues;
    return respond(
      makeError(
        pass,
        'validation_failed',
        'Malformed request body.',
        true,
        issues,
      ),
      400,
    );
  }

  // ─── Cost protection — Decision 33 ordering ──────────────────────────────
  // L1 rate-limit → L3 kill-switch → API dispatch. Both fail BEFORE incurring
  // any Anthropic API cost. Headers from L1 propagate to every subsequent
  // response (Addition 2).
  const ip = getIp(req);
  const rl = await checkRateLimit(ip);
  const rlHeaders = buildRateLimitHeaders(rl);

  if (!rl.allowed) {
    await incrementCounter('rate_limit_hits');
    const msg =
      rl.reason === 'hourly'
        ? ERROR_MESSAGES.rate_limited_hourly
        : ERROR_MESSAGES.rate_limited_daily;
    return respond(
      makeError(pass, 'rate_limited', msg, false),
      429,
      rlHeaders,
    );
  }

  const ks = await checkKillSwitch();
  if (!ks.allowed) {
    await incrementCounter('kill_switch_triggers');
    return respond(
      makeError(pass, 'cap_reached', ERROR_MESSAGES.cap_reached, false),
      429,
      rlHeaders,
    );
  }

  // ─── Profile validation ──────────────────────────────────────────────────
  const profileResult = CustomerProfileSchema.safeParse(body.profile);
  if (!profileResult.success) {
    await incrementCounter('error_counts');
    return respond(
      makeError(
        pass,
        'validation_failed',
        'Customer profile failed validation.',
        true,
        profileResult.error.issues as unknown[],
      ),
      400,
      rlHeaders,
    );
  }

  // ─── Pass dispatch ───────────────────────────────────────────────────────
  let result;
  if (pass === 1) {
    const systemPrompt = injectPrompt({
      pass: 1,
      profile: profileResult.data,
    });
    result = await callPass({
      pass: 1,
      systemPrompt,
      userMessage:
        'Produce the Pass 1 output JSON per the system prompt schema.',
      schema: Pass1OutputSchema,
    });
  } else if (pass === 2) {
    if (!body.pass1) {
      return respond(
        makeError(
          2,
          'validation_failed',
          'Pass 2 requires pass1 in body.',
          true,
        ),
        400,
        rlHeaders,
      );
    }
    const systemPrompt = injectPrompt({
      pass: 2,
      profile: profileResult.data,
      pass1: body.pass1,
    });
    result = await callPass({
      pass: 2,
      systemPrompt,
      userMessage:
        'Produce the Pass 2 audit JSON per the system prompt schema.',
      schema: Pass2OutputSchema,
    });
  } else {
    if (!body.pass1 || !body.pass2 || !body.orchestration) {
      return respond(
        makeError(
          3,
          'validation_failed',
          'Pass 3 requires pass1, pass2, and orchestration context.',
          true,
        ),
        400,
        rlHeaders,
      );
    }
    const systemPrompt = injectPrompt({
      pass: 3,
      profile: profileResult.data,
      pass1: body.pass1,
      pass2: body.pass2,
      orchestration: body.orchestration,
    });
    result = await callPass({
      pass: 3,
      systemPrompt,
      userMessage:
        'Produce the Pass 3 correction JSON per the system prompt schema.',
      schema: Pass3OutputSchema,
    });
  }

  await incrementCounter('live_runs');

  if (!result.ok) {
    await incrementCounter('error_counts');
    const status =
      result.error.errorType === 'malformed_model_json' ||
      result.error.errorType === 'upstream_timeout'
        ? 502
        : 400;
    return respond(result.error, status, rlHeaders);
  }

  // Plan amendment #3 — DEBUG_MODE + ?force_correction=1 toggle.
  // On Pass 2 requests, when both env var AND query param are set,
  // overwrite the model's correction_required field to true so the
  // client-side state machine takes the Pass 3 + re-audit + cap-reached
  // path. Used during Batch 11 rehearsal only — unset DEBUG_MODE
  // before production deploy.
  if (
    pass === 2 &&
    process.env.DEBUG_MODE === 'true' &&
    url.searchParams.get('force_correction') === '1'
  ) {
    return respond(
      { ...(result.data as object), correction_required: true },
      200,
      rlHeaders,
    );
  }

  return respond(result.data, 200, rlHeaders);
}
