# KYC Tier Decisioning Demo

Three-pass reasoning pipeline demo built as a portfolio asset for Shift Atlas. Read `PRIMARY_PROMPT.md` first.

## Local development

```bash
pnpm install
pnpm dev
```

## Environment variables

Set in **Vercel project environment variables** — never in a local `.env.example` file (paste-over risk per PRIMARY_PROMPT.md §7.7):

- `ANTHROPIC_API_KEY` — server-side only
- `UPSTASH_REDIS_REST_URL` — injected by Vercel Marketplace
- `UPSTASH_REDIS_REST_TOKEN` — injected by Vercel Marketplace
- `ADMIN_STATS_KEY` — secret for `/api/admin/stats` access

Variable names are listed here for documentation; only their values are sensitive and live exclusively in Vercel project env vars.

For local development, create `.env.local` (already in `.gitignore`) with the same keys. Do not commit it.

## Production URL

`kyc.shiftatlas.tech`
