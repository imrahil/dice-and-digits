import { defineConfig } from '@playwright/test'
import base from './playwright.config'

/**
 * README screenshots (`npm run screenshots`): the same app + worker as the
 * e2e run, but a different spec that seeds demo data and writes PNGs to
 * docs/screenshots/{en,pl}/.
 */
export default defineConfig({
  ...base,
  testDir: 'screenshots',
  timeout: 120_000,
  retries: 0,
  reporter: 'list',
  use: {
    ...base.use,
    // Screenshots are taken under https://dicedigits.fun (see the spec), which
    // reaches the local worker on http://localhost: allow that in Chromium.
    launchOptions: {
      args: ['--disable-features=LocalNetworkAccessChecks,PrivateNetworkAccessSendPreflights,BlockInsecurePrivateNetworkRequests'],
    },
  },
})
