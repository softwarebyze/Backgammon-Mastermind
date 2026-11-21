import type { GenerateSWOptions, GetManifestOptions, ManifestEntry } from 'workbox-build';

/**
 * Offline contract for the web build.
 *
 * Every file `expo export -p web` writes to dist/ is precached when the
 * service worker installs — the JS bundle and its lazy chunks, fonts, sounds,
 * images and the bgsage engine — so a player who goes offline right after
 * their first visit still gets the whole app, computer opponent included.
 *
 * Workbox stamps each entry with a content hash: a deploy re-downloads only
 * the files that changed, and nothing has to be versioned by hand.
 */

/** The engine (bgsage.data ≈ 13MB) must fit; Workbox's default cap is 2MB. */
const MAX_FILE_BYTES = 25 * 1024 * 1024;

/** Server-rendered pages that must never be answered with the app shell. */
const LEGAL_PAGES = ['privacy', 'terms'] as const;

/** What gets precached — shared by the build and the unit tests. */
export function precacheOptions(distDir: string): GetManifestOptions {
  return {
    globDirectory: distDir,
    globPatterns: ['**/*'],
    // sw.js is the worker itself; metadata.json is Expo export bookkeeping.
    globIgnores: ['sw.js', 'metadata.json', '**/*.map'],
    maximumFileSizeToCacheInBytes: MAX_FILE_BYTES,
    // `/privacy` (no slash) is a Vercel rewrite of privacy/index.html; cache
    // it under the URL players actually open. `/privacy/` resolves to the
    // globbed privacy/index.html via Workbox's directoryIndex.
    templatedURLs: Object.fromEntries(
      LEGAL_PAGES.map(page => [`/${page}`, [`${page}/index.html`]]),
    ),
  };
}

export function serviceWorkerOptions(distDir: string): GenerateSWOptions {
  return {
    ...precacheOptions(distDir),
    swDest: `${distDir}/sw.js`,
    cacheId: 'bam',
    mode: 'production',
    sourcemap: false,
    // One self-contained file: no runtime fetched from a CDN, no extra chunk.
    inlineWorkboxRuntime: true,
    // Every app route is the same SPA shell.
    navigateFallback: '/index.html',
    navigateFallbackDenylist: LEGAL_PAGES.map(page => new RegExp(`^/${page}(/|$)`)),
    // The engine is loaded as /bgsage/bgsage.js?v=<context>; `v` only busts
    // the HTTP cache, and the precache revision already tracks the content.
    ignoreURLParametersMatching: [/^utm_/, /^fbclid$/, /^v$/],
    // Take over straight away; pwa.ts offers a reload toast on updates.
    skipWaiting: true,
    clientsClaim: true,
    cleanupOutdatedCaches: true,
  };
}

/**
 * Files the app cannot start (or play the computer) without. A build that
 * would precache less than this fails loudly instead of shipping a worker
 * that only works online.
 */
const REQUIRED: { label: string; test: (url: string) => boolean }[] = [
  { label: 'index.html', test: url => url === 'index.html' },
  { label: 'JS entry bundle', test: url => /^_expo\/static\/js\/web\/entry-[\w-]+\.js$/.test(url) },
  { label: 'bgsage.js', test: url => url === 'bgsage/bgsage.js' },
  { label: 'bgsage.wasm', test: url => url === 'bgsage/bgsage.wasm' },
  { label: 'bgsage.data', test: url => url === 'bgsage/bgsage.data' },
  { label: '/privacy', test: url => url === '/privacy' },
  { label: '/terms', test: url => url === '/terms' },
];

export function missingPrecacheFiles(entries: Pick<ManifestEntry, 'url'>[]): string[] {
  const urls = entries.map(entry => entry.url);
  return REQUIRED.filter(({ test }) => !urls.some(test)).map(({ label }) => label);
}
