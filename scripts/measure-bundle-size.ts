/**
 * Measures an `expo export` output directory and prints a JSON snapshot.
 *
 *   pnpm tsx scripts/measure-bundle-size.ts <exportDir> <web|android> > size.json
 */
import type { ExportFile, Platform } from './bundle-size.ts';
import { readdirSync, readFileSync, statSync } from 'node:fs';
import { extname, join, relative } from 'node:path';
import { gzipSync } from 'node:zlib';

import { summarize } from './bundle-size.ts';

function walk(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap(entry =>
    entry.isDirectory() ? walk(join(dir, entry.name)) : [join(dir, entry.name)],
  );
}

function measure(root: string, path: string, ext: string): ExportFile {
  const full = join(root, path);
  const bytes = statSync(full).size;
  const isJs = ext === 'js' || ext === 'hbc';
  return { path, ext, bytes, gzipBytes: isJs ? gzipSync(readFileSync(full), { level: 9 }).length : undefined };
}

/** Web: everything the site serves (sw.js, sourcemaps and export bookkeeping aside). */
function webFiles(root: string): ExportFile[] {
  return walk(root)
    .map(full => relative(root, full).split('\\').join('/'))
    .filter(path => path !== 'metadata.json' && path !== 'sw.js' && !path.endsWith('.map'))
    .map(path => measure(root, path, extname(path).slice(1)));
}

/**
 * Native: only what ships inside the app / an OTA update — the Hermes bundle
 * and the assets listed in metadata.json. A native export also copies
 * public/ (web-only files), which is ignored here.
 */
function nativeFiles(root: string, platform: Platform): ExportFile[] {
  const metadata = JSON.parse(readFileSync(join(root, 'metadata.json'), 'utf8')) as {
    fileMetadata: Record<string, { bundle: string; assets: { path: string; ext: string }[] }>;
  };
  const { bundle, assets } = metadata.fileMetadata[platform];
  return [
    measure(root, bundle, extname(bundle).slice(1)),
    ...assets.map(asset => measure(root, asset.path, asset.ext)),
  ];
}

const [root, platform] = process.argv.slice(2) as [string, Platform];
if (!root || (platform !== 'web' && platform !== 'android')) {
  console.error('usage: measure-bundle-size.ts <exportDir> <web|android>');
  process.exit(1);
}
const files = platform === 'web' ? webFiles(root) : nativeFiles(root, platform);
console.log(JSON.stringify(summarize(platform, files), null, 2));
