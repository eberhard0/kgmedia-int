# KG Media Internal Prediction Algo

Internal monitoring dashboard for Kompas Gramedia — tracks news, social, and forum
signal; alerts when external coverage of a Kompas article starts amplifying as a
controversy.

- Live: https://kgmedia-int.vercel.app
- Stack: Next.js 16 (App Router) · Supabase · Vercel (Hobby plan)

## Surfaces

- `/` — topic radar with per-publication sentiment, trend, and headline panels
- `/amplification` — controversy watch; red-blinking alert when 3+ external
  sources mention the same Kompas-related topic within 24h
- `/changelog`, `/faq`

## Local development

```bash
npm install
cp .env.local.example .env.local   # then fill in Supabase credentials
npm run dev
```

Open http://localhost:3000.

## Required environment variables

| Variable | Purpose |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anon key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service-role key (writes) |
| `USE_FINBERT` *(optional)* | `true` to enable FinBERT/IndoBERT sentiment via Hugging Face |
| `HF_TOKEN` *(optional)* | Hugging Face API token for FinBERT/IndoBERT |

## Optional paid integrations

The amplification pipeline ships with dormant Apify + OpenAI modules
(`lib/apify.ts`, `lib/embeddings.ts`). They activate automatically when the
following env vars are present — no code change or redeploy triggered from
code is needed, just add the vars and the next scan picks them up.

| Variable | Purpose | Cost |
| --- | --- | --- |
| `APIFY_TOKEN` | Enables TikTok / Instagram / Threads / Facebook / X post scraping via Apify actors | ~$49/mo (Starter plan includes $49 credit) |
| `OPENAI_API_KEY` | Replaces Jaccard keyword clustering with semantic cosine similarity via `text-embedding-3-small` | ~$1/mo at this scale |

### How to add them

#### 1. Apify

1. Sign up: https://apify.com/sign-up
2. Pick the **Starter** plan ($49/mo): https://apify.com/pricing
3. Copy your personal API token: https://console.apify.com/account/integrations

Actors used (called by token, no install needed):
- `apify/instagram-scraper`
- `clockworks/free-tiktok-scraper`
- `curious-coder/threads-scraper`
- `apify/facebook-posts-scraper`
- `apidojo/twitter-scraper-lite`

#### 2. OpenAI

1. Log in / sign up: https://platform.openai.com/signup
2. Add a billing method: https://platform.openai.com/account/billing
3. Create an API key: https://platform.openai.com/api-keys
4. Recommended: set a $5/mo spending cap at
   https://platform.openai.com/settings/organization/limits

#### 3. Add both to Vercel

Via dashboard — https://vercel.com/eberhard0s-projects/kgmedia-int/settings/environment-variables —
add for **Production** (and Preview if desired):

- `APIFY_TOKEN`
- `OPENAI_API_KEY`

Or via CLI:

```bash
vercel env add APIFY_TOKEN production
vercel env add OPENAI_API_KEY production
```

After the next function cold start, `Scan Now` on `/amplification` will emit
progress messages including `Apify enabled — fetching TikTok/IG/Threads/FB/X
posts` and the clustering step will use semantic embeddings.

## Database schema

`supabase-schema.sql` at repo root contains all DDL. When the schema changes,
paste the new statements into the Supabase SQL Editor manually — there is no
migration pipeline. After DDL, run `NOTIFY pgrst, 'reload schema';` to force
PostgREST to pick up new tables immediately.

## Crons

`vercel.json` defines:

- `/api/scan` — daily at 06:00 UTC (topic radar)
- `/api/amplification/scan` — daily at 06:30 UTC (controversy watch)

Hobby plan is limited to one invocation per cron per day. For sub-daily
refreshes, use the **Scan Now** button on the relevant page.

## License

Internal KG Media tool.
