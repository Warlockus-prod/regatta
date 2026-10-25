import { defineConfig, devices } from '@playwright/test';

/**
 * Smoke E2E tests. The target is BASE_URL: CI sets it twice in deploy.yml,
 * http://localhost:3000 for the pre-deploy run and https://weektoregatta.com
 * after the deploy. Without it the tests hit a local server, never prod by
 * accident: every unintended prod run used to land in /stats as real traffic
 * (half of all recorded page views were ours).
 *
 * The browser's user agent ends in "RegattaE2E", which /api/log drops, and
 * navigator.webdriver is true, so src/lib/client-log.ts sends nothing anyway.
 */
export default defineConfig({
  testDir: './e2e',
  timeout: 30_000,
  expect: { timeout: 10_000 },
  fullyParallel: true,
  retries: process.env.CI ? 2 : 0,
  // Cloud traces showed WebGL2 ReadPixels stalls while independent heavy scenes
  // overlapped. Serialize CI cases; local concurrency and real in-test clients stay.
  workers: process.env.CI ? 1 : undefined,
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : [['list']],
  use: {
    baseURL: process.env.BASE_URL || 'http://localhost:3000',
    trace: 'on-first-retry',
    screenshot: 'only-on-failure',
    video: 'off',
    viewport: { width: 1280, height: 800 },
    locale: 'ru-RU',
  },
  projects: [
    {
      name: 'chromium',
      use: { ...devices['Desktop Chrome'], userAgent: `${devices['Desktop Chrome'].userAgent} RegattaE2E` },
    },
  ],
});
