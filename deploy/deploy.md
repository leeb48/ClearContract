# Deploy notes

## Pinned versions
- PocketBase: **0.39.5** (pinned in `pb/get-pocketbase.sh`; arm64 on the server, amd64 locally/CI)
- Node: **22.x** (nodesource on the server, matches local dev)

## Server
- Oracle Cloud A1.Flex 2 OCPU / 12 GB, Ubuntu 24.04 arm64, Phoenix
- Reserved IP: `161.153.17.241`
- Hostnames: `clearcontract.appassembly.net` (Next.js :3000), `pb.clearcontract.appassembly.net` (PocketBase :8090), both behind Caddy (HTTPS)
- Cloudflare DNS records are **DNS only (gray cloud)** — the proxy breaks Caddy cert issuance and PocketBase SSE.

## First-time provisioning
```
ssh ubuntu@161.153.17.241
git clone https://github.com/leeb48/ClearContract.git
sudo bash ClearContract/deploy/setup.sh
```
Then fill in real secrets in `/etc/clearcontract/pb.env` and restart `pocketbase`.

## Repeat deploys
```
ssh ubuntu@161.153.17.241 'cd /opt/clearcontract && sudo bash deploy/deploy.sh'
```

## Restore procedure
1. Provision a fresh server with `setup.sh` (any arch — the PB download script detects it).
2. Stop `pocketbase`, restore the latest `pb_data/` backup into `/opt/clearcontract/pb/pb_data`, start it.
3. DNS already points at the reserved IP; move the reserved IP to the new instance if the box itself was replaced.

## Backups
Not yet enabled — **must be enabled before the first real quote is sent** (see
`docs/decisions.md`). Uncomment the cron stub in `setup.sh` and configure rclone.
