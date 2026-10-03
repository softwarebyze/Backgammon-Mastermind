import { chmodSync, lstatSync, mkdirSync, mkdtempSync, readFileSync, rmSync, statSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { mirrorTrees } from './sync-bgsage-vendor';

let src: string;
let dest: string;

beforeEach(() => {
  const root = mkdtempSync(join(tmpdir(), 'bgsage-sync-'));
  src = join(root, 'src');
  dest = join(root, 'dest');
  mkdirSync(src);
  mkdirSync(dest);
});

afterEach(() => {
  rmSync(join(src, '..'), { recursive: true, force: true });
});

it('copies files, drops stale ones, and skips caches', () => {
  writeFileSync(join(src, 'a.txt'), 'new');
  mkdirSync(join(src, 'nested'));
  writeFileSync(join(src, 'nested', 'b.txt'), 'kept');
  mkdirSync(join(src, '.git'));
  writeFileSync(join(src, '.git', 'config'), 'nope');
  mkdirSync(join(src, 'node_modules'));
  writeFileSync(join(src, 'node_modules', 'pkg'), 'nope');
  writeFileSync(join(src, 'tool'), '#!/bin/sh\n');
  chmodSync(join(src, 'tool'), 0o755);

  writeFileSync(join(dest, 'a.txt'), 'old');
  writeFileSync(join(dest, 'extra.txt'), 'gone');
  mkdirSync(join(dest, 'nested'));
  writeFileSync(join(dest, 'nested', 'gone.txt'), 'gone');
  mkdirSync(join(dest, '.git'));
  writeFileSync(join(dest, '.git', 'old'), 'stale');
  mkdirSync(join(dest, 'node_modules'));
  writeFileSync(join(dest, 'node_modules', 'left'), 'stay');

  mirrorTrees(src, dest);

  expect(readFileSync(join(dest, 'a.txt'), 'utf8')).toBe('new');
  expect(readFileSync(join(dest, 'nested', 'b.txt'), 'utf8')).toBe('kept');
  expect(() => readFileSync(join(dest, 'extra.txt'))).toThrow();
  expect(() => readFileSync(join(dest, 'nested', 'gone.txt'))).toThrow();
  expect(() => readFileSync(join(dest, '.git', 'config'))).toThrow();
  expect(() => readFileSync(join(dest, '.git', 'old'))).toThrow();
  expect(() => readFileSync(join(dest, 'node_modules', 'pkg'))).toThrow();
  expect(readFileSync(join(dest, 'node_modules', 'left'), 'utf8')).toBe('stay');
  expect(statSync(join(dest, 'tool')).mode & 0o777).toBe(statSync(join(src, 'tool')).mode & 0o777);
});

it('replaces a file with a directory and keeps symlinks as links', () => {
  mkdirSync(join(src, 'was-file'));
  writeFileSync(join(src, 'was-file', 'inside.txt'), 'dir');
  writeFileSync(join(src, 'target.txt'), 'via link');
  symlinkSync('target.txt', join(src, 'link.txt'));
  writeFileSync(join(dest, 'was-file'), 'file');

  mirrorTrees(src, dest);

  expect(readFileSync(join(dest, 'was-file', 'inside.txt'), 'utf8')).toBe('dir');
  expect(lstatSync(join(dest, 'link.txt')).isSymbolicLink()).toBe(true);
  expect(readFileSync(join(dest, 'link.txt'), 'utf8')).toBe('via link');
});
