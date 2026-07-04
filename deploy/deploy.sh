#!/usr/bin/env bash
# Repeat deploys: pull, build, restart. Run as root (sudo bash deploy/deploy.sh);
# build steps re-run as the app user, service restarts stay with root.
set -euo pipefail

APP_DIR=/opt/clearcontract
APP_USER=clearcontract

if [ "$(id -u)" -eq 0 ]; then
  sudo -u "$APP_USER" bash "$0"
  systemctl restart pocketbase clearcontract-web
  exit 0
fi

cd "$APP_DIR"
git pull --ff-only

bash pb/get-pocketbase.sh

# NEXT_PUBLIC_* vars are inlined at build time — load them before building.
if [ -f /etc/clearcontract/web.env ]; then
  set -a
  # shellcheck disable=SC1091
  . /etc/clearcontract/web.env
  set +a
fi

cd web
npm ci
npm run build
