// pnpm copies file: dependencies into node_modules instead of symlinking.
// preinstall fetches the engine into expo-bgsage/ before that copy. This
// mirrors the tree again afterward so a fetch that landed in the workspace
// (or a copy taken before the fetch finished) still reaches the installed
// package that Gradle and CocoaPods compile.
import { cpSync, existsSync, realpathSync } from 'node:fs';
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

for (const rel of ['vendor', 'assets', 'ios/vendor']) {
  const from = path.join(srcRoot, rel);
  if (!existsSync(from))
    continue;
  cpSync(from, path.join(destRoot, rel), { recursive: true, force: true });
}
