import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { GameState, Move } from '@/lib/game';
import { resolveFatFingerDrop } from '@/features/game/hit-test-board';
import { findMoveSequence, getLegalMoves } from '@/lib/game';

/** Play a legal single or compound move from `from` to `to`, or null if illegal. */
export function resolveDragMove(
  state: GameState,
  from: number,
  to: number,
): { kind: 'single'; move: Move } | { kind: 'sequence'; moves: Move[] } | null {
  const withSelection = { ...state, selectedPoint: from };
  const legal = getLegalMoves(withSelection).filter(m => m.from === from);
  const single = legal.find(m => m.to === to);
  if (single) {
    return { kind: 'single', move: single };
  }
  // findMoveSequence recomputes legal moves from state; selectedPoint is enough.
  const sequence = findMoveSequence(withSelection, from, to);
  if (sequence) {
    return { kind: 'sequence', moves: sequence };
  }
  return null;
}

function isLegalDragPreview(
  state: GameState,
  from: number,
  to: number,
): boolean {
  return resolveDragMove(state, from, to) !== null;
}

export function previewFromDrag(opts: {
  state: GameState;
  from: number;
  boardX: number;
  boardY: number;
  dims: BoardDimensions;
}): number | null {
  const { state, from, boardX, boardY, dims } = opts;
  const target = resolveFatFingerDrop({ x: boardX, y: boardY, state, from, dims });
  if (target === null || target === from) {
    return null;
  }
  return isLegalDragPreview(state, from, target) ? target : null;
}
