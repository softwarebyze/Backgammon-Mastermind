/**
 * Regression test for the web WASM bridge's memory contract.
 *
 * The web `_sage_checkers`/`_sage_cube` entry points return a pointer to a
 * REUSED static output buffer (verified: same address across calls, WASM
 * heap never grows) — unlike the native bridges, where `bgsage_mobile_free`
 * frees a per-call malloc. Freeing the output pointer with Emscripten's
 * `_free` corrupts the heap and crashes the tab after a few analyses.
 *
 * These tests lock in: free the input board buffer, never the output.
 */
import { analyzeCheckers, analyzeCube } from './web-engine';

describe('web-engine memory contract', () => {
  const INPUT_PTR = 1000;
  const OUTPUT_PTR = 30658080; // static buffer address (stable across calls)

  let freeCalls: number[];
  let mallocCalls: number[];
  /** Every mock module the SageModule factory has produced (web-engine caches the first). */
  const createdMods: any[] = [];

  const board26 = () => {
    const b = Array.from({ length: 26 }).fill(0);
    b[24] = 2;
    b[13] = 5;
    b[8] = 3;
    b[6] = 5;
    b[1] = -2;
    b[12] = -5;
    b[17] = -3;
    b[19] = -5;
    return b;
  };

  beforeEach(() => {
    freeCalls = [];
    mallocCalls = [];

    const mockMod = {
      _sage_create: jest.fn(() => 7),
      _sage_checkers: jest.fn(() => OUTPUT_PTR),
      _sage_cube: jest.fn(() => OUTPUT_PTR),
      _sage_last_error: jest.fn(() => 0),
      UTF8ToString: jest.fn(() => '{"moves":[]}'),
      _malloc: jest.fn((size: number) => {
        mallocCalls.push(size);
        return INPUT_PTR;
      }),
      _free: jest.fn((ptr: number) => {
        freeCalls.push(ptr);
      }),
      HEAP32: { set: jest.fn() },
    };
    (globalThis as any).window = (globalThis as any).window ?? {};
    (globalThis as any).window.SageModule = jest.fn(async () => {
      createdMods.push(mockMod);
      return mockMod;
    });
    // loadScript short-circuits when window.SageModule is a function.
  });

  afterEach(() => {
    jest.restoreAllMocks();
    delete (globalThis as any).window.SageModule;
  });

  it('analyzeCheckers frees the input board but never the static output buffer', async () => {
    const out = await analyzeCheckers(board26(), 3, 1, 2);
    expect(out).toBe('{"moves":[]}');
    expect(mallocCalls).toEqual([26 * 4]);
    // Input buffer must be freed…
    expect(freeCalls).toContain(INPUT_PTR);
    // …but the engine's static output buffer must NOT be freed.
    expect(freeCalls).not.toContain(OUTPUT_PTR);
  });

  it('analyzeCube frees the input board but never the static output buffer', async () => {
    await analyzeCube(board26(), 2, 0, 2);
    expect(freeCalls).toContain(INPUT_PTR);
    expect(freeCalls).not.toContain(OUTPUT_PTR);
  });

  it('input board is freed even when the engine throws', async () => {
    // web-engine caches the module from the first test — grab that mock.
    const firstMod = createdMods[0] ?? (await (globalThis as any).window.SageModule());
    firstMod._sage_checkers.mockImplementation(() => {
      throw new Error('Aborted');
    });
    await expect(analyzeCheckers(board26(), 3, 1, 2)).rejects.toThrow('Aborted');
    expect(freeCalls).toContain(INPUT_PTR);
    expect(freeCalls).not.toContain(OUTPUT_PTR);
  });
});
