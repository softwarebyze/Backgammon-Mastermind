/**
 * eXtreme Gammon XGID encoding for our GameState.
 *
 * Board: 26 chars — X bar, points 1–24, O bar.
 * Uppercase = X (white), lowercase = O (black); a/A=1 … o/O=15.
 * Trailing fields follow XG / gnubg-core: cube, owner, turn, dice, scores, …
 */
import type { GameState, Player } from './types';

function countToLetter(count: number, player: 'x' | 'o'): string {
  if (count <= 0)
    return '-';
  const n = Math.min(count, 15);
  const base = player === 'x' ? 65 : 97; // A or a
  return String.fromCharCode(base + n - 1);
}

/** Encode the 26-character XGID board (white = X, black = O). */
export function encodeXgidBoard(state: GameState): string {
  const chars: string[] = Array.from({ length: 26 }, () => '-');

  if (state.bar.white > 0) {
    chars[0] = countToLetter(state.bar.white, 'x').toLowerCase();
  }
  if (state.bar.black > 0) {
    chars[25] = countToLetter(state.bar.black, 'o').toUpperCase();
  }

  for (let p = 1; p <= 24; p++) {
    const pt = state.points[p]!;
    if (!pt.player || pt.count <= 0)
      continue;
    chars[p] = countToLetter(pt.count, pt.player === 'white' ? 'x' : 'o');
  }

  return chars.join('');
}

export type XgidOptions = {
  /** Evaluation plies are separate; this only affects the XGID turn/dice fields. */
  dice?: [number, number] | null;
};

/**
 * Build a money-game XGID. White is X, Black is O.
 * Dice default to `state.dice` when both are 1–6; otherwise `00`.
 */
export function toXgid(state: GameState, options: XgidOptions = {}): string {
  const board = encodeXgidBoard(state);
  const turn = state.currentPlayer === 'white' ? 1 : -1;
  const dicePair = options.dice ?? state.dice;
  const dice
    = dicePair[0] >= 1 && dicePair[0] <= 6 && dicePair[1] >= 1 && dicePair[1] <= 6
      ? `${dicePair[0]}${dicePair[1]}`
      : '00';

  // cube=0 (value 1), owner=0 (centered), money game (match length 0), maxcube=10
  return `XGID=${board}:0:0:${turn}:${dice}:0:0:0:0:10`;
}

export function playerLabel(player: Player): 'X' | 'O' {
  return player === 'white' ? 'X' : 'O';
}
