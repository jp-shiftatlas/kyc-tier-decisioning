# Smoke tests (real Upstash)

Excluded from `pnpm test`. Run with real Upstash credentials:

```bash
INTEGRATION=real \
UPSTASH_REDIS_REST_URL=https://your-real-instance.upstash.io \
UPSTASH_REDIS_REST_TOKEN=your-real-token \
corepack pnpm test:smoke
```

Or simply `corepack pnpm test:smoke` if those env vars are already in your shell.

## Current smoke tests

- `upstash-wire-format.smoke.test.ts` — resolves Build Finding from Batch 4:
  does Upstash return numbers or numeric strings from `incr`/`get`/`mget`?
  Read the `[wire-format]` console output, then update `docs/design-decisions.md`
  with the answer.
