import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import vm from 'node:vm';

type ServiceWorkerStrategy = 'ignore' | 'legal' | 'navigation' | 'cache-first' | 'stale-while-revalidate';

type ServiceWorkerContract = {
  strategyFor: (
    request: { method: string; mode: string; url: string },
    origin: string,
  ) => ServiceWorkerStrategy;
  SHELL_CACHE: string;
  ASSET_CACHE: string;
  SHELL_FILES: string[];
};

const ORIGIN = 'https://example.com';
const source = readFileSync(join(__dirname, '../../../public/sw.js'), 'utf8');

function loadServiceWorker(): ServiceWorkerContract {
  const module = { exports: {} as ServiceWorkerContract };
  vm.runInNewContext(source, { module, URL });
  return module.exports;
}

function request(path: string, init: { mode?: string; method?: string } = {}) {
  return { url: `${ORIGIN}${path}`, mode: init.mode ?? 'cors', method: init.method ?? 'GET' };
}

describe('service worker routing', () => {
  const worker = loadServiceWorker();

  it('serves app navigations from the network with the cached shell as fallback', () => {
    expect(worker.strategyFor(request('/', { mode: 'navigate' }), ORIGIN)).toBe('navigation');
    expect(worker.strategyFor(request('/game', { mode: 'navigate' }), ORIGIN)).toBe('navigation');
    expect(worker.strategyFor(request('/settings?tab=audio', { mode: 'navigate' }), ORIGIN)).toBe('navigation');
  });

  it('never answers a legal page with the app shell', () => {
    expect(worker.strategyFor(request('/privacy'), ORIGIN)).toBe('legal');
    expect(worker.strategyFor(request('/privacy/'), ORIGIN)).toBe('legal');
    expect(worker.strategyFor(request('/terms'), ORIGIN)).toBe('legal');
  });

  it('caches hashed app bundles, assets and the versioned engine first', () => {
    expect(worker.strategyFor(request('/_expo/static/js/web/entry-123.js'), ORIGIN)).toBe('cache-first');
    expect(worker.strategyFor(request('/assets/node_modules/inter.ttf'), ORIGIN)).toBe('cache-first');
    expect(worker.strategyFor(request('/bgsage/bgsage.wasm?v=context-v1'), ORIGIN)).toBe('cache-first');
    expect(worker.strategyFor(request('/bgsage/bgsage.data?v=context-v1'), ORIGIN)).toBe('cache-first');
  });

  it('revalidates the manifest, icons and other same-origin files in the background', () => {
    expect(worker.strategyFor(request('/manifest.webmanifest'), ORIGIN)).toBe('stale-while-revalidate');
    expect(worker.strategyFor(request('/pwa-192.png'), ORIGIN)).toBe('stale-while-revalidate');
  });

  it('leaves mutations, the worker itself and third-party traffic to the network', () => {
    expect(worker.strategyFor(request('/api/game', { method: 'POST' }), ORIGIN)).toBe('ignore');
    expect(worker.strategyFor(request('/sw.js'), ORIGIN)).toBe('ignore');
    expect(
      worker.strategyFor({ url: 'https://us.i.posthog.com/batch/', mode: 'cors', method: 'GET' }, ORIGIN),
    ).toBe('ignore');
  });

  it('precaches the shell and install icons, not the 13MB engine', () => {
    expect(worker.SHELL_FILES).toEqual(expect.arrayContaining([
      '/',
      '/index.html',
      '/manifest.webmanifest',
      '/pwa-192.png',
      '/pwa-512.png',
      '/pwa-maskable-512.png',
    ]));
    expect(worker.SHELL_FILES.some(file => file.startsWith('/bgsage/'))).toBe(false);
    expect(worker.SHELL_CACHE).not.toBe(worker.ASSET_CACHE);
  });
});
