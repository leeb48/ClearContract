import { defineConfig, devices } from "@playwright/test";

// Two servers: the real pinned PocketBase binary and the Next.js dev server (plan §7.3).
export default defineConfig({
  testDir: "./tests/e2e",
  retries: process.env.CI ? 1 : 0,
  use: {
    baseURL: "http://127.0.0.1:3000",
    trace: "on-first-retry",
    video: "on-first-retry",
  },
  projects: [
    { name: "chromium", use: { ...devices["Desktop Chrome"] } },
    // Chromium-based mobile device so CI only needs one browser; the plan's
    // intent is a mobile viewport, not Safari specifically.
    { name: "mobile", use: { ...devices["Pixel 7"] } },
  ],
  webServer: [
    {
      command:
        "../pb/pocketbase serve --http=127.0.0.1:8090 --dir=/tmp/cc-pb-e2e --migrationsDir=../pb/pb_migrations --hooksDir=../pb/pb_hooks",
      url: "http://127.0.0.1:8090/api/health",
      reuseExistingServer: !process.env.CI,
    },
    {
      command: "npm run dev",
      url: "http://127.0.0.1:3000",
      reuseExistingServer: !process.env.CI,
      env: { NEXT_PUBLIC_PB_URL: "http://127.0.0.1:8090" },
    },
  ],
});
