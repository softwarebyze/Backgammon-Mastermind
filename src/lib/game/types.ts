export type Player = 'white' | 'black';
export type GameMode = 'vs-computer' | 'vs-human';
export type GamePhase = 'rolling' | 'moving' | 'game-over';

export type BoardPoint = {
  player: Player | null;
  count: number;
};

/**
 * Represents a single checker move.
 * from: 0 = bar, 1-24 = point index
 * to:   25 = bear off, 1-24 = point index
 * dieIndex: which index in remainingDice was consumed
 */
export type Move = {
  from: number;
  to: number;
  dieIndex: number;
};

export type GameState = {
  /** Index 0 is unused; indices 1-24 are the 24 board points. */
  points: BoardPoint[];
  bar: Record<Player, number>;
  borneOff: Record<Player, number>;
  currentPlayer: Player;
  dice: [number, number];
  remainingDice: number[];
  phase: GamePhase;
  winner: Player | null;
  mode: GameMode;
  /** null = nothing selected, 0 = bar selected, 1-24 = point selected */
  selectedPoint: number | null;
  legalMovesForSelected: Move[];
};
