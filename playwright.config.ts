import { defineConfig, devices } from '@playwright/test';
import { env } from './src/config/env';

/**
 * See https://playwright.dev/docs/test-configuration
 */
export default defineConfig({
  testDir: './tests',
  // 30s (the Playwright default) is tuned for fast/local targets. Against a
  // live external site, multi-step flows (e.g. signup + full checkout) can
  // graze that under concurrent load even though nothing is actually wrong.
  timeout: 45_000,
  fullyParallel: true,
  forbidOnly: !!process.env.CI,
  // automationexercise.com is a shared public practice site, not a
  // dedicated test environment — pushing too much concurrency at it
  // reliably causes requests to hang server-side until the test timeout,
  // independent of machine specs (verified: 8 workers on a 16-core machine
  // produced hangs; 2 workers ran clean every time). Cap workers and allow
  // one retry everywhere, not just in CI, to absorb transient load on the
  // shared target without masking real failures (a genuine bug still fails
  // the retry).
  workers: 2,
  retries: process.env.CI ? 2 : 1,
  reporter: [
    ['html', { open: 'never' }],
    ['list'],
  ],
  use: {
    baseURL: env.baseUrl,
    trace: 'retain-on-failure',
    screenshot: 'only-on-failure',
    video: 'retain-on-failure',
  },
  projects: [
    { name: 'chromium', use: { ...devices['Desktop Chrome'] } },
    { name: 'firefox', use: { ...devices['Desktop Firefox'] } },
    { name: 'webkit', use: { ...devices['Desktop Safari'] } },
  ],
});
