# Deployment & Infrastructure Guide

This app currently runs on **Vercel + Supabase** as a working prototype. This
document lists the concrete infrastructure requirements so the team can
re-host it on **Azure** (or any other cloud) via CI/CD. Nothing in the code
is Vercel-locked; the migration is a matter of choosing Azure equivalents.

---

## Runtime requirements

| Need | Minimum |
| --- | --- |
| Language | Node.js **24 LTS** |
| Framework | Next.js **16** (App Router, Turbopack) |
| Execution model | Server-rendered + long-running serverless functions (up to **300s timeout**) |
| Cold start | Should tolerate ~1–2s |
| Memory | 1–2 GB per function instance |
| Outbound network | Must reach Google News, Reddit, Hugging Face, Supabase (or DB equivalent), optionally Apify + OpenAI |

## Database requirements

The app uses PostgreSQL through the **Supabase JS client**. Schema is in
`supabase-schema.sql` — one-shot DDL, four tables, RLS enabled with
public-read / service-role-write policies.

Two migration paths:

### Option 1 — Keep Supabase (easiest)

Supabase is cloud-agnostic. Point Azure-hosted Next.js at the existing
Supabase project via env vars; no code changes needed.

### Option 2 — Move to Azure Database for PostgreSQL Flexible Server

Requires swapping the data layer:

1. Provision an Azure Postgres Flexible Server
2. Apply `supabase-schema.sql` (strip the `CREATE POLICY` / RLS lines —
   those are Supabase-specific; enforce access via app-level roles instead)
3. Replace `lib/supabase.ts` with a `pg` or Drizzle client against Azure
   Postgres. All tables, columns, indexes remain identical. Only the
   query API changes.
4. Use Azure Managed Identity for passwordless DB auth in production
5. Network: Private endpoint + VNet integration for the Next.js runtime

## Cron requirements

Two scheduled HTTP calls are needed (currently defined in `vercel.json`):

| Path | Schedule (UTC) | Purpose |
| --- | --- | --- |
| `GET /api/scan` | `0 6 * * *` | Daily topic radar refresh |
| `GET /api/amplification/scan` | `30 6 * * *` | Daily controversy watch |

Azure equivalents:

- **Azure Functions with Timer Trigger** calling the public HTTP endpoint
- **Azure Container Apps jobs** with a cron schedule running `curl`
- **GitHub Actions scheduled workflow** with `cron:` and a curl step
- **Azure Logic App** recurrence trigger → HTTP action

Both endpoints are SSE streams but tolerate up to 300 seconds and return a
final `complete` event the scheduler can ignore; a simple GET is enough.

## Hosting options on Azure

| Target | Fit | Notes |
| --- | --- | --- |
| **Azure Container Apps** | ✅ best | Native Next.js standalone Docker image, auto-scale, cron jobs |
| **Azure App Service (Linux, Node 24)** | ✅ good | Simpler, slightly less flexible than ACA |
| **Azure Static Web Apps** | ❌ not suitable | Next.js API routes + 300s functions + SSE streams exceed SWA limits |

For the first port, **App Service** is usually the shortest path. If
throughput scales up later, move to Container Apps.

### Next.js standalone build for Docker

Add to `next.config.ts` when building for container deploy:

```ts
const config = { output: 'standalone' };
export default config;
```

Sample `Dockerfile`:

```dockerfile
FROM node:24-alpine AS build
WORKDIR /app
COPY package*.json ./
RUN npm ci
COPY . .
RUN npm run build

FROM node:24-alpine AS runtime
WORKDIR /app
ENV NODE_ENV=production
COPY --from=build /app/.next/standalone ./
COPY --from=build /app/.next/static ./.next/static
COPY --from=build /app/public ./public
EXPOSE 3000
CMD ["node", "server.js"]
```

## Environment variables

All required / optional vars are documented in the README. For Azure:

1. Store secrets in **Azure Key Vault**
2. Reference them from App Service / Container Apps via `@Microsoft.KeyVault(...)`
   syntax — the runtime pulls values on startup
3. Non-secrets (e.g. `USE_FINBERT=true`) can go in app settings directly

| Variable | Status | Source on Azure |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | required (or Azure DB conn string) | Key Vault |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | required | Key Vault |
| `SUPABASE_SERVICE_ROLE_KEY` | required | Key Vault |
| `USE_FINBERT` | optional | App setting |
| `HF_TOKEN` | optional | Key Vault |
| `APIFY_TOKEN` | optional, paid tier | Key Vault |
| `OPENAI_API_KEY` | optional, paid tier | Key Vault |

## Sample GitHub Actions workflow (deploy to Azure App Service)

Template only — the team should adapt to their branching model and Azure
naming.

```yaml
# .github/workflows/azure-deploy.yml
name: Deploy to Azure App Service

on:
  push:
    branches: [master]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - uses: actions/setup-node@v4
        with:
          node-version: '24'
          cache: 'npm'

      - run: npm ci
      - run: npm run build

      - name: Azure login
        uses: azure/login@v2
        with:
          creds: ${{ secrets.AZURE_CREDENTIALS }}

      - name: Deploy to App Service
        uses: azure/webapps-deploy@v3
        with:
          app-name: kgmedia-prediction-algo
          package: .
```

## Sample GitHub Actions workflow (daily crons)

```yaml
# .github/workflows/cron.yml
name: Daily scans

on:
  schedule:
    - cron: '0 6 * * *'    # topic radar
    - cron: '30 6 * * *'   # amplification

jobs:
  ping:
    runs-on: ubuntu-latest
    steps:
      - name: Trigger topic scan
        if: github.event.schedule == '0 6 * * *'
        run: curl -fsSL "${{ secrets.APP_URL }}/api/scan" > /dev/null

      - name: Trigger amplification scan
        if: github.event.schedule == '30 6 * * *'
        run: curl -fsSL "${{ secrets.APP_URL }}/api/amplification/scan" > /dev/null
```

## Files to review / replace during migration

| File | Vercel-specific? | Action |
| --- | --- | --- |
| `vercel.json` | yes | Translate cron section to Azure equivalent, then delete |
| `next.config.ts` | no | Add `output: 'standalone'` for Docker deploys |
| `lib/supabase.ts` | yes (if moving off Supabase) | Replace with Azure Postgres client |
| `supabase-schema.sql` | partial | Keep DDL; drop RLS policies if moving off Supabase |
| `app/api/scan/route.ts` | `maxDuration = 300` is Vercel-specific; on Azure, set timeout at the platform level instead |
| `app/api/amplification/scan/route.ts` | same as above |
| `lib/apify.ts`, `lib/embeddings.ts` | no | Pure HTTP clients, no changes needed |

## Pre-migration checklist

- [ ] Azure Postgres provisioned (or keep Supabase)
- [ ] Database schema applied
- [ ] Azure Key Vault populated with env vars
- [ ] Container Apps / App Service provisioned with Node 24
- [ ] Image pushed to Azure Container Registry (if Container Apps)
- [ ] GitHub Actions `AZURE_CREDENTIALS` secret configured
- [ ] Custom domain bound, HTTPS enforced
- [ ] Cron triggers configured (Azure Functions / GH Actions schedule)
- [ ] Smoke test: `GET /api/topics` returns 200 with data
- [ ] Smoke test: `GET /api/amplification` returns `alert_count` field
- [ ] Manual `Scan Now` tested on `/` and `/amplification`

## What this app does (one-paragraph summary for reviewers)

A Next.js 16 dashboard that ingests Indonesian news RSS feeds (Kompas.com
sections, Kompas TV, Grid.id, Kontan, Tribunnews, Reddit, etc.), scores
headline sentiment with VADER or Hugging Face models (FinBERT for English,
IndoBERT for Indonesian), and computes per-topic trend slopes to flag
escalating stories. A separate `/amplification` pipeline watches Google
News and Reddit for controversy-trigger terms co-occurring with the Kompas
brands and clusters results; a cluster with 3+ distinct sources within 24h
fires a red-pulsing alert on the main dashboard. Scaffolding for paid
TikTok/Instagram/Threads/Facebook/X coverage via Apify and OpenAI
embeddings is already in place and activates when `APIFY_TOKEN` and
`OPENAI_API_KEY` are set.
