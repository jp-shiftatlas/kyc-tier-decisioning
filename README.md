# KYC Tier Decisioning Demo

A live web demonstration of a three-pass AI reasoning pipeline for KYC (Know Your Customer) tier decisioning, aligned with Philippine regulatory anchors: BSP MORB §921 (general CDD), §923 (PEP-EDD), Circular 1170 (electronic KYC), and Circular 1230 (PHP 1M structuring threshold).

**Live demo:** [kyc.shiftatlas.tech](https://kyc.shiftatlas.tech)

---

## What this is

A methodology demonstration — not a product, not a SaaS, not for sale.

The demo takes a customer profile (synthetic; never real customer data) and walks the viewer through three sequential reasoning passes against an Anthropic API model:

- **Pass 1** generates a tier recommendation with examiner-grade narrative rationale.
- **Pass 2** audits the Pass 1 output against the full 25-rule ruleset.
- **Pass 3** conditionally corrects Pass 1 when audit catches material flaws, followed by re-audit.

The pipeline is wrapped in an institutional-register UI built for Philippine bank compliance officers and BFSI tech leaders. The architecture footer answers the data-residency and DPA questions a bank's compliance team would ask in a discovery call without needing prompting.

## What this isn't

This is **not** software you can buy, license, or self-deploy at a bank. The ruleset, prompts, and persona outputs in this repository are *illustrative* — they show how the pattern works, not a turnkey deployment for any specific institution.

Production deployment requires institution-specific adaptation:

- **Ruleset calibration** to the bank's actual risk appetite and CDD policy
- **Regulatory mapping** against the bank's existing AML/CFT framework and BSP licensing posture
- **Data-residency design** under the Data Privacy Act and BSP outsourcing rules
- **Pipeline integration** with the bank's existing case management, KYC vendor stack, and audit trail systems
- **Governance design** under NPC Advisory 2024-04 and the bank's AI governance committee

That's the consulting engagement. This repo is the methodology evidence.

## Why it's public

Three reasons.

First, the value of this work lives in *judgment*, not artifacts. A bank doesn't engage Shift Atlas for the ruleset — the ruleset is the starting point of a conversation, not the deliverable. The engagement is the conversation that adapts it to *that specific bank's* risk appetite, regulatory exposure, and operational reality.

Second, the commit history is part of the demonstration. The repository was built across eleven batches with explicit brainstorm → plan → execute → review discipline (using Anthropic's Claude Code with the Superpowers plugin); the full Batch 0 through Batch 10.4 commit narrative is preserved here as evidence of the methodology in action. A prospect or peer engineer can audit not just the result but the work that produced it.

Third, it's an honest record of what AI-collaborative engineering actually looks like. This entire codebase was built in collaboration with Anthropic's Claude — Claude Code for execution and Claude.ai as a separate strategic-review layer for plan validation and drift-catching. Reading this repository — the schemas, the spec-walk discipline, the regulatory anchoring, the visual register decisions, the eleven-batch execution plan with checkpoints — should make clear what the actual work looks like: not gatekept by credentials, but also not effortless. The tools amplify whatever judgment, domain knowledge, and patience the operator brings.

## Architecture

- **Frontend:** Next.js 16 (App Router) deployed on Vercel
- **Backend:** Vercel serverless functions calling the Anthropic API
- **Models:** Claude Sonnet 4.6 for all three passes
- **Cost protection:** Upstash Redis-backed L1 (rate limit per session) and L3 (global cap) protection
- **Schemas:** Zod-enforced at every trust boundary
- **Testing:** Vitest unit + Playwright e2e
- **Build discipline:** Claude Code via Superpowers (brainstorm → write-plan → execute-plan → debug → code-review)

The architecture footer in the demo summarizes this for non-technical viewers in a single horizontal strip.

## License

CC BY-NC 4.0 — see [`LICENSE`](./LICENSE) for full terms.

Short version: free to study, share, and adapt for non-commercial purposes with attribution. Commercial use — including production deployment at a financial institution, derivative consulting engagements, or white-label use — requires a separate agreement.

## Contact

**JP Reyes / Shift Atlas**
Independent AI and operations consulting practice.
Engineer first. Executive second.

- Site: [shiftatlas.tech](https://shiftatlas.tech)
- Other demos: [shiftatlas-tools](https://github.com/jp-shiftatlas/shiftatlas-tools)
- Email: connect@shiftatlas.tech
- Book a discovery call: [calendly.com/jp-shiftatlas/20min](https://calendly.com/jp-shiftatlas/20min)
- LinkedIn: [john-paul-reyes-aiops](https://linkedin.com/in/john-paul-reyes-aiops)
