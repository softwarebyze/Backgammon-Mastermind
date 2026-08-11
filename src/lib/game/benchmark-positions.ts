/**
 * Opening-book and tactical positions for engine benchmarks.
 * Accepted sequences follow Magriel / common teaching consensus.
 */
import type { PointPlacement } from './create-position';
import type { GameState } from './types';

import { createPositionState } from './create-position';

export type OpeningCase = {
  id: string;
  dice: [number, number];
  /** Accepted full-turn move labels like "8→5", order-sensitive preferred plays. */
  acceptedSequences: string[][];
  note: string;
};

export const OPENING_CASES: OpeningCase[] = [
  {
    id: '3-1',
    dice: [3, 1],
    acceptedSequences: [
      ['8→5', '6→5'],
      ['6→5', '8→5'],
    ],
    note: 'Make the 5-point — classic Magriel “best opening.”',
  },
  {
    id: '4-2',
    dice: [4, 2],
    acceptedSequences: [
      ['8→4', '6→4'],
      ['6→4', '8→4'],
    ],
    note: 'Make the 4-point.',
  },
  {
    id: '6-1',
    dice: [6, 1],
    acceptedSequences: [
      ['13→7', '8→7'],
      ['8→7', '13→7'],
    ],
    note: 'Make the bar point (7).',
  },
  {
    id: '6-5',
    dice: [6, 5],
    acceptedSequences: [
      ['24→18', '18→13'],
      ['24→13'],
    ],
    note: 'Running play 24/13.',
  },
  {
    id: '5-3',
    dice: [5, 3],
    acceptedSequences: [
      ['8→3', '6→3'],
      ['6→3', '8→3'],
      ['24→16'],
      ['13→8', '13→10'],
      ['13→10', '13→8'],
    ],
    note: 'Often make 3-point or down from midpoint — contested.',
  },
  {
    id: '2-1',
    dice: [2, 1],
    acceptedSequences: [
      ['13→11', '6→5'],
      ['6→5', '13→11'],
      ['24→23', '13→11'],
      ['13→11', '24→23'],
      ['24→23', '6→5'],
      ['6→5', '24→23'],
    ],
    note: 'Slotting / splitting — several respectable plays.',
  },
];

export type TacticCase = {
  id: string;
  description: string;
  dice: [number, number];
  placements: PointPlacement[];
  bar?: { white?: number; black?: number };
  /** Any of these first-ply moves counts as correct. */
  mustIncludeFirstPly: string[];
};

export const TACTIC_CASES: TacticCase[] = [
  {
    id: 'hit-blot-on-5',
    description:
      'Standard setup with a Black blot on the 5-point; White rolls 3-1 — hitting/making 5 is correct.',
    dice: [3, 1],
    placements: [
      { point: 5, player: 'black', count: 1 },
      { point: 19, player: 'black', count: 4 },
    ],
    mustIncludeFirstPly: ['8→5', '6→5'],
  },
  {
    id: 'enter-from-bar',
    description:
      'White on the bar with 6-1; point 19 cleared — must enter (bar→19 or bar→24).',
    dice: [6, 1],
    placements: [
      { point: 13, player: 'white', count: 4 },
      { point: 19, player: 'black', count: 0 },
    ],
    bar: { white: 1 },
    mustIncludeFirstPly: ['bar→19', 'bar→24'],
  },
];

/** Standard opening position with the given roll, White to play. */
export function openingState(dice: [number, number]): GameState {
  return createPositionState({
    useStandardSetup: true,
    dice,
    currentPlayer: 'white',
    mode: 'vs-computer',
  });
}

export function tacticState(tactic: TacticCase): GameState {
  const points = tactic.placements.map((p) => {
    if (p.count === 0) {
      return { point: p.point, player: p.player, count: 0 };
    }
    return p;
  });

  const state = createPositionState({
    useStandardSetup: true,
    placements: points,
    bar: tactic.bar,
    dice: tactic.dice,
    currentPlayer: 'white',
    mode: 'vs-computer',
  });

  // Normalize emptied points (createPositionState keeps a player label at count 0).
  for (const p of tactic.placements) {
    if (p.count === 0) {
      state.points[p.point] = { player: null, count: 0 };
    }
  }

  return state;
}
