/*
 * Backgammon Mastermind — web service worker.
 *
 * Hand-written and dependency-free on purpose: Expo's web export copies
 * `public/` verbatim, and the Vercel build runs `expo export -p web` with no
 * post-processing step. Keeping the whole worker in this one file means the
 * offline shell ships without a bundler hook.
 *
 * Strategy:
 *   - app navigations  -> network first, fall back to the cached SPA shell
 *   - /privacy, /terms -> network first, fall back to the exact cached page
 *                         (never the app shell — those are server-rendered)
 *   - /_expo, /assets, /bgsage -> cache first (hashed or versioned URLs)
 *   - everything else same-origin -> stale-while-revalidate
 *   - cross-origin (PostHog, fonts CDN) -> untouched, the network handles it
 *
 * The engine (13MB under /bgsage/) is cached on first use, like any asset.
 */
const VERSION = 'v1';
const SHELL_CACHE = `bam-shell-${VERSION}`;
const ASSET_CACHE = `bam-assets-${VERSION}`;

/** Cache key for the SPA shell; every app route is served from this one entry. */
const SHELL_URL = '/';

const SHELL_FILES = [
  '/',
  '/index.html',
  '/manifest.webmanifest',
  '/apple-touch-icon.png',
  '/favicon.png',
  '/favicon.ico',
  '/pwa-192.png',
  '/pwa-512.png',
  '/pwa-maskable-512.png',
  '/privacy',
  '/terms',
];

const IMMUTABLE_PREFIXES = ['/_expo/', '/assets/', '/bgsage/'];
const LEGAL_PATHS = ['/privacy', '/terms'];

function isLegalPath(pathname) {
  return LEGAL_PATHS.some(path => pathname === path || pathname.startsWith(`${path}/`));
}

function isImmutableAsset(pathname) {
  return IMMUTABLE_PREFIXES.some(prefix => pathname.startsWith(prefix));
}

/** Pure routing decision, exported for unit tests. */
function strategyFor(request, origin) {
  if (request.method !== 'GET') {
    return 'ignore';
  }
  const url = new URL(request.url);
  if (url.origin !== origin) {
    return 'ignore';
  }
  // The worker script itself must always come from the network.
  if (url.pathname === '/sw.js') {
    return 'ignore';
  }
  if (isLegalPath(url.pathname)) {
    return 'legal';
  }
  if (request.mode === 'navigate') {
    return 'navigation';
  }
  return isImmutableAsset(url.pathname) ? 'cache-first' : 'stale-while-revalidate';
}

async function precacheShell() {
  const cache = await caches.open(SHELL_CACHE);
  // One missing optional file must not fail the whole install.
  await Promise.all(SHELL_FILES.map(async (path) => {
    try {
      await cache.add(new Request(path, { cache: 'reload' }));
    }
    catch {}
  }));
}

async function handleNavigation(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(SHELL_URL, response.clone());
    }
    return response;
  }
  catch {
    return (await cache.match(SHELL_URL))
      || (await cache.match('/index.html'))
      || Response.error();
  }
}

async function handleLegal(request) {
  const cache = await caches.open(SHELL_CACHE);
  try {
    const response = await fetch(request);
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  }
  catch {
    return (await cache.match(request))
      || (await cache.match(request, { ignoreSearch: true }))
      || Response.error();
  }
}

async function handleCacheFirst(request) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  if (cached) {
    return cached;
  }
  const response = await fetch(request);
  if (response.ok) {
    await cache.put(request, response.clone());
  }
  return response;
}

async function handleStaleWhileRevalidate(request, event) {
  const cache = await caches.open(ASSET_CACHE);
  const cached = await cache.match(request);
  const network = fetch(request).then(async (response) => {
    if (response.ok) {
      await cache.put(request, response.clone());
    }
    return response;
  });
  if (cached) {
    // Keep the worker alive for the background refresh, and swallow the
    // offline rejection — the stale copy is still a valid answer.
    event.waitUntil(network.catch(() => {}));
    return cached;
  }
  return network;
}

function onInstall(event) {
  event.waitUntil(precacheShell().then(() => globalThis.skipWaiting()));
}

function onActivate(event) {
  event.waitUntil((async () => {
    const keep = new Set([SHELL_CACHE, ASSET_CACHE]);
    const names = await caches.keys();
    await Promise.all(
      names
        .filter(name => name.startsWith('bam-') && !keep.has(name))
        .map(name => caches.delete(name)),
    );
    await globalThis.clients.claim();
  })());
}

function onFetch(event) {
  const strategy = strategyFor(event.request, globalThis.location.origin);
  if (strategy === 'ignore') {
    return;
  }
  if (strategy === 'navigation') {
    event.respondWith(handleNavigation(event.request));
  }
  else if (strategy === 'legal') {
    event.respondWith(handleLegal(event.request));
  }
  else if (strategy === 'cache-first') {
    event.respondWith(handleCacheFirst(event.request));
  }
  else {
    event.respondWith(handleStaleWhileRevalidate(event.request, event));
  }
}

// A service worker has no `module`; the guarded export lets Jest load this
// file in a sandbox and test `strategyFor` without registering listeners.
if (typeof module !== 'undefined' && module.exports) {
  module.exports = { strategyFor, SHELL_CACHE, ASSET_CACHE, SHELL_FILES };
}
else if (typeof globalThis !== 'undefined') {
  globalThis.addEventListener('install', onInstall);
  globalThis.addEventListener('activate', onActivate);
  globalThis.addEventListener('fetch', onFetch);
}
