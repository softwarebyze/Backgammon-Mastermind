// expo-bgsage/src/web-engine.ts — Web implementation of the Bgsage module API.
//
// There is no native module on web, so this loads the WebAssembly build of
// the engine (public/bgsage/bgsage.{js,wasm,data} in the host app) and
// exposes the same analyzeCheckers/analyzeCube signatures as the iOS/Android
// native modules. Everything is lazy: the ~13MB of weights only downloads
// the first time the user actually asks Sage for analysis.
//
// NOTE: keep every DOM access inside functions — this file is bundled into
// the native apps too (via src/index.ts), where it must never execute.

// Minimal ambient DOM so the module still compiles without DOM lib types.
declare const window: any;
declare const document: any;

type SageWasm = {
  _sage_create(): number;
  _sage_checkers(engine: number, boardPtr: number, d1: number, d2: number, ply: number): number;
  _sage_cube(engine: number, boardPtr: number, cubeVal: number, cubeOwner: number, ply: number): number;
  _sage_last_error(): number;
  UTF8ToString(ptr: number): string;
  _malloc(size: number): number;
  _free(ptr: number): void;
  HEAP32: { set(data: ArrayLike<number>, offset: number): void };
};

/** Served from the host app's public/ dir (Expo serves public/ at root). */
const ASSET_BASE = '/bgsage/';

let modulePromise: Promise<SageWasm> | null = null;
let engineHandle: number | null = null;

function loadScript(src: string): Promise<void> {
  return new Promise((resolve, reject) => {
    if (typeof window !== 'undefined' && typeof window.SageModule === 'function') {
      resolve();
      return;
    }
    const s = document.createElement('script');
    s.src = src;
    s.async = true;
    s.onload = () => resolve();
    s.onerror = () => reject(new Error(`failed to load ${src}`));
    document.head.appendChild(s);
  });
}

async function getWasm(): Promise<SageWasm> {
  if (!modulePromise) {
    modulePromise = (async (): Promise<SageWasm> => {
      await loadScript(`${ASSET_BASE}bgsage.js`);
      const factory = window.SageModule;
      if (typeof factory !== 'function') {
        throw new Error('bgsage.js did not expose a SageModule factory');
      }
      // locateFile keeps the .wasm/.data fetches under /bgsage/ too.
      const mod = await factory({
        locateFile: (path: string) => `${ASSET_BASE}${path}`,
      });
      return mod as SageWasm;
    })();
  }
  return modulePromise;
}

async function getEngine(): Promise<{ mod: SageWasm; engine: number }> {
  const mod = await getWasm();
  if (engineHandle === null) {
    engineHandle = mod._sage_create();
    if (!engineHandle) {
      const errPtr = mod._sage_last_error();
      throw new Error(
        'sage_create failed: ' + (errPtr ? mod.UTF8ToString(errPtr) : 'unknown error'),
      );
    }
  }
  return { mod, engine: engineHandle };
}

function callJson(
  mod: SageWasm,
  engine: number,
  fn: (engine: number, boardPtr: number, ...args: number[]) => number,
  board: number[],
  args: number[],
): string {
  if (board.length !== 26) {
    throw new Error(`sage web: board must be 26 ints, got ${board.length}`);
  }
  const ptr = mod._malloc(26 * 4);
  try {
    mod.HEAP32.set(board, ptr >> 2);
    const outPtr = fn(engine, ptr, ...args);
    try {
      return mod.UTF8ToString(outPtr);
    } finally {
      // The engine mallocs the JSON output (native bridges free it with
      // bgsage_mobile_free). Free it here too — otherwise every analyze
      // call leaks WASM heap until the tab crashes (iOS Safari).
      // free(NULL) is a no-op, so a null outPtr is safe.
      mod._free(outPtr);
    }
  } finally {
    mod._free(ptr);
  }
}

/** Same contract as the native Bgsage.analyzeCheckers: JSON string out. */
export async function analyzeCheckers(
  board: number[],
  die1: number,
  die2: number,
  ply: number,
): Promise<string> {
  const { mod, engine } = await getEngine();
  return callJson(mod, engine, mod._sage_checkers.bind(mod), board, [die1, die2, ply]);
}

/** Same contract as the native Bgsage.analyzeCube: JSON string out. */
export async function analyzeCube(
  board: number[],
  cubeValue: number,
  cubeOwner: number,
  ply: number,
): Promise<string> {
  const { mod, engine } = await getEngine();
  return callJson(mod, engine, mod._sage_cube.bind(mod), board, [cubeValue, cubeOwner, ply]);
}
