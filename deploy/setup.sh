#!/usr/bin/env bash
# First-time provisioning script for predict-test.kompaskita.com.
# Idempotent — safe to re-run. Read SELFHOST.md before using.
#
# Run as a sudo-capable user:
#   curl -fsSL https://raw.githubusercontent.com/eberhard0/kgmedia-int/master/deploy/setup.sh | bash
# or
#   bash deploy/setup.sh

set -euo pipefail

if [ "$(id -u)" -eq 0 ]; then
  echo "Don't run this as root directly. Run as a sudo-capable user; the script invokes sudo where needed."
  exit 1
fi

APP_USER=kgmedia
APP_HOME=/opt/kgmedia
APP_DIR=$APP_HOME/app
REPO=https://github.com/eberhard0/kgmedia-int.git

echo "==> apt update + base packages"
sudo apt update
sudo apt install -y curl ca-certificates gnupg git nginx certbot python3-certbot-nginx postgresql postgresql-contrib

echo "==> Node.js 24 LTS"
if ! command -v node >/dev/null || [ "$(node -v | cut -dv -f2 | cut -d. -f1)" -lt 24 ]; then
  curl -fsSL https://deb.nodesource.com/setup_24.x | sudo -E bash -
  sudo apt install -y nodejs
fi

echo "==> app user $APP_USER"
if ! id "$APP_USER" >/dev/null 2>&1; then
  sudo adduser --system --group --home "$APP_HOME" --shell /bin/bash "$APP_USER"
fi
sudo mkdir -p "$APP_DIR" "$APP_HOME/logs" /var/backups/kgmedia
sudo chown -R "$APP_USER:$APP_USER" "$APP_HOME" /var/backups/kgmedia

echo "==> clone repo"
if [ ! -d "$APP_DIR/.git" ]; then
  sudo -u "$APP_USER" git clone "$REPO" "$APP_DIR"
else
  sudo -u "$APP_USER" git -C "$APP_DIR" pull --ff-only
fi

echo "==> npm ci"
sudo -u "$APP_USER" bash -c "cd $APP_DIR && npm ci"

echo
echo "Next manual steps (see SELFHOST.md):"
echo "  1. Phase 2 — create the Postgres user, db, and apply db/schema.sql"
echo "  2. Phase 3a — write $APP_DIR/.env.local (mode 0600) with DATABASE_URL, ANTHROPIC_API_KEY, VOYAGE_API_KEY, APIFY_TOKEN, CRON_SECRET"
echo "  3. Phase 3b — sudo -u kgmedia npm run build (in $APP_DIR)"
echo "  4. Phase 3c — copy systemd units, daemon-reload, enable timers"
echo "  5. Phase 3d — symlink nginx site, certbot for SSL"
echo "  6. Phase 4 — refactor app code from @supabase/supabase-js to lib/db.ts"
echo
