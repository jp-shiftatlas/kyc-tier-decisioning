# Deploy Notes — Batch 11 Production Cutover

Operational checklist for the Batch 11 production deploy to `kyc.shiftatlas.tech`. Items accumulate during earlier batches; this is where they get parked so the Batch 11 deploy doesn't have to reconstruct them from commit logs.

Each entry: what to do, why, when it was queued.

---

## Pre-deploy operational queue

### Verify rotated Upstash credentials are live in Vercel project env vars

**Why:** April 2026 Vercel/Upstash incident advisory (per Upstash blog: "Using Upstash on Vercel? Rotate Your Secrets After Vercel's April 2026 Incident") recommends credential rotation for any project using Upstash via Vercel Marketplace integration. JP rotated `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in parallel with Batch 4 work — eliminates the failure mode "rotate at production-deploy moment with no prior test surface."

**When to verify:** Before the first production deploy of Batch 11. Confirm via Vercel dashboard → KYC project → Settings → Environment Variables that the rotated values are present in `Production` (and `Preview` if used for the rehearsal smoke run).

**How to verify:** A successful run of `pnpm test:smoke` against the rotated credentials in the Vercel preview environment confirms both that rotation took effect and that the wire-format finding from Batch 4 still holds.

**Queued:** Batch 3 close-out (response to April 2026 advisory surfaced during Batch 3 Task 3.1 web-search verification).

---

## Amendment 3 — DEBUG_MODE cleanup

### Unset `DEBUG_MODE` before production deploy

**Why:** Plan Amendment 3 + Task 4.2 added a `?force_correction=1` query toggle on `/api/decisioning` that flips Pass 2's `correction_required` to `true`, used during Batch 11 rehearsal to exercise the Pass 3 + cap-reached UI paths without depending on the model's non-deterministic correction-triggering behavior. The toggle is gated behind `DEBUG_MODE === 'true'`.

**When to unset:** After Batch 11 rehearsal completes successfully (Pass 3 → re-audit → cap-reached flow observed on Vercel preview) and BEFORE the production deploy command is issued.

**How to verify post-unset:** `curl 'https://kyc.shiftatlas.tech/api/decisioning?pass=2&force_correction=1' ...` should return Pass 2 output with `correction_required` matching the model's native output, NOT artificially forced to `true`. (Or — easier — just confirm the `DEBUG_MODE` env var is absent from production env vars in the Vercel dashboard.)

**Queued:** Plan amendments section (Amendment 3, written at brainstorm phase).

---

## Format for future entries

```markdown
### <short imperative title>

**Why:** <one paragraph rationale>
**When to <verb>:** <which batch / what milestone gates this>
**How to verify:** <command, dashboard check, or test invocation>
**Queued:** <which batch this entry was added during>
```

Keep entries surgical. This is an action list, not a design log — for architectural rationale, see `docs/design-decisions.md`.
