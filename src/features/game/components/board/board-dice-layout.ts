import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Player } from '@/lib/game';
import type { DiceDisplayStyle } from '@/lib/game-preferences/types';
import type { OpeningTray } from '@/lib/game/opening-display';

export type BoardDiceSide = 'left' | 'right';

export type BoardDice = {
  dice: [number, number];
  remainingDice: number[];
  player: Player;
  /** Opening roll: each side's single die sits in that player's half. */
  opening: OpeningTray | null;
  displayStyle: DiceDisplayStyle;
  animateRoll: boolean;
};

/**
 * Like at a real table, each player rolls into the half on their right: white
 * (seated at the bottom) into the right half, black (seated at the top, facing
 * white) into the left half. The board never mirrors for RTL, so neither does this.
 */
export function boardDiceSide(player: Player): BoardDiceSide {
  return player === 'white' ? 'right' : 'left';
}

/** Space between dice on the board. */
export function boardDieGap(size: number): number {
  return Math.max(4, Math.round(size * 0.18));
}

/**
 * Dice on the board read a little larger than a checker (26px at least), but
 * the four dice of a double must still fit inside one half of a narrow board.
 */
export function boardDieSize(checkerSize: number, halfWidth = Number.POSITIVE_INFINITY): number {
  let size = Math.max(26, Math.round(checkerSize * 1.25));
  while (size > 12 && 4 * size + 3 * boardDieGap(size) > halfWidth) {
    size -= 1;
  }
  return size;
}

/** Left edge (surface-local) and width of one half of the playing surface. */
export function boardHalfFrame(dims: Pick<BoardDimensions, 'colWidth' | 'barWidth'>, side: BoardDiceSide) {
  const width = 6 * dims.colWidth;
  return { left: side === 'left' ? 0 : width + dims.barWidth, width };
}

/** True when the dice have something to show (a rolled turn or an opening die). */
export function hasBoardDice(value: BoardDice): boolean {
  if (value.opening) {
    return true;
  }
  return value.dice[0] !== 0 || value.dice[1] !== 0;
}
