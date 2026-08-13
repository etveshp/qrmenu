import { defineConfig, devices } from '@playwright/test';

const MOCK_PORT = 54321;
const APP_PORT = 3100;

// E2e runs the app against a local fake Supabase (e2e/supabase-mock.mjs),
// never against the real backend: the dev server gets a fake
// NEXT_PUBLIC_SUPABASE_URL, so guests, orders and menu reads stay local.
export default defineConfig({
  testDir: './e2e',
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  reporter: 'list',
  use: {
    baseURL: `http://localhost:${APP_PORT}`,
    trace: 'on-first-retry',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node e2e/supabase-mock.mjs',
      url: `http://localhost:${MOCK_PORT}/__state/orders`,
      reuseExistingServer: !process.env.CI,
    },
    {
      command: `npm run dev -- -p ${APP_PORT}`,
      url: `http://localhost:${APP_PORT}`,
      reuseExistingServer: !process.env.CI,
      timeout: 120_000,
      env: {
        ...process.env,
        NEXT_PUBLIC_SUPABASE_URL: `http://localhost:${MOCK_PORT}`,
        NEXT_PUBLIC_SUPABASE_ANON_KEY: 'test-anon-key',
      },
    },
  ],
});
