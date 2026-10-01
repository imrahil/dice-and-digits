import { defineConfig, devices } from '@playwright/test'

/**
 * End-to-end tests: the real app on a phone-sized Chromium, talking to the
 * real worker under `wrangler dev` (D1 + Durable Objects, local mode).
 *
 *   npm run e2e
 *
 * Both servers are started here. The worker's local state goes to a fresh
 * directory each run, so tests never see leftovers.
 */
const API = 'http://localhost:8787'
const APP = 'http://localhost:4173'
const STATE = '.wrangler/e2e'

export default defineConfig({
  testDir: 'e2e',
  timeout: 60_000,
  expect: { timeout: 10_000 },
  fullyParallel: false,
  workers: 1,
  retries: process.env.CI ? 1 : 0,
  reporter: process.env.CI ? [['list'], ['html', { open: 'never' }]] : 'list',
  use: {
    ...devices['Pixel 7'],
    baseURL: APP,
    locale: 'pl-PL',
    // The PWA service worker would cache between tests; it has nothing to prove here.
    serviceWorkers: 'block',
    trace: 'retain-on-failure',
  },
  webServer: [
    {
      command: `rm -rf ${STATE} && npx wrangler d1 migrations apply dice-and-digits --local --persist-to ${STATE} && npx wrangler dev --port 8787 --persist-to ${STATE}`,
      cwd: 'worker',
      url: `${API}/api/health`,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { WRANGLER_SEND_METRICS: 'false' },
    },
    {
      command: 'npx vite build --outDir dist-e2e && npx vite preview --outDir dist-e2e --port 4173 --strictPort',
      url: APP,
      timeout: 120_000,
      reuseExistingServer: false,
      env: { VITE_API_URL: API },
    },
  ],
})
