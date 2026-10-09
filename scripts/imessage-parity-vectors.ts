/* eslint-disable no-console */
// Generates parity vectors for the Swift harness (targets/imessage parity).
// Run: pnpm dlx tsx scripts/imessage-parity-vectors.ts
import { createPositionState } from '../src/lib/game/create-position';
import { applyMove, getLegalMoves } from '../src/lib/game/moves';
import { buildImessageUrl } from '../src/lib/imessage/codec';

function movesSummary(label: string, dice: [number, number], mutate?: (s: any) => any) {
  let state = createPositionState({ useStandardSetup: true, mode: 'vs-human', dice });
  if (mutate) {
    state = mutate(state);
  }
  const moves = getLegalMoves(state)
    .map(m => `${m.from}>${m.to}`)
    .sort();
  console.log(`${label} moves=${moves.join(',')}`);
  return state;
}

const s1 = movesSummary('OPENING_31_WHITE', [3, 1]);

// Bar re-entry: white blot hit to bar, then white to move with [4,2].
movesSummary('BAR_ENTRY_42_WHITE', [4, 2], (s: any) => {
  s.points[8] = { player: null, count: 0 };
  s.points[6] = { player: 'white', count: 4 };
  s.bar = { white: 1, black: 0 };
  return s;
});

// Bear-off overshoot: white all home, high point occupied.
movesSummary('BEAROFF_WHITE', [6, 3], (s: any) => {
  for (let p = 1; p <= 24; p++) {
    s.points[p] = { player: null, count: 0 };
  }
  s.points[6] = { player: 'white', count: 3 };
  s.points[4] = { player: 'white', count: 5 };
  s.points[2] = { player: 'white', count: 7 };
  s.borneOff = { white: 0, black: 0 };
  s.bar = { white: 0, black: 0 };
  // black keeps 15 on board so counts balance
  s.points[1] = { player: 'black', count: 2 };
  s.points[12] = { player: 'black', count: 5 };
  s.points[17] = { player: 'black', count: 3 };
  s.points[19] = { player: 'black', count: 5 };
  return s;
});

// Doubles grant four moves.
{
  const state = createPositionState({ useStandardSetup: true, mode: 'vs-human', dice: [2, 2] });
  console.log(`DOUBLES_REMAINING count=${state.remainingDice.length}`);
}

// Apply one opening move and show the resulting URL payload.
{
  const first = getLegalMoves(s1).find(m => m.from === 8);
  const after = first ? applyMove(s1, first) : s1;
  const url = buildImessageUrl({
    gid: 'ParityVec01',
    turn: 1,
    cur: after.currentPlayer,
    points: after.points,
    bar: after.bar,
    off: after.borneOff,
    win: after.winner,
    dice: [3, 1],
    last: 'played 3–1',
  });
  console.log(`URL_AFTER_MOVE ${url}`);
}

// Opening URL (untouched standard position).
{
  const url = buildImessageUrl({
    gid: 'Ab3dEf7hIj9K',
    turn: 7,
    cur: 'black',
    points: s1.points,
    bar: { white: 0, black: 0 },
    off: { white: 0, black: 0 },
    win: null,
    dice: [5, 2],
    last: 'moved 13→8 · 6→4',
  });
  console.log(`URL_OPENING ${url}`);
}
