import { defineConfig, devices } from '@playwright/test';

// Two servers: the real pinned PocketBase binary and the Next.js dev server (plan §7.3).
export default defineConfig({
	testDir: './tests/e2e',
	retries: process.env.CI ? 1 : 0,
	reporter: [['list'], ['html', { open: 'never' }]],
	use: {
		baseURL: 'http://127.0.0.1:3002',
		trace: 'on-first-retry',
		video: 'on-first-retry',
	},
	projects: [
		{ name: 'chromium', use: { ...devices['Desktop Chrome'] } },
		// Chromium-based mobile device so CI only needs one browser; the plan's
		// intent is a mobile viewport, not Safari specifically.
		{ name: 'mobile', use: { ...devices['Pixel 7'] } },
	],
	// Dedicated ports (8092/3002) so the dev stack (8090/3000) never interferes.
	// The app runs a production build: Next 16 allows only one dev server per
	// project, prod hydrates instantly (no HMR races), and it matches CI (§7.4).
	webServer: [
		{
			command:
				'../pb/pocketbase serve --http=127.0.0.1:8092 --dir=/tmp/cc-pb-e2e --migrationsDir=../pb/pb_migrations --hooksDir=../pb/pb_hooks',
			url: 'http://127.0.0.1:8092/api/health',
			reuseExistingServer: false,
		},
		{
			command: 'npm run build && npm run start -- -p 3002',
			url: 'http://127.0.0.1:3002',
			reuseExistingServer: false,
			timeout: 180_000,
			env: { NEXT_PUBLIC_PB_URL: 'http://127.0.0.1:8092' },
		},
	],
});
