#!/usr/bin/env node
import { spawnSync } from 'node:child_process';
// Mirror the workspace expo-bgsage module over pnpm's installed copy of it.
//
// pnpm COPIES file: dependencies into node_modules; it does not symlink them,
// and it does not re-copy when the source directory changes. Neither
// `pnpm install`, `--force`, nor `--fix-lockfile` refreshes it. Edit
// expo-bgsage/ios/*.swift or expo-bgsage/src/*.ts without reinstalling and
// Gradle/CocoaPods/Metro keep compiling the stale copy with no error anywhere.
//
// So: mirror the directory, then hash-verify the files the native builds read.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, realpathSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const root = process.cwd();
const srcRoot = join(root, 'expo-bgsage');
const destRoot = join(root, 'node_modules', 'expo-bgsage');

if (!existsSync(destRoot)) {
  // pnpm has not installed the local dependency yet (e.g. `pnpm install`
  // aborted before linking). Nothing to sync.
  process.exit(0);
}

if (realpathSync(srcRoot) === realpathSync(destRoot)) {
  // pnpm linked instead of copying; the tree is already the source of truth.
  process.exit(0);
}

/**
 * Never mirrored: VCS metadata, and build caches that must not ship inside a
 * package. Unanchored rsync patterns match at every depth, so nested caches
 * (vendor/bgsage/.git, android/.gradle) are covered too.
 */
const EXCLUDES = ['.git/', '.gradle/', 'build/', '.expo/', 'Pods/', '.pin/', 'node_modules/'];

/**
 * rsync protects excluded paths on the receiving side from --delete, so a
 * directory a previous version of this script copied in would otherwise survive
 * forever. Prune the known stale spots explicitly before mirroring.
 */
const PRUNE_DIRS = ['', 'vendor/bgsage/', 'android/'];
const PRUNE_ENTRIES = ['.git', '.gradle', 'build', '.expo', 'Pods', '.pin'];

/** Files whose presence in the installed copy the native builds depend on. */
const REQUIRED = [
  'package.json',
  'src/index.ts',
  'plugin/index.js',
  'ios/expo-bgsage.podspec',
  'ios/BgsageModule.swift',
  'ios/vendor/bgsage/cpp/src/mobile.cpp',
  'android/src/main/java/com/bgsage/BgsageModule.kt',
  'android/src/main/cpp/CMakeLists.txt',
  'vendor/bgsage/cpp/src/mobile.cpp',
  'assets/bearoff_1sided.db',
];

/** The engine needs all 21 weight files; a partial copy fails only at runtime. */
const WEIGHT_FILES = 21;

function mirror(): void {
  for (const dir of PRUNE_DIRS) {
    for (const entry of PRUNE_ENTRIES) {
      rmSync(join(destRoot, dir, entry), { recursive: true, force: true });
    }
  }

  const args = [
    '-a',
    '--delete',
    ...EXCLUDES.map(pattern => `--exclude=${pattern}`),
    `${srcRoot}/`,
    `${destRoot}/`,
  ];
  const res = spawnSync('rsync', args, { stdio: 'inherit' });
  if (res.error) {
    throw new Error(`could not run \`rsync\`: ${res.error.message}`);
  }
  if (res.status !== 0) {
    throw new Error(`rsync exited ${res.status}; the installed copy may be incomplete`);
  }
}

function sha256(absPath: string): string {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

function verify(): string[] {
  const problems: string[] = [];
  for (const rel of REQUIRED) {
    const from = join(srcRoot, rel);
    const to = join(destRoot, rel);
    if (!existsSync(to)) {
      problems.push(`missing in installed copy: ${rel}`);
    }
    else if (sha256(from) !== sha256(to)) {
      problems.push(`content differs: ${rel}`);
    }
  }

  const assets = join(destRoot, 'assets');
  const weights = existsSync(assets)
    ? readdirSync(assets).filter(f => f.endsWith('.weights.best')).length
    : 0;
  if (weights !== WEIGHT_FILES) {
    problems.push(`installed copy has ${weights} weight files, expected ${WEIGHT_FILES}`);
  }

  return problems;
}

try {
  // Fail before --delete touches a previously working installed module.
  for (const rel of REQUIRED) {
    if (!existsSync(join(srcRoot, rel))) {
      throw new Error(`missing from workspace source: ${rel}`);
    }
  }
  const sourceWeights = readdirSync(join(srcRoot, 'assets')).filter(f => f.endsWith('.weights.best'));
  if (sourceWeights.length !== WEIGHT_FILES) {
    throw new Error(`workspace source has ${sourceWeights.length} weights, expected ${WEIGHT_FILES}`);
  }
  mirror();
}
catch (err) {
  console.error(`expo-bgsage: mirror failed — ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
}

const problems = verify();
if (problems.length > 0) {
  console.error('expo-bgsage: installed copy is out of sync with expo-bgsage/');
  for (const p of problems) {
    console.error(`  - ${p}`);
  }
  console.error('  Fix: rm -rf node_modules/expo-bgsage && pnpm install --force');
  process.exit(1);
}

console.log('expo-bgsage: synced to node_modules/expo-bgsage and verified.');
