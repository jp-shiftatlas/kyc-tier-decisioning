# Deploy Notes — Batch 11 Production Cutover

Operational checklist for the Batch 11 production deploy to `kyc.shiftatlas.tech`. Items accumulate during earlier batches; this is where they get parked so the Batch 11 deploy doesn't have to reconstruct them from commit logs.

Each entry: what to do, why, when it was queued.

---

## Pre-deploy operational queue

### Provision Vercel project

**Why:** No Vercel project exists yet — the build is local-only through Batch 10. Batch 11 cuts over to Vercel deployment at `kyc.shiftatlas.tech`.

**When to do:** Early Batch 11, before the first preview deploy.

**How to do:** Vercel dashboard → New Project → import the GitHub repo → set framework preset to Next.js 16 → configure custom domain `kyc.shiftatlas.tech` per PRIMARY_PROMPT.md §7.

**Queued:** Batch 4 close-out (deploy-notes correction round).

### Upstash database — credentials and env-var configuration

**Why:** Upstash database `wired-drake-102218` is provisioned in `ap-southeast-1` (Singapore), free tier. Credentials issued post-April-2026 advisory, so no pre-deploy rotation is needed. The Vercel project (when provisioned per the preceding entry) needs the credentials threaded into its env vars before any deploy can reach the cost-protection layer.

**When to verify:** When the Vercel project is provisioned. Update `UPSTASH_REDIS_REST_URL` and `UPSTASH_REDIS_REST_TOKEN` in the Vercel project env vars (Production scope, optionally Preview if used for the rehearsal smoke run).

**How to verify:** A successful run of `pnpm test:smoke` against the configured credentials confirms both that the env vars are wired correctly and that the wire-format finding from Batch 4 (see `docs/design-decisions.md` Build Findings Log) still holds.

**Queued:** Batch 3 close-out, scope corrected at Batch 4 close-out — original entry framed credentials as requiring rotation per April 2026 advisory; correct framing is that the database was provisioned recently with post-advisory credentials, so no rotation is needed.

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
