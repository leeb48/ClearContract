#!/usr/bin/env bash
# Downloads the pinned PocketBase binary for the current architecture into pb/.
# Used by local dev, integration tests, CI, and deploy/setup.sh.
set -euo pipefail

PB_VERSION="0.39.5"
DIR="$(cd "$(dirname "$0")" && pwd)"

if [ -x "$DIR/pocketbase" ] && "$DIR/pocketbase" --version 2>/dev/null | grep -q "$PB_VERSION"; then
  echo "pocketbase $PB_VERSION already present"
  exit 0
fi

case "$(uname -m)" in
  x86_64) ARCH="amd64" ;;
  aarch64 | arm64) ARCH="arm64" ;;
  *) echo "unsupported architecture: $(uname -m)" >&2; exit 1 ;;
esac

URL="https://github.com/pocketbase/pocketbase/releases/download/v${PB_VERSION}/pocketbase_${PB_VERSION}_linux_${ARCH}.zip"
TMP="$(mktemp -d)"
trap 'rm -rf "$TMP"' EXIT

echo "downloading pocketbase $PB_VERSION ($ARCH)…"
curl -fsSL "$URL" -o "$TMP/pb.zip"
unzip -oq "$TMP/pb.zip" -d "$TMP"
mv "$TMP/pocketbase" "$DIR/pocketbase"
chmod +x "$DIR/pocketbase"
echo "installed $("$DIR/pocketbase" --version)"
