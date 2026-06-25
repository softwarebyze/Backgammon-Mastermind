import type { BoardPoint, GameMode, GameState } from './types';

export const BAR_POINT = 0;
export const BEAR_OFF = 25;
export const TOTAL_CHECKERS = 15;

/**
 * Standard backgammon starting position.
 * White moves from high to low (24 → 1).
 * Black moves from low to high (1 → 24).
 */
export function createInitialPoints(): BoardPoint[] {
  const points: BoardPoint[] = Array.from({ length: 25 }, () => ({
    player: null,
    count: 0,
  }));

  // White
  points[24] = { player: 'white', count: 2 };
  points[13] = { player: 'white', count: 5 };
  points[8] = { player: 'white', count: 3 };
  points[6] = { player: 'white', count: 5 };

  // Black
  points[1] = { player: 'black', count: 2 };
  points[12] = { player: 'black', count: 5 };
  points[17] = { player: 'black', count: 3 };
  points[19] = { player: 'black', count: 5 };

  return points;
}

export function createInitialState(mode: GameMode): GameState {
  return {
    points: createInitialPoints(),
    bar: { white: 0, black: 0 },
    borneOff: { white: 0, black: 0 },
    currentPlayer: 'white',
    dice: [0, 0],
    remainingDice: [],
    phase: 'opening-roll',
    winner: null,
    mode,
    openingRolls: { white: null, black: null },
    selectedPoint: null,
    legalMovesForSelected: [],
  };
}
