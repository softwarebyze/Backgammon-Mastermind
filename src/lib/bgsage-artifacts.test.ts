import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

// Guards the bgsage artifacts and native wiring against silent drift.
//
// Two classes of problem are covered:
//
//  1. public/bgsage/* are *prebuilt* binaries checked into the repo. Nothing
//     regenerates them in CI, so a swapped or truncated file would ship as a
//     silently broken web engine. The SHA-256 manifest below is the pin.
//     They are not reproducible from the vendored source today: the WASM
//     shim that turns bgsage's C++ engine into public/bgsage/bgsage.wasm is
//     not vendored in expo-bgsage/vendor, and emcc is not a build dependency.
//     These bytes came from a prebuilt upstream artifact, so "bump the pin"
//     means replacing the files by hand and re-hashing, not a local rebuild.
//  2. The engine takes 21 weight files in a fixed *strategy order*, and both
//     native modules hardcode that order. Reordering one list changes which
//     network answers which position, so the lists are compared to each other
//     and to the files actually on disk.

const root = join(__dirname, '../..');
const publicDir = join(root, 'public/bgsage');
const assetsDir = join(root, 'expo-bgsage/assets');

/** Pin for the committed prebuilt web engine. Bump deliberately, never by accident. */
const WASM_MANIFEST = {
  'bgsage.data': 'b737d93e8ecd6e354a2bb1456c07b78cdda3f619cf0789011de28168f5ac00ee',
  'bgsage.js': 'a9ad0aa0819c056b76f3caebbbb45fca73bdd8385a4db20c959dc1d19a563d81',
  'bgsage.wasm': '9407e5f424b6f6131b4847d020c402f50f2e07eb61cd00583a6fd6d05416b2ba',
} as const;

/**
 * Raw C entry points the JS glue calls. Emscripten exposes C symbols on the
 * WASM instance under their bare name; the glue re-exports them to JS with a
 * leading underscore. Keeping both lists explicit makes a glue/binary mismatch
 * a test failure rather than a runtime "is not a function".
 */
const C_EXPORTS = ['sage_create', 'sage_checkers', 'sage_cube', 'sage_last_error'] as const;

function sha256(absPath: string): string {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

/** Model names in strategy order, de-duplicated by first occurrence. */
function strategyOrder(source: string): string[] {
  const names = [...source.matchAll(/["'](sl_[a-z0-9_]+)["']/g)].map(m => m[1]);
  return [...new Set(names)];
}

describe('committed bgsage web engine', () => {
  it.each(Object.entries(WASM_MANIFEST))('%s matches its pinned SHA-256', (name, expected) => {
    const file = join(publicDir, name);
    expect(existsSync(file)).toBe(true);
    expect(sha256(file)).toBe(expected);
  });

  it('exposes every C entry point the JS glue depends on', async () => {
    const bytes = readFileSync(join(publicDir, 'bgsage.wasm'));
    const module = new WebAssembly.Module(bytes);
    // Emscripten output imports env/WASI shims. Stubbing every import is
    // enough to link: this asserts the export table, it never runs the engine.
    const imports: Record<string, Record<string, () => void>> = {};
    for (const imp of WebAssembly.Module.imports(module)) {
      imports[imp.module] ??= {};
      imports[imp.module][imp.name] = () => undefined;
    }
    const instance = await WebAssembly.instantiate(module, imports);
    for (const symbol of C_EXPORTS) {
      expect(typeof instance.exports[symbol]).toBe('function');
    }
  });

  it('ships JS glue that re-exports each C entry point and loads both binary assets', () => {
    const glue = readFileSync(join(publicDir, 'bgsage.js'), 'utf8');
    for (const symbol of C_EXPORTS) {
      expect(glue).toContain(`_${symbol}`);
    }
    // Without these the glue fetches from the wrong origin and 404s in prod.
    expect(glue).toContain('bgsage.wasm');
    expect(glue).toContain('bgsage.data');
  });
});

describe('bgsage native model wiring', () => {
  const onDisk = readdirSync(assetsDir)
    .filter(f => f.endsWith('.weights.best'))
    .map(f => f.replace('.weights.best', ''))
    .sort();

  const ios = strategyOrder(readFileSync(join(root, 'expo-bgsage/ios/BgsageModule.swift'), 'utf8'));
  const android = strategyOrder(
    readFileSync(join(root, 'expo-bgsage/android/src/main/java/com/bgsage/BgsageModule.kt'), 'utf8'),
  );
  const plugin = strategyOrder(readFileSync(join(root, 'expo-bgsage/plugin/index.js'), 'utf8'));

  it('ships exactly 21 weights plus the bearoff database', () => {
    expect(onDisk).toHaveLength(21);
    expect(readdirSync(assetsDir)).toContain('bearoff_1sided.db');
    expect(readdirSync(assetsDir)).toHaveLength(22);
  });

  it('lists the same models, in the same order, on iOS and Android', () => {
    expect(ios).toEqual(android);
  });

  it('lists the same models, in the same order, in the config plugin', () => {
    expect(ios).toEqual(plugin);
  });

  it('references only weight files that exist', () => {
    const missing = ios.filter(n => !onDisk.includes(n));
    expect(missing).toEqual([]);
    expect([...ios].sort()).toEqual(onDisk);
  });

  it('keeps the deliberate prim_anch aliases that give 24 native slots for 21 files', () => {
    const raw = [
      ...readFileSync(join(root, 'expo-bgsage/ios/BgsageModule.swift'), 'utf8').matchAll(
        /["'](sl_[a-z0-9_]+)["']/g,
      ),
    ].map(m => m[1]);
    // Slot 0 is 100 hidden units, the rest are 400 — the duplication is the
    // strategy's canonical aliases resolving to the same file, not a mistake.
    expect(raw).toHaveLength(24);
    expect(new Set(raw).size).toBe(21);
    expect(raw.filter(n => n === 'sl_s9_prim_anch')).toHaveLength(4);
  });
});
