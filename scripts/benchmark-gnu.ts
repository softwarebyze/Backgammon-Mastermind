import type { GameState } from '../src/lib/game/types';
/**
 * Node harness: load vendored gnubg-core and verify opening agreement.
 * Usage: pnpm benchmark:gnu
 */
import { dirname, join } from 'node:path';

import { fileURLToPath, pathToFileURL } from 'node:url';
import { getAIMove } from '../src/lib/game/ai';
import { createPositionState } from '../src/lib/game/create-position';
import { resolveGnuPlay } from '../src/lib/game/gnu-play';
import { applyMove } from '../src/lib/game/moves';
import { toXgid } from '../src/lib/game/xgid';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const gnubgDir = join(root, 'public', 'gnubg');

const OPENINGS: { id: string; dice: [number, number]; expect: string }[] = [
  { id: '3-1', dice: [3, 1], expect: '8/5 6/5' },
  { id: '4-2', dice: [4, 2], expect: '8/4 6/4' },
  { id: '6-1', dice: [6, 1], expect: '13/7 8/7' },
  { id: '6-5', dice: [6, 5], expect: '24/13' },
  { id: '5-4', dice: [5, 4], expect: '13/8 13/9' },
  { id: '2-1', dice: [2, 1], expect: '13/11 6/5' },
];

async function loadGnu() {
  const modPath = pathToFileURL(join(gnubgDir, 'gnubg-core-module.js')).href;
  const createGnubgCoreModule = (await import(modPath)).default;
  const Module = await createGnubgCoreModule({
    locateFile: (p: string) => join(gnubgDir, p),
  });
  const modInit = Module.cwrap('init', 'number', []);
  const modHint = Module.cwrap('hint', 'number', ['string', 'number']);
  modInit();
  return {
    hint(xgid: string, depth: number) {
      const ptr = modHint(xgid, depth);
      const str = Module.UTF8ToString(ptr);
      Module._free(ptr);
      return JSON.parse(str) as {
        action: string;
        data?: { move: string }[];
      };
    },
  };
}

function playHeuristicTurn(state: GameState): string {
  const plies: string[] = [];
  let s = state;
  for (let i = 0; i < 8 && s.phase === 'moving'; i++) {
    const m = getAIMove(s);
    if (!m)
      break;
    plies.push(`${m.from}/${m.to}`);
    s = applyMove(s, m);
  }
  return plies.join(' ');
}

function theoryMatch(id: string, best: string, expect: string): boolean {
  if (best === expect)
    return true;
  if (id === '6-5')
    return best === '24/13' || best === '24/18 18/13';
  if (id === '6-1')
    return best === '13/7 8/7' || best === '8/7 13/7';
  if (id === '2-1')
    return best.includes('13/11') || best.includes('6/5');
  return false;
}

async function main() {
  console.log('Loading GNU WASM…');
  const gnu = await loadGnu();
  console.log('GNU ready. Opening suite:\n');

  let gnuOk = 0;
  let mapOk = 0;
  let heurMatch = 0;

  for (const c of OPENINGS) {
    const state = createPositionState({
      useStandardSetup: true,
      dice: c.dice,
      currentPlayer: 'white',
    });
    const xgid = toXgid(state);
    const hint = gnu.hint(xgid, 1);
    const best = hint?.data?.[0]?.move ?? '';
    const matchedTheory = theoryMatch(c.id, best, c.expect);
    if (matchedTheory)
      gnuOk += 1;

    const mapped = best ? resolveGnuPlay(state, best) : null;
    if (mapped)
      mapOk += 1;

    const heur = playHeuristicTurn(state);
    const mappedStr = mapped?.map(m => `${m.from}/${m.to}`).join(' ') ?? '';
    const agrees = Boolean(mapped && heur === mappedStr);
    if (agrees)
      heurMatch += 1;

    console.log(
      `${c.id}: GNU="${best}" theory=${matchedTheory ? 'ok' : 'diff'} `
      + `map=${mapped ? 'ok' : 'FAIL'} heur="${heur}" ${agrees ? '(=gnu)' : '(≠gnu)'}`,
    );
  }

  console.log(`\nGNU vs Magriel theory: ${gnuOk}/${OPENINGS.length}`);
  console.log(`GNU→engine move map:   ${mapOk}/${OPENINGS.length}`);
  console.log(`Heuristic vs GNU:      ${heurMatch}/${OPENINGS.length}`);

  if (mapOk < OPENINGS.length) {
    process.exitCode = 1;
  }
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
