import { defineConfig } from '@playwright/test';

/** Web-only browser tests against an exported build (`pnpm build:web`). */
export default defineConfig({
  testDir: 'e2e-web',
  // Not *.test.ts / *.spec.ts, so Jest never picks these up.
  testMatch: '**/*.pw.ts',
  reporter: process.env.CI ? [['github'], ['html', { open: 'never' }]] : 'list',
  use: {
    browserName: 'chromium',
    channel: process.env.PLAYWRIGHT_CHANNEL,
    serviceWorkers: 'allow',
    trace: 'retain-on-failure',
  },
});
