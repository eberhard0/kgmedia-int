# Self-Hosted Deployment Guide

This document describes how to run the KG Media Internal Prediction Algo on
your own server (`predict-test.kompaskita.com`) with vanilla PostgreSQL,
replacing the previous Vercel + Supabase stack.

> **Status (2026-04-27):** runbook + config templates complete. The Next.js
> codebase still imports `@supabase/supabase-js` — a code refactor to
> `pg` (node-postgres) is the next phase before the app will actually run
> on this stack. See [§ Phase 4](#phase-4--code-refactor-pending).

---

## Target architecture

```
                                                                               
   Internet                                                                    
      │                                                                        
      │  HTTPS                                                                 
      ▼                                                                        
   ┌───────────────┐    proxy_pass     ┌──────────────────────┐                
   │    nginx      │ ───────────────▶  │  Next.js app         │                
   │ (Let's Encrypt)│                   │  (systemd service)   │                
   └───────────────┘                   │  port 3000, Node 24  │                
                                       └──────────┬───────────┘                
                                                  │ pg                         
                                                  ▼                            
                                       ┌──────────────────────┐                
                                       │  PostgreSQL 16       │                
                                       │  localhost:5432      │                
                                       └──────────────────────┘                
                                                  ▲                            
                                                  │                            
                                       ┌──────────┴───────────┐                
                                       │  systemd timers      │                
                                       │  ─ kgmedia-rss.timer  │                
                                       │    every 15 min      │                
                                       │  ─ kgmedia-amp.timer  │                
                                       │    every 1 hour      │                
                                       └──────────────────────┘                
```

**What it replaces:**

| Old (Vercel + Supabase) | New (self-hosted) |
|---|---|
| Vercel hosting | systemd-managed Next.js on the server |
| Vercel cron (1×/day Hobby cap) | systemd timers (any cadence we want) |
| Vercel auto-deploy on git push | `git pull && npm run build && systemctl restart` |
| Vercel HTTPS / Edge | nginx + Let's Encrypt |
| Supabase Postgres | local Postgres 16 |
| Supabase PostgREST API (used by mobile direct DB queries) | direct `pg` queries from the Next.js app |
| Supabase Realtime (mobile cluster invalidation) | dropped — mobile pulls every 30s + on focus |
| Supabase auto-backups | pg_dump cron + rclone offsite |
| Supabase RLS | not needed — only the app user touches the DB |

---

## Prerequisites

**Server:**
- Ubuntu 22.04 LTS (or Debian 12)
- Min 2 vCPU, 4 GB RAM, 40 GB disk (the DB grows ~50 MB/month at current volume)
- DNS: `predict-test.kompaskita.com` → server's public IP (already done per the user)
- Ports open externally: 80, 443. Postgres (5432) stays on localhost only.
- Sudo access

**Software (installed in [§ Phase 1](#phase-1--first-time-server-provision)):**
- Node.js 24 LTS (via nvm or NodeSource)
- PostgreSQL 16
- nginx
- certbot (Let's Encrypt)
- git

**External accounts (unchanged from current stack):**
- Apify (Starter plan with PAYG enabled)
- Anthropic (Claude Haiku for entity extraction)
- Voyage AI (embeddings)

**No longer needed:**
- Vercel account (for deployment — keep the account if you want preview links)
- Supabase project (decommission after migration verified)

---

## Phase 1 — First-time server provision

Run as a sudo-capable user. The provisioning script in `deploy/setup.sh`
automates these steps; the manual version is here for reference.

### 1a. Install runtimes

```bash
sudo apt update && sudo apt upgrade -y

# Node.js 24 via NodeSource
curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
sudo apt install -y nodejs

# Postgres 16
sudo apt install -y postgresql postgresql-contrib

# Web stack
sudo apt install -y nginx certbot python3-certbot-nginx git
```

### 1b. Create the app user

The app runs as a dedicated unprivileged user (`kgmedia`):

```bash
sudo adduser --system --group --home /opt/kgmedia --shell /bin/bash kgmedia
sudo mkdir -p /opt/kgmedia/app /opt/kgmedia/logs
sudo chown -R kgmedia:kgmedia /opt/kgmedia
```

### 1c. Clone the repo

```bash
sudo -u kgmedia git clone https://github.com/eberhard0/kgmedia-int.git /opt/kgmedia/app
cd /opt/kgmedia/app
sudo -u kgmedia npm ci
```

(Don't run `npm run build` yet — env vars aren't set.)

---

## Phase 2 — Database setup

### 2a. Create database + user

```bash
sudo -u postgres psql <<'SQL'
CREATE USER kgmedia_app WITH PASSWORD 'REPLACE_WITH_STRONG_RANDOM';
CREATE DATABASE kgmedia_int OWNER kgmedia_app;
GRANT ALL PRIVILEGES ON DATABASE kgmedia_int TO kgmedia_app;
\c kgmedia_int
GRANT ALL ON SCHEMA public TO kgmedia_app;
SQL
```

Generate the password with `openssl rand -base64 32` and store it somewhere
safe (1Password / your secrets manager). It goes in the env file later.

### 2b. Apply schema

```bash
sudo -u postgres psql -d kgmedia_int -f /opt/kgmedia/app/db/schema.sql
```

This creates the `articles`, `topic_snapshots`, `amplification_mentions`,
`amplification_clusters`, and `push_devices` tables. No RLS policies — only
`kgmedia_app` connects to this DB.

### 2c. (Optional) Migrate data from Supabase

If you want to keep the current 24h/historical data:

```bash
# On any machine with internet + the Supabase service-role key
SUPABASE_DB_URL='postgres://postgres.nikdqukxqxuuesodszvg:<SUPABASE_DB_PASSWORD>@aws-0-ap-southeast-1.pooler.supabase.com:6543/postgres'
pg_dump --no-owner --no-privileges \
  --schema=public \
  --data-only \
  --table=articles \
  --table=topic_snapshots \
  --table=amplification_mentions \
  --table=amplification_clusters \
  "$SUPABASE_DB_URL" > /tmp/kgmedia-data.sql

# Move to the server
scp /tmp/kgmedia-data.sql user@predict-test.kompaskita.com:/tmp/

# Restore
ssh user@predict-test.kompaskita.com
sudo -u postgres psql -d kgmedia_int -f /tmp/kgmedia-data.sql
shred -u /tmp/kgmedia-data.sql
```

If you'd rather start fresh, skip this step — first cron run will populate
the new DB.

### 2d. Smoke test

```bash
sudo -u kgmedia psql 'postgres://kgmedia_app:THE_PASSWORD@localhost:5432/kgmedia_int' -c '\dt'
```

Should list the tables. If it does, the database is ready.

---

## Phase 3 — Application config

### 3a. Environment file

Create `/opt/kgmedia/app/.env.local` (mode 0600, owned by `kgmedia`):

```ini
# Database — pg-style URL, sslmode=disable when localhost
DATABASE_URL=postgres://kgmedia_app:THE_PASSWORD@localhost:5432/kgmedia_int

# AI providers
ANTHROPIC_API_KEY=sk-ant-...
VOYAGE_API_KEY=pa-...

# Apify
APIFY_TOKEN=apify_api_...

# Cron auth (any random string)
CRON_SECRET=  # openssl rand -hex 32

# App
NODE_ENV=production
PORT=3000
NEXT_TELEMETRY_DISABLED=1
```

```bash
sudo chmod 0600 /opt/kgmedia/app/.env.local
sudo chown kgmedia:kgmedia /opt/kgmedia/app/.env.local
```

### 3b. Build the app

```bash
cd /opt/kgmedia/app
sudo -u kgmedia npm run build
```

Build artifacts land in `/opt/kgmedia/app/.next` and get served by `next start`.

### 3c. Install systemd units

The repo ships templates in `deploy/systemd/`:

- `kgmedia.service` — the always-on Next.js process (port 3000)
- `kgmedia-rss.service` + `kgmedia-rss.timer` — every 15 min, hits `/api/scan`
- `kgmedia-amp.service` + `kgmedia-amp.timer` — every 1 hour, hits `/api/amplification/scan`

```bash
sudo cp /opt/kgmedia/app/deploy/systemd/*.service /etc/systemd/system/
sudo cp /opt/kgmedia/app/deploy/systemd/*.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now kgmedia.service
sudo systemctl enable --now kgmedia-rss.timer
sudo systemctl enable --now kgmedia-amp.timer
```

Verify:

```bash
systemctl status kgmedia
systemctl list-timers | grep kgmedia
curl -s http://localhost:3000/api/amplification | jq '.alert_count'
```

### 3d. nginx + SSL

The repo ships an nginx site template in `deploy/nginx/kgmedia.conf`.

```bash
sudo cp /opt/kgmedia/app/deploy/nginx/kgmedia.conf /etc/nginx/sites-available/kgmedia
sudo ln -s /etc/nginx/sites-available/kgmedia /etc/nginx/sites-enabled/kgmedia
sudo nginx -t && sudo systemctl reload nginx

# Obtain Let's Encrypt cert
sudo certbot --nginx -d predict-test.kompaskita.com --non-interactive --agree-tos -m ebert.ojong@gmail.com
```

Certbot auto-renews via its own systemd timer.

After this, https://predict-test.kompaskita.com should serve the app.

---

## Phase 4 — Code refactor (PENDING)

The runbook above is complete; the **code is not**. The Next.js app still
imports `@supabase/supabase-js`, which needs to be replaced with `pg`
(node-postgres) before any of the systemd services will actually work.

What needs to change (rough scope, ~4–6 hours of focused work):

1. `lib/db.ts` — new file, exports a `pg.Pool` configured from `DATABASE_URL`. Skeleton already in repo.
2. `lib/supabase.ts` — delete, or shim to throw clearly so leftover imports surface immediately
3. `lib/amplification.ts` — replace **every** `getSupabaseAdmin().from(...)` call with raw SQL via `db.query(...)`. ~15 call sites
4. `lib/scraper.ts` and `lib/escalation.ts` — same swap
5. `app/api/**/route.ts` — same swap
6. `package.json` — remove `@supabase/supabase-js` from dependencies, add `pg` and `@types/pg`
7. **Mobile app** — drop `@supabase/supabase-js` entirely (mobile already calls the web's API for everything; the only Supabase use was realtime, which we're dropping)

When this lands, the systemd services will Just Work against the new
Postgres. Until then, treat this server as a staging environment for the
infrastructure config — the app itself can't talk to Postgres yet.

---

## Operational runbook

### Day-to-day

```bash
# View app logs (live tail)
sudo journalctl -u kgmedia -f

# View last RSS scan output
sudo journalctl -u kgmedia-rss -n 200

# Force a scan immediately (out-of-band)
sudo systemctl start kgmedia-rss
sudo systemctl start kgmedia-amp

# Check next scheduled scan
systemctl list-timers | grep kgmedia
```

### Deploying a code change

```bash
sudo -u kgmedia bash -c '
  cd /opt/kgmedia/app
  git pull origin master
  npm ci
  npm run build
'
sudo systemctl restart kgmedia
```

A future enhancement is a GitHub Actions workflow that SSHs in and runs
the above on every push to `master`. For now, manual is fine — pulls are
infrequent.

### Rotating CRON_SECRET

Edit `/opt/kgmedia/app/.env.local`, change `CRON_SECRET=`, then:

```bash
sudo systemctl restart kgmedia
sudo systemctl restart kgmedia-rss.timer kgmedia-amp.timer
```

Both the app (which validates) and the timers (which include the
`Authorization: Bearer ${CRON_SECRET}` curl header in their service unit)
need the new value. The systemd unit reads `EnvironmentFile=` so a
restart picks it up.

### Backups

`scripts/backup.sh` runs daily via a third systemd timer (`kgmedia-backup.timer`).
It does:

1. `pg_dump` the database (compressed) to `/var/backups/kgmedia/`
2. Keep the last 14 dumps
3. Optionally rclone the dump to S3 / GCS / Backblaze (configure via
   `RCLONE_REMOTE` env var)

Test restore quarterly:

```bash
sudo systemctl stop kgmedia-rss.timer kgmedia-amp.timer kgmedia
sudo -u postgres dropdb kgmedia_int
sudo -u postgres createdb -O kgmedia_app kgmedia_int
gunzip -c /var/backups/kgmedia/kgmedia-YYYY-MM-DD.sql.gz | sudo -u postgres psql kgmedia_int
sudo systemctl start kgmedia kgmedia-rss.timer kgmedia-amp.timer
```

### Troubleshooting

| Symptom | First check |
|---|---|
| App returns 502 in nginx | `systemctl status kgmedia` — likely the Next.js process crashed; `journalctl -u kgmedia -n 100` |
| Cron not firing | `systemctl list-timers` — confirm timer is enabled; `journalctl -u kgmedia-rss` for last run |
| Scan returns 401 | `CRON_SECRET` mismatch between `.env.local` and the `Authorization` header in the timer's service unit |
| DB connection refused | `sudo systemctl status postgresql`; check `pg_hba.conf` allows local `kgmedia_app` |
| Disk filling up | `pg_dump` not rotating; check `/var/backups/kgmedia/` size |
| TLS cert expiring | `sudo certbot renew --dry-run`; should auto-renew but monitor first time |

---

## Cadence and Apify cost

The runbook installs **two timers**:

| Timer | Cadence | Cost / month |
|---|---|---|
| `kgmedia-rss.timer` (`/api/scan`, sentiment + topics) | every 15 min | $0 (RSS only) |
| `kgmedia-amp.timer` (`/api/amplification/scan`, Apify) | every 1 hour | ~$30 (TikTok, IG, FB, X) |

If you want **15-minute Apify** scans, change `OnUnitActiveSec=` in
`kgmedia-amp.timer` from `1h` to `15min`. Expect the monthly Apify bill
to climb to ~$300+; budget against the actual numbers your account has
been pulling.

---

## Decommissioning the old stack

After cutover and verification:

1. **Vercel:** delete the project at https://vercel.com/eberhard0s-projects/kgmedia-int/settings → Delete Project. This frees the `kgmedia-int.vercel.app` URL and removes any future charges.
2. **Supabase:** export final backup, then archive the project from the Supabase dashboard. Don't delete immediately — keep it cold for 30 days as a fallback.
3. **GitHub Actions / Vercel integration:** if a Vercel GitHub app is installed on the org repo, uninstall it.
4. **DNS:** if `kgmedia-int.vercel.app` was aliased anywhere, remove those CNAMEs.
5. **README:** update to point at `predict-test.kompaskita.com` as the canonical URL. Remove Vercel references.

---

## What your team needs to do, ranked

1. **Decide on the cadence model** (split-cadence vs. full 15-min) — this affects the timer config and Apify spend
2. **Provision the server** following Phase 1
3. **Run Phase 2** to set up the database
4. **Wait** for the code refactor (Phase 4) — server is unusable as an app host until then
5. **After refactor:** Phase 3 (config + service install) + Phase 4 cutover

The code refactor is the critical path. Everything else can be staged in
parallel with it.
