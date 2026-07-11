import type { BoardPoint, GameState, Player } from '@/lib/game/types';
import { BAR_POINT } from '@/lib/game/constants';
import { getLegalMoves } from '@/lib/game/moves';

type ColumnDragParams = {
  /** Board-level drag allowed (human turn, phase, handlers wired). */
  dragInteractionEnabled: boolean;
  phase: GameState['phase'];
  point: BoardPoint;
  currentPlayer: Player;
  barCountForPlayer: number;
};

/** True when the whole point column should accept a drag gesture. */
export function canDragFromColumn(params: ColumnDragParams): boolean {
  if (!params.dragInteractionEnabled) {
    return false;
  }
  if (params.point.player !== params.currentPlayer || params.point.count === 0) {
    return false;
  }
  // Bar priority: no point drags while checkers must re-enter from the bar.
  if (params.phase === 'moving' && params.barCountForPlayer > 0) {
    return false;
  }
  return true;
}

type BarDragParams = {
  dragInteractionEnabled: boolean;
  barCountForPlayer: number;
};

export function canDragFromBar(params: BarDragParams): boolean {
  return params.dragInteractionEnabled && params.barCountForPlayer > 0;
}

export type DragStartValidation = 'ok' | 'no-checker' | 'no-legal-moves';

/** Mirrors handleDragStart guards — pure for tests. */
export function validateDragStart(state: GameState, from: number): DragStartValidation {
  if (from === BAR_POINT) {
    if (state.bar[state.currentPlayer] === 0) {
      return 'no-checker';
    }
  }
  else {
    const point = state.points[from];
    if (!point || point.player !== state.currentPlayer || point.count === 0) {
      return 'no-checker';
    }
  }
  const legal = getLegalMoves({ ...state, selectedPoint: from }).filter(m => m.from === from);
  if (legal.length === 0) {
    return 'no-legal-moves';
  }
  return 'ok';
}
