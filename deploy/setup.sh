#!/usr/bin/env bash
# One-time provisioning of a fresh Ubuntu 24.04 (arm64) server for ClearContract.
# Run as root:  sudo bash setup.sh
# Idempotent-ish: safe to re-run, but it is a straight transcription of manual
# steps (plan §2.3) — no rollbacks, no health checks.
set -euo pipefail

REPO_URL="${REPO_URL:-https://github.com/leeb48/ClearContract.git}"
APP_DIR=/opt/clearcontract
APP_USER=clearcontract
WEB_DOMAIN=clearcontract.appassembly.net
PB_DOMAIN=pb.clearcontract.appassembly.net

# --- packages ----------------------------------------------------------------
apt-get update
apt-get install -y curl unzip git debian-keyring debian-archive-keyring apt-transport-https

# --- host firewall -----------------------------------------------------------
# Oracle's Ubuntu images ship iptables REJECT rules that block 80/443 even when
# the VCN security list allows them. Insert ACCEPTs ahead of the REJECT rule.
for port in 80 443; do
  if ! iptables -C INPUT -p tcp --dport "$port" -j ACCEPT 2>/dev/null; then
    iptables -I INPUT 5 -p tcp --dport "$port" -j ACCEPT
  fi
done
DEBIAN_FRONTEND=noninteractive apt-get install -y iptables-persistent
netfilter-persistent save

# Node 22 (matches local dev)
if ! command -v node >/dev/null || [[ "$(node --version)" != v22* ]]; then
  curl -fsSL https://deb.nodesource.com/setup_22.x | bash -
  apt-get install -y nodejs
fi

# Caddy (official repo)
if ! command -v caddy >/dev/null; then
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/gpg.key' | gpg --dearmor -o /usr/share/keyrings/caddy-stable-archive-keyring.gpg
  curl -1sLf 'https://dl.cloudsmith.io/public/caddy/stable/debian.deb.txt' | tee /etc/apt/sources.list.d/caddy-stable.list
  apt-get update
  apt-get install -y caddy
fi

# --- app user + checkout -----------------------------------------------------
id -u "$APP_USER" &>/dev/null || useradd --system --create-home --shell /bin/bash "$APP_USER"
if [ ! -d "$APP_DIR/.git" ]; then
  git clone "$REPO_URL" "$APP_DIR"
fi
chown -R "$APP_USER:$APP_USER" "$APP_DIR"

# --- env files ---------------------------------------------------------------
# NEXT_PUBLIC_* values are inlined into the client bundle at BUILD time, so
# deploy.sh sources web.env before `next build` — the env file must therefore
# be readable by $APP_USER.
mkdir -p /etc/clearcontract
if [ ! -f /etc/clearcontract/web.env ]; then
  cat > /etc/clearcontract/web.env <<EOF
NEXT_PUBLIC_PB_URL=https://$PB_DOMAIN
NEXT_PUBLIC_APP_URL=https://$WEB_DOMAIN
EOF
fi
if [ ! -f /etc/clearcontract/pb.env ]; then
  sed "s|APP_URL=.*|APP_URL=https://$WEB_DOMAIN|" "$APP_DIR/pb/.env.example" > /etc/clearcontract/pb.env
fi
chown "$APP_USER:$APP_USER" /etc/clearcontract/*.env
chmod 600 /etc/clearcontract/*.env

# --- caddy + systemd ---------------------------------------------------------
install -m 644 "$APP_DIR/deploy/Caddyfile" /etc/caddy/Caddyfile
install -m 644 "$APP_DIR/deploy/pocketbase.service" /etc/systemd/system/pocketbase.service
install -m 644 "$APP_DIR/deploy/clearcontract-web.service" /etc/systemd/system/clearcontract-web.service
systemctl daemon-reload
systemctl enable pocketbase clearcontract-web caddy

# --- backups (ENABLE BEFORE FIRST REAL DATA — see docs/decisions.md) ---------
# Nightly PocketBase backup pushed offsite (B2/R2 via rclone). Stub:
# cat > /etc/cron.d/clearcontract-backup <<'CRON'
# 15 3 * * * clearcontract /opt/clearcontract/pb/pocketbase backups create --dir=/opt/clearcontract/pb/pb_data && rclone copy /opt/clearcontract/pb/pb_data/backups remote:clearcontract-backups
# CRON

# --- first deploy ------------------------------------------------------------
bash "$APP_DIR/deploy/deploy.sh"
systemctl restart caddy

echo "setup complete — https://$WEB_DOMAIN and https://$PB_DOMAIN"
