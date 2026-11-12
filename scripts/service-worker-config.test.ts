/** @jest-environment node */
import { Buffer } from 'node:buffer';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { dirname, join } from 'node:path';

// The deep import skips generateSW's rollup/babel bundler, which jest-expo
// cannot resolve; getManifest is the same code the build runs.
import { getManifest } from 'workbox-build/build/get-manifest';

import { missingPrecacheFiles, precacheOptions, serviceWorkerOptions } from './service-worker-config';

/** A miniature `expo export -p web` output. */
const DIST_FILES: Record<string, string | number> = {
  'index.html': '<html></html>',
  'metadata.json': '{}',
  'sw.js': '// previous worker',
  'privacy/index.html': 'privacy',
  'terms/index.html': 'terms',
  '_expo/static/js/web/entry-abc123.js': 'entry',
  '_expo/static/js/web/entry-abc123.js.map': 'map',
  '_expo/static/js/web/web-engine-def456.js': 'lazy chunk',
  'assets/assets/sounds/roll.123.wav': 'wav',
  'bgsage/bgsage.js': 'engine',
  'bgsage/bgsage.wasm': 'wasm',
  // Bigger than Workbox's 2MB default, like the real 13MB engine data.
  'bgsage/bgsage.data': 3 * 1024 * 1024,
};

function makeDist(files: Record<string, string | number>): string {
  const dir = mkdtempSync(join(tmpdir(), 'bam-dist-'));
  for (const [path, content] of Object.entries(files)) {
    mkdirSync(dirname(join(dir, path)), { recursive: true });
    writeFileSync(join(dir, path), typeof content === 'number' ? Buffer.alloc(content) : content);
  }
  return dir;
}

describe('web service worker precache', () => {
  let dist: string;
  beforeAll(() => {
    dist = makeDist(DIST_FILES);
  });
  afterAll(() => rmSync(dist, { recursive: true, force: true }));

  it('precaches every exported file, the lazy chunks and the full engine included', async () => {
    const { manifestEntries, warnings } = await getManifest(precacheOptions(dist));
    const urls = (manifestEntries ?? []).map(entry => entry.url).sort();
    expect(warnings).toEqual([]);
    expect(urls).toEqual([
      '/privacy',
      '/terms',
      '_expo/static/js/web/entry-abc123.js',
      '_expo/static/js/web/web-engine-def456.js',
      'assets/assets/sounds/roll.123.wav',
      'bgsage/bgsage.data',
      'bgsage/bgsage.js',
      'bgsage/bgsage.wasm',
      'index.html',
      'privacy/index.html',
      'terms/index.html',
    ]);
    expect(missingPrecacheFiles(manifestEntries ?? [])).toEqual([]);
  });

  it('names what a broken build would leave out', () => {
    expect(missingPrecacheFiles([{ url: 'index.html' }, { url: '/privacy' }, { url: '/terms' }])).toEqual([
      'JS entry bundle',
      'bgsage.js',
      'bgsage.wasm',
      'bgsage.data',
    ]);
  });

  it('serves app routes from the shell but never the legal pages', () => {
    const options = serviceWorkerOptions(dist);
    expect(options.navigateFallback).toBe('/index.html');
    const denied = (path: string) => options.navigateFallbackDenylist?.some(re => re.test(path));
    expect(denied('/privacy')).toBe(true);
    expect(denied('/terms/')).toBe(true);
    expect(denied('/game')).toBe(false);
    expect(denied('/privacy-settings')).toBe(false);
  });

  it('matches the engine URLs whatever their ?v= cache-buster', () => {
    const ignored = serviceWorkerOptions(dist).ignoreURLParametersMatching ?? [];
    expect(ignored.some(re => re.test('v'))).toBe(true);
  });
});
