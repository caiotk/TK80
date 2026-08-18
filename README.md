# Kaitiaki Cloud

**Sovereignty-tiered AI managed services for Aotearoa New Zealand.**

Pick your posture — **S**overeign, **R**esident or **G**lobal — and deploy governed AI
landing zones into *your own* cloud account. Every deployment carries a named accountable
guardian and a **Kaitiaki Score** rating how well its configuration honours the data it holds.

## Why now

For the first time, all three sovereignty postures are live in-country:

| Tier | Backend | Status | Jurisdiction |
|---|---|---|---|
| **S — Sovereign** | Catalyst Cloud (Cove sovereign LLMs) | GA, NZ-owned 10+ years | Full NZ jurisdiction, NZISM-aligned |
| **R — Resident** | Azure NZ North (GA Dec 2024) · AWS ap-southeast-6 (GA Sep 2025) | GA, 3 AZs each | In-country, but US CLOUD Act applies |
| **G — Global** | Any hyperscaler region | GA | No residency guarantee |

Google Cloud's Auckland region is announced but not yet GA — tracked in the backend
registry as roadmap only.

The market has bifurcated between data *residency* and data *sovereignty*, and most buyers
don't understand the difference. Both US hyperscalers give you residency, not sovereignty:
because they are US-owned, in-country data remains subject to the US CLOUD Act. The genuinely
sovereign option is Catalyst Cloud — and its **Cove** platform serves curated open-source LLMs
as a managed service on 100% NZ infrastructure, so the sovereign AI inference layer already
exists. This platform orchestrates on top of it; we never front GPUs or compute.

## What's in this repo

- **`src/app`** — the Next.js control-plane portal:
  - **`/`** — posture picker and product overview
  - **`/catalog`** — the workload menu (6 SKUs; Sovereign RAG Assistant is the hero) and backend registry
  - **`/deploy`** — deploy wizard with a **live Kaitiaki Score** that updates as you configure
  - **`/deployments`** — pipeline status view (pending → planning → applying → deployed)
  - **`/api/*`** — catalog, scoring and deployment endpoints
- **`src/lib/kaitiaki.ts`** — the Kaitiaki Score engine: five pillars
  (Whakapapa o te raraunga · Kaitiakitanga · Ngā here ture · Mana raraunga · Aroturuki),
  weights summing to 100, hard violations for taonga/health/official data below Tier S.
  Pure function, fully unit-tested.
- **`infra/modules`** — parameterised Terraform modules per workload per backend
  (Catalyst/OpenStack, Azure NZ North, AWS ap-southeast-6), plus a **governance-baseline**
  module that ships with everything: guardian tags, budget caps and a Terraform-level
  sovereignty gate that fails the plan if taonga data targets a non-sovereign tier.
- **`.github/workflows/deploy-workload.yml`** — the GitOps deployment engine:
  `workflow_dispatch` → fmt/validate/plan against the client's *delegated* account
  (OIDC federation, cross-account roles) → apply gated behind human guardian approval.

## The delegated-account model

The control plane never fronts compute. Workloads deploy into the client's own account via
delegated access — cross-tenant app registration in Entra, cross-account IAM role in AWS,
application credentials in Catalyst. Consumption hits the client's bill; we invoice a
management fee. Prepaid-with-hard-limits is enforced with cloud-native budgets
(Azure Budgets + Policy, AWS Budget Actions, Catalyst quotas).

## Getting started

```bash
npm install
npm test        # Kaitiaki Score engine unit tests
npm run dev     # portal on http://localhost:3000
```

Try it: open **/deploy**, select *Māori data (taonga)* as the classification, then flip the
backend between Catalyst Cloud and Azure NZ North — watch the score, the violation banner
and the grade cap react.

## Roadmap

- **Phase 0 (now):** one hero workload, live scoring, simulated pipeline, in-memory store.
- **Phase 1:** durable store, real Terraform plan/apply per client environment, SSO via
  WorkOS/Entra External ID (MFA at the IdP), consumption metering from Azure Cost
  Management / AWS Cost Explorer / Catalyst billing APIs, Stripe/Xero invoicing.
- **Phase 2:** full self-service catalog, multi-tenant, CSP/reseller billing with true
  prepaid credits and hard stops.

See [`docs/architecture.md`](docs/architecture.md) for the full reference architecture.
