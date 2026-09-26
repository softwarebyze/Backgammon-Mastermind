// pnpm copies file: dependencies into node_modules instead of symlinking.
// preinstall fetches the engine into expo-bgsage/ before that copy. This
// mirrors the tree again afterward so a fetch that landed in the workspace
// (or a copy taken before the fetch finished) still reaches the installed
// package that Gradle and CocoaPods compile.
import { cpSync, existsSync, realpathSync, rmSync } from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const srcRoot = path.join(root, 'expo-bgsage');
const destRoot = path.join(root, 'node_modules', 'expo-bgsage');

if (!existsSync(destRoot)) {
  process.exit(0);
}

if (realpathSync(srcRoot) === realpathSync(destRoot)) {
  process.exit(0);
}

// Copy only build inputs. The fetched vendor directory is a Git checkout;
// copying its .git directory can fail on CI and is unnecessary in a package.
// Replace each subtree so repeated installs cannot leave stale engine files.
for (const rel of ['vendor/bgsage/cpp', 'assets', 'ios/vendor/bgsage/cpp']) {
  const from = path.join(srcRoot, rel);
  if (!existsSync(from))
    continue;
  const to = path.join(destRoot, rel);
  rmSync(to, { recursive: true, force: true });
  cpSync(from, to, { recursive: true });
}
