import { expect, test } from '@playwright/test';

import { serveDist } from './serve-dist';

/**
 * The offline promise, end to end: visit the site once, lose the network
 * entirely (the server is shut down, not just throttled), and the app — deep
 * links, the lazily loaded engine chunk and the 13MB bgsage engine — still
 * works. Run against a real `pnpm build:web` output.
 */
test('works offline straight after the first visit', async ({ page, context }, testInfo) => {
  test.setTimeout(240_000);
  const server = await serveDist(`${process.cwd()}/dist`);

  await page.goto(server.url);
  await expect(page.getByRole('heading', { name: 'Backgammon Mastermind' })).toBeVisible({ timeout: 60_000 });

  // Wait until the worker has installed (precache complete) and controls the page.
  await page.evaluate(async () => {
    await navigator.serviceWorker.ready;
    if (!navigator.serviceWorker.controller) {
      await new Promise(resolve => navigator.serviceWorker.addEventListener('controllerchange', resolve, { once: true }));
    }
  });

  await server.close();
  await context.setOffline(true);

  await page.reload();
  await expect(page.getByRole('heading', { name: 'Backgammon Mastermind' })).toBeVisible({ timeout: 60_000 });
  await testInfo.attach('offline-home', { body: await page.screenshot(), contentType: 'image/png' });

  // A deep link never opened online still gets the shell, and the computer
  // opponent's engine runs from the cache.
  await page.goto(`${server.url}/developer`);
  const run = page.getByTestId('sage-run-analysis');
  await run.scrollIntoViewIfNeeded();
  await run.click();
  await expect(page.getByTestId('sage-status')).toHaveText('SAGE OK', { timeout: 180_000 });
  await expect(page.getByTestId('sage-moves')).toHaveText('17/20 19/20');
  await testInfo.attach('offline-engine', { body: await page.screenshot(), contentType: 'image/png' });

  // Legal pages are their own cached documents, never the app shell.
  await page.goto(`${server.url}/privacy`);
  await expect(page.getByRole('heading', { level: 1, name: 'Privacy Policy' })).toBeVisible();
});
