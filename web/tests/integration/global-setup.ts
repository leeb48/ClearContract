// Boots the real pinned PocketBase binary against a throwaway data dir,
// with the repo's pb_migrations/ and pb_hooks/ loaded (plan §7.2).
import { spawn, spawnSync, type ChildProcess } from "node:child_process";
import { mkdtempSync, rmSync, existsSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";

export const PB_TEST_URL = "http://127.0.0.1:8090";
export const PB_TEST_SUPERUSER = "test-superuser@example.com";
export const PB_TEST_SUPERUSER_PASS = "test-superuser-pass-123";

const pbDir = path.resolve(__dirname, "../../../pb");
const pbBin = path.join(pbDir, "pocketbase");

let proc: ChildProcess | undefined;
let dataDir: string | undefined;

async function waitForHealth(url: string, timeoutMs = 20_000): Promise<void> {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    try {
      const res = await fetch(`${url}/api/health`);
      if (res.ok) return;
    } catch {
      // not up yet
    }
    await new Promise((r) => setTimeout(r, 200));
  }
  throw new Error(`PocketBase did not become healthy at ${url}`);
}

export async function setup(): Promise<void> {
  if (!existsSync(pbBin)) {
    throw new Error(`PocketBase binary missing at ${pbBin} — run pb/get-pocketbase.sh first`);
  }
  dataDir = mkdtempSync(path.join(tmpdir(), "cc-pb-test-"));

  const common = [
    `--dir=${dataDir}`,
    `--migrationsDir=${path.join(pbDir, "pb_migrations")}`,
    `--hooksDir=${path.join(pbDir, "pb_hooks")}`,
  ];

  const upsert = spawnSync(
    pbBin,
    ["superuser", "upsert", PB_TEST_SUPERUSER, PB_TEST_SUPERUSER_PASS, ...common],
    { stdio: "pipe" }
  );
  if (upsert.status !== 0) {
    throw new Error(`superuser upsert failed: ${upsert.stderr?.toString()}`);
  }

  proc = spawn(pbBin, ["serve", "--http=127.0.0.1:8090", ...common], { stdio: "pipe" });
  await waitForHealth(PB_TEST_URL);
}

export async function teardown(): Promise<void> {
  proc?.kill("SIGTERM");
  await new Promise((r) => setTimeout(r, 300));
  if (dataDir) rmSync(dataDir, { recursive: true, force: true });
}
