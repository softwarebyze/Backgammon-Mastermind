// Real engine integration checks. Build the native probe first; committed WASM
// is loaded from disk. No mocks, network, device, or platform-specific app code.
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { resolve } from 'node:path';
import { execFileSync } from 'node:child_process';
const require = createRequire(import.meta.url);
const base = resolve('public/bgsage');
const factory = require(`${base}/bgsage.js`);
const mod = await factory({ locateFile: f => `${base}/${f}`, wasmBinary: readFileSync(`${base}/bgsage.wasm`) });
const handle = mod._sage_create();
assert.ok(handle, 'WASM initialized');
const board = Array(26).fill(0);
board[6] = 15; board[19] = -15;
const starting = Array(26).fill(0);
for (const [point, count] of [[24, 2], [13, 5], [8, 3], [6, 5], [1, -2], [12, -5], [17, -3], [19, -5]]) starting[point] = count;
const computerOffer = Array(26).fill(0);
computerOffer[4] = 14; computerOffer[19] = -14; // Both sides have borne one off.
const computerTake = Array(26).fill(0);
computerTake[15] = 15; computerTake[10] = -15;
const computerDrop = Array(26).fill(0);
computerDrop[2] = 15; computerDrop[10] = -15;
const cases = [
  ['computer match offer', computerOffer, 1, 2, [1, 0, 2, 3, 0, 0, 0, 32768], { should_double: true }],
  ['computer match take', computerTake, 1, 2, [1, 0, 3, 3, 0, 0, 0, 32768], { should_take: true }],
  ['computer match drop', computerDrop, 1, 2, [1, 0, 3, 3, 0, 0, 0, 32768], { should_take: false }],
  ['money Jacoby', board, 1, 2, [1, 0, 0, 0, 0, 1, 0, 32768]],
  ['money no Jacoby', starting, 1, 1, [1, 0, 0, 0, 0, 0, 0, 32768]],
  ['Beavers', starting, 1, 1, [1, 0, 0, 0, 0, 1, 1, 32768]],
  ['owned cube', board, 1, 2, [4, 1, 0, 0, 0, 0, 1, 32768]],
  ['opponent cube', board, 1, 2, [4, 2, 0, 0, 0, 0, 0, 32768]],
  ['match score', board, 1, 2, [2, 1, 3, 5, 0, 0, 0, 32768]],
  ['Crawford', board, 1, 2, [1, 0, 1, 3, 1, 0, 0, 32768]],
  ['post Crawford', board, 1, 2, [1, 0, 1, 3, 0, 0, 0, 32768]],
  ['no Crawford rule', board, 1, 2, [2, 1, 3, 5, 0, 0, 0, 32768, 0]],
  ['25-point match', board, 1, 1, [1, 0, 25, 25, 0, 0, 0, 32768]],
  ['checker cube owner', starting, 0, 1, [2, 1, 0, 0, 0, 0, 0, 32768]],
  ['checker match', starting, 0, 1, [2, 2, 3, 5, 0, 0, 0, 32768]],
  ['checker money 2-ply', starting, 0, 2, [2, 1, 0, 0, 0, 1, 0, 32768]],
  ['checker match 2-ply', starting, 0, 2, [2, 2, 3, 5, 0, 0, 0, 32768]],
  ['checker cubeless', starting, 0, 1, [1, 0, 0, 0, 0, 0, 0, 1]],
];
function near(a, b) {
  assert.ok(Number.isFinite(a) && Number.isFinite(b));
  assert.ok(Math.abs(a - b) <= 0.0002, `${a} differs from ${b}`);
}
for (const [label, b, operation, ply, rawContext, expected] of cases) {
  const context = rawContext.length === 8 ? [...rawContext, 1] : rawContext;
  const bp = mod._malloc(104), cp = mod._malloc(36);
  mod.HEAP32.set(b, bp / 4); mod.HEAP32.set(context, cp / 4);
  const ptr = mod._sage_analyze(handle, bp, operation, 3, 1, ply, cp);
  assert.ok(ptr, `${label}: ${mod.UTF8ToString(mod._sage_last_error())}`);
  const web = JSON.parse(mod.UTF8ToString(ptr));
  mod._free(ptr); mod._free(cp); mod._free(bp);
  const native = JSON.parse(execFileSync(process.env.BGSAGE_PROBE ?? '/tmp/bgsage-context-probe', [operation, ply, 3, 1, ...b, ...context].map(String), { encoding: 'utf8' }));
  for (const [field, value] of Object.entries(expected ?? {})) assert.equal(web[field], value, `${label}: fixture still exercises ${field}`);
  if (operation === 1) {
    for (const field of ['should_double', 'should_take', 'is_beaver']) assert.equal(web[field], native[field], `${label}: ${field}`);
    for (const field of ['equity_nd', 'equity_dt', 'equity_dp']) near(web[field], native[field]);
  } else {
    assert.equal(web.moves.length, native.moves.length);
    assert.deepEqual(web.moves[0].board, native.moves[0].board, `${label}: best checker play`);
    for (const candidate of web.moves) {
      const n = native.moves.find(c => JSON.stringify(c.board) === JSON.stringify(candidate.board));
      assert.ok(n, label); near(candidate.equity, n.equity);
    }
  }
  console.log(`PASS ${label}`);
}
