import type { BoardPoint, GameMode, GameState, Player } from './types';

import { createInitialPoints } from './constants';
import { applyDiceRoll } from './moves';

export type PointPlacement = {
  point: number;
  player: Player;
  count: number;
};

export type CreatePositionOptions = {
  /** When true, start from the standard 2-5-3-5 setup before applying placements. */
  useStandardSetup?: boolean;
  placements?: PointPlacement[];
  bar?: Partial<Record<Player, number>>;
  borneOff?: Partial<Record<Player, number>>;
  /** When set, applies the roll so `phase` becomes `moving` with remaining dice. */
  dice?: [number, number];
  currentPlayer?: Player;
  mode?: GameMode;
};

export function createEmptyPoints(): BoardPoint[] {
  return Array.from({ length: 25 }, () => ({
    player: null,
    count: 0,
  }));
}

/**
 * Build a GameState from an arbitrary position — used by learn lessons and tests.
 * Does not go through the opening-roll ceremony.
 */
export function createPositionState(options: CreatePositionOptions = {}): GameState {
  const points = options.useStandardSetup
    ? createInitialPoints()
    : createEmptyPoints();

  for (const placement of options.placements ?? []) {
    if (placement.point < 1 || placement.point > 24) {
      continue;
    }
    points[placement.point] = {
      player: placement.player,
      count: placement.count,
    };
  }

  const base: GameState = {
    points,
    bar: {
      white: options.bar?.white ?? 0,
      black: options.bar?.black ?? 0,
    },
    borneOff: {
      white: options.borneOff?.white ?? 0,
      black: options.borneOff?.black ?? 0,
    },
    currentPlayer: options.currentPlayer ?? 'white',
    dice: [0, 0],
    remainingDice: [],
    phase: 'rolling',
    winner: null,
    mode: options.mode ?? 'vs-computer',
    openingRolls: { white: null, black: null },
    selectedPoint: null,
    legalMovesForSelected: [],
  };

  if (options.dice) {
    return applyDiceRoll(base, options.dice);
  }

  return base;
}
