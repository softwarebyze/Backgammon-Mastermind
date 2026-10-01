/**
 * A failed WASM load must not stick. The first analysis throws; the next
 * one is allowed to load the module again.
 */
import { analyzeCheckers } from './web-engine';

describe('web engine load retry', () => {
  it('tries again after the module factory rejects', async () => {
    const board = Array.from({ length: 26 }, () => 0);
    let calls = 0;
    const mod = {
      _sage_create: () => 3,
      _sage_checkers: () => 1,
      _sage_last_error: () => 0,
      UTF8ToString: () => '{"moves":[]}',
      _malloc: () => 100,
      _free: () => {},
      HEAP32: { set: () => {} },
    };
    (globalThis as any).window = {
      SageModule: () => {
        calls += 1;
        if (calls === 1)
          return Promise.reject(new Error('network'));
        return Promise.resolve(mod);
      },
    };

    await expect(analyzeCheckers(board, 3, 1, 1)).rejects.toThrow('network');
    await expect(analyzeCheckers(board, 3, 1, 1)).resolves.toBe('{"moves":[]}');
    expect(calls).toBe(2);
  });
});
