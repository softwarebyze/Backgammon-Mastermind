/**
 * Generates dist/sw.js after `expo export -p web` (see `pnpm build:web`).
 * Run on its own with: pnpm tsx scripts/build-service-worker.ts [distDir]
 */
import { generateSW, getManifest } from 'workbox-build';

import { missingPrecacheFiles, precacheOptions, serviceWorkerOptions } from './service-worker-config.ts';

async function main(): Promise<void> {
  const distDir = process.argv[2] ?? 'dist';

  // Check the precache list before writing anything: a worker missing the
  // bundle or the engine would look fine online and break offline.
  const { manifestEntries } = await getManifest(precacheOptions(distDir));
  const missing = missingPrecacheFiles(manifestEntries ?? []);
  if (missing.length > 0) {
    throw new Error(`Service worker would not precache: ${missing.join(', ')}`);
  }

  const { count, size, warnings } = await generateSW(serviceWorkerOptions(distDir));
  for (const warning of warnings) {
    console.warn(`workbox: ${warning}`);
  }
  if (warnings.length > 0) {
    throw new Error('Workbox reported warnings; refusing to ship a partial offline cache.');
  }
  console.log(`sw.js: precaching ${count} files, ${(size / 1024 / 1024).toFixed(1)} MB`);
}

main().catch((error: unknown) => {
  console.error(error);
  process.exit(1);
});
