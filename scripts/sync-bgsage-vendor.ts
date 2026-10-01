#!/usr/bin/env node
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
import {
  chmodSync,
  copyFileSync,
  existsSync,
  lstatSync,
  mkdirSync,
  readdirSync,
  readFileSync,
  readlinkSync,
  realpathSync,
  rmSync,
  symlinkSync,
} from 'node:fs';
import { join } from 'node:path';

/**
 * Never mirrored: VCS metadata, and build caches that must not ship inside a
 * package. Matched at every depth, so nested caches (vendor/bgsage/.git,
 * android/.gradle) are covered too. `node_modules` is left in place on the
 * destination; the other names are deleted there before the copy, because a
 * previous mirror may have copied them in.
 */
const SKIP_NAMES = new Set(['.git', '.gradle', 'build', '.expo', 'Pods', '.pin', 'node_modules']);
const PRUNE_NAMES = ['.git', '.gradle', 'build', '.expo', 'Pods', '.pin'];
const PRUNE_DIRS = ['', 'vendor/bgsage', 'android'];

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

function present(absPath: string): boolean {
  try {
    lstatSync(absPath);
    return true;
  }
  catch {
    return false;
  }
}

/** Copy `srcRoot` onto `destRoot`, dropping destination files the source no longer has. */
export function mirrorTrees(srcRoot: string, destRoot: string): void {
  for (const dir of PRUNE_DIRS) {
    for (const entry of PRUNE_NAMES)
      rmSync(join(destRoot, dir, entry), { recursive: true, force: true });
  }
  mkdirSync(destRoot, { recursive: true });
  syncDir(srcRoot, destRoot);
}

function syncDir(src: string, dest: string): void {
  const srcEntries = new Map(
    readdirSync(src, { withFileTypes: true }).map(entry => [entry.name, entry]),
  );

  for (const entry of readdirSync(dest, { withFileTypes: true })) {
    if (SKIP_NAMES.has(entry.name) || srcEntries.has(entry.name))
      continue;
    rmSync(join(dest, entry.name), { recursive: true, force: true });
  }

  for (const [name, entry] of srcEntries) {
    if (SKIP_NAMES.has(name))
      continue;
    const from = join(src, name);
    const to = join(dest, name);
    if (entry.isDirectory()) {
      if (present(to) && !lstatSync(to).isDirectory())
        rmSync(to, { recursive: true, force: true });
      mkdirSync(to, { recursive: true });
      syncDir(from, to);
      continue;
    }
    if (present(to))
      rmSync(to, { recursive: true, force: true });
    const fromStat = lstatSync(from);
    if (fromStat.isSymbolicLink()) {
      symlinkSync(readlinkSync(from), to);
    }
    else {
      copyFileSync(from, to);
      chmodSync(to, fromStat.mode);
    }
  }
}

function sha256(absPath: string): string {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

function verify(srcRoot: string, destRoot: string): string[] {
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

function run(): void {
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

  try {
    // Fail before deleting anything from a previously working installed module.
    for (const rel of REQUIRED) {
      if (!existsSync(join(srcRoot, rel)))
        throw new Error(`missing from workspace source: ${rel}`);
    }
    const sourceWeights = readdirSync(join(srcRoot, 'assets')).filter(f => f.endsWith('.weights.best'));
    if (sourceWeights.length !== WEIGHT_FILES) {
      throw new Error(`workspace source has ${sourceWeights.length} weights, expected ${WEIGHT_FILES}`);
    }
    mirrorTrees(srcRoot, destRoot);
  }
  catch (err) {
    console.error(`expo-bgsage: mirror failed — ${err instanceof Error ? err.message : String(err)}`);
    process.exit(1);
  }

  const problems = verify(srcRoot, destRoot);
  if (problems.length > 0) {
    console.error('expo-bgsage: installed copy is out of sync with expo-bgsage/');
    for (const p of problems)
      console.error(`  - ${p}`);
    console.error('  Fix: rm -rf node_modules/expo-bgsage && pnpm install --force');
    process.exit(1);
  }

  console.log('expo-bgsage: synced to node_modules/expo-bgsage and verified.');
}

if (process.env.JEST_WORKER_ID === undefined)
  run();
