# Deployment & Infrastructure Guide — AWS

This is the AWS equivalent of [DEPLOYMENT.md](./DEPLOYMENT.md) (which targets
Azure). Use this file when the chosen cloud is AWS. Nothing in the app is
Azure-specific either, so the code ports cleanly.

---

## Runtime requirements

| Need | Minimum |
| --- | --- |
| Language | Node.js **24 LTS** |
| Framework | Next.js **16** (App Router, Turbopack) |
| Execution model | Server-rendered + long-running serverless/container functions (up to **300s timeout**) |
| Cold start | Should tolerate ~1–2s |
| Memory | 1–2 GB per function instance |
| Outbound network | Must reach Google News, Reddit, Hugging Face, the database host, optionally Apify + OpenAI |

## Database requirements

The app uses PostgreSQL through the **Supabase JS client**. Schema is in
`supabase-schema.sql` — one-shot DDL, four tables, RLS enabled with
public-read / service-role-write policies.

Two migration paths:

### Option 1 — Keep Supabase (easiest)

Supabase is cloud-agnostic. Point AWS-hosted Next.js at the existing
Supabase project via env vars; no code changes needed.

### Option 2 — Move to Amazon RDS / Aurora PostgreSQL

Requires swapping the data layer:

1. Provision **Amazon RDS for PostgreSQL 15+** (or **Aurora PostgreSQL
   Serverless v2** for auto-scaling)
2. Apply `supabase-schema.sql` (strip the `CREATE POLICY` / RLS lines —
   those are Supabase-specific; enforce access via app-level roles instead)
3. Replace `lib/supabase.ts` with a `pg` or Drizzle client against RDS.
   All tables, columns, indexes remain identical. Only the query API
   changes.
4. Use **IAM database authentication** for passwordless DB auth from the
   compute layer
5. Network: place the DB in a private subnet; attach the Next.js runtime
   to the same VPC

## Cron requirements

Two scheduled HTTP calls are needed (currently defined in `vercel.json`):

| Path | Schedule (UTC) | Purpose |
| --- | --- | --- |
| `GET /api/scan` | `0 6 * * *` | Daily topic radar refresh |
| `GET /api/amplification/scan` | `30 6 * * *` | Daily controversy watch |

AWS equivalents:

- **Amazon EventBridge Scheduler** with a cron expression — the
  recommended primary mechanism. Can invoke a Lambda, or call an HTTP
  endpoint directly via **API Destinations**.
- **Amazon EventBridge Rules** (older API; still works)
- **Lambda function** triggered by EventBridge, issuing `fetch()` to the
  public URL
- **ECS Scheduled Tasks** (if you're already on ECS/Fargate)
- **GitHub Actions scheduled workflow** with `cron:` and a curl step
  (simplest if you don't want to add AWS infra just for the cron)

Both endpoints are SSE streams but tolerate up to 300 seconds and return a
final `complete` event the scheduler can ignore; a simple GET is enough.

## Hosting options on AWS

| Target | Fit | Notes |
| --- | --- | --- |
| **AWS Amplify Hosting** | ✅ best for managed Next.js | Native App Router / SSR / API routes support; built-in CI/CD from GitHub |
| **AWS App Runner** | ✅ good for containers | Easy managed runtime, autoscaling, from Dockerfile or ECR image |
| **ECS on Fargate** | ✅ good for control | More setup, more flexibility; pair with ALB |
| **Elastic Beanstalk** | ⚠️ legacy | Works but less recommended now |
| **Lambda via OpenNext / SST** | ⚠️ advanced | Serverless Next.js; works well but more moving parts |

For the first port, **AWS Amplify Hosting** is usually the shortest path
— it handles Next.js builds, SSR, env vars, preview branches, and HTTPS
with one GitHub connection. If the team prefers Docker/container workflow,
go with **App Runner**; if they need deeper VPC/networking control, go
with **ECS Fargate**.

### Next.js standalone build for Docker (App Runner / ECS / Fargate)

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

Image goes to **Amazon ECR**; App Runner / ECS pulls from there.

## Environment variables

All required / optional vars are documented in the README. For AWS:

1. Store secrets in **AWS Secrets Manager** (supports rotation) or **SSM
   Parameter Store (SecureString)** (cheaper)
2. For Amplify Hosting: add env vars directly in the Amplify console; it
   can reference Secrets Manager with the `secret:` prefix
3. For App Runner / ECS: reference secrets in the task / service
   definition; values are injected as env vars at runtime
4. IAM: the compute layer's execution role needs
   `secretsmanager:GetSecretValue` or `ssm:GetParameter` permission

| Variable | Status | Source on AWS |
| --- | --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | required (or RDS conn string) | Secrets Manager / SSM |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | required | Secrets Manager / SSM |
| `SUPABASE_SERVICE_ROLE_KEY` | required | Secrets Manager |
| `USE_FINBERT` | optional | Amplify / task env |
| `HF_TOKEN` | optional | Secrets Manager |
| `APIFY_TOKEN` | optional, paid tier | Secrets Manager |
| `OPENAI_API_KEY` | optional, paid tier | Secrets Manager |

## Sample GitHub Actions workflow (deploy to Amplify Hosting)

Amplify auto-deploys from GitHub with no workflow file — just connect the
repo in the Amplify console. Skip this section if using Amplify.

## Sample GitHub Actions workflow (deploy to App Runner)

Template only — adapt to the team's branching model and AWS naming.

```yaml
# .github/workflows/aws-deploy.yml
name: Deploy to AWS App Runner

on:
  push:
    branches: [master]

jobs:
  build-and-deploy:
    runs-on: ubuntu-latest
    permissions:
      id-token: write
      contents: read
    steps:
      - uses: actions/checkout@v4

      - name: Configure AWS credentials (OIDC)
        uses: aws-actions/configure-aws-credentials@v4
        with:
          role-to-assume: arn:aws:iam::<ACCOUNT_ID>:role/gh-actions-apprunner-deploy
          aws-region: ap-southeast-1

      - name: Log in to ECR
        id: ecr
        uses: aws-actions/amazon-ecr-login@v2

      - name: Build & push image
        env:
          REGISTRY: ${{ steps.ecr.outputs.registry }}
          REPO: prediction-algo
          TAG: ${{ github.sha }}
        run: |
          docker build -t $REGISTRY/$REPO:$TAG -t $REGISTRY/$REPO:latest .
          docker push $REGISTRY/$REPO:$TAG
          docker push $REGISTRY/$REPO:latest

      - name: Trigger App Runner deployment
        run: |
          aws apprunner start-deployment \
            --service-arn arn:aws:apprunner:ap-southeast-1:<ACCOUNT_ID>:service/prediction-algo/<SERVICE_ID>
```

## Sample GitHub Actions workflow (daily crons)

If using GitHub Actions for cron instead of EventBridge:

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

## Sample EventBridge Scheduler setup (via AWS CLI)

```bash
# Create a scheduler for the topic radar
aws scheduler create-schedule \
  --name prediction-algo-topic-scan \
  --schedule-expression "cron(0 6 * * ? *)" \
  --flexible-time-window '{"Mode":"OFF"}' \
  --target '{
    "Arn":"arn:aws:scheduler:::aws-sdk:httpapi:invoke",
    "RoleArn":"arn:aws:iam::<ACCOUNT_ID>:role/scheduler-http-role",
    "Input":"{\"url\":\"https://prediction-algo.example.com/api/scan\",\"method\":\"GET\"}"
  }'

# Same pattern with "cron(30 6 * * ? *)" and /api/amplification/scan
```

## Files to review / replace during migration

| File | AWS-specific action |
| --- | --- |
| `vercel.json` | Translate `crons` block to EventBridge Scheduler (or delete if using Amplify + GH Actions cron) |
| `next.config.ts` | Add `output: 'standalone'` for Docker deploys (App Runner / ECS). Not needed for Amplify. |
| `lib/supabase.ts` | Replace with RDS/Aurora client if moving off Supabase |
| `supabase-schema.sql` | Keep DDL; drop RLS policies if moving off Supabase |
| `app/api/scan/route.ts` | `maxDuration = 300` is Vercel-specific; on AWS, set timeout at the platform level (App Runner request timeout, Lambda timeout, etc.) |
| `app/api/amplification/scan/route.ts` | Same as above |
| `lib/apify.ts`, `lib/embeddings.ts` | Pure HTTP clients, no changes needed |

## Pre-migration checklist

- [ ] RDS / Aurora PostgreSQL provisioned (or keep Supabase)
- [ ] Database schema applied (minus RLS if on RDS)
- [ ] Secrets Manager or SSM Parameter Store populated with env vars
- [ ] ECR repository created (if App Runner / ECS)
- [ ] Image built from `Dockerfile` and pushed (if App Runner / ECS)
- [ ] Amplify Hosting connected to the GitHub repo, **or** App Runner /
  ECS service provisioned pointing at ECR
- [ ] IAM role with required permissions attached to the compute layer
- [ ] VPC + private subnet configured (if isolating the DB)
- [ ] GitHub Actions `AWS_OIDC_ROLE` secret configured (if self-managed CI/CD)
- [ ] Custom domain bound via **Amazon Route 53** + **ACM** certificate,
  HTTPS enforced
- [ ] Cron triggers configured (EventBridge Scheduler / GH Actions schedule)
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
