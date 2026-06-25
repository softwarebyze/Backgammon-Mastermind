import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { BoardPoint, GameState, Move, Player } from '@/lib/game/types';
import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';

/** Slide duration before the overlay fades out at the destination. */
export const CHECKER_MOVE_SLIDE_MS = 340;
/** Short fade so the committed board checker replaces the proxy without a double-image. */
export const CHECKER_MOVE_FADE_MS = 50;

export type MoveAnimationFrame = {
  from: number;
  to: number;
  player: Player;
  /** Stack height at source when the move starts (top checker position). */
  sourceStackCount: number;
  /** Checkers to render at source while the overlay is in flight. */
  sourceDisplayCount: number;
  /** Stack height at destination when the overlay lands. */
  destStackCount: number;
  onFinish: () => void;
};

export function checkerRenderSize(checkerSize: number, pointIndex: number): number {
  if (pointIndex === BEAR_OFF) {
    return checkerSize * 0.72;
  }
  if (pointIndex === BAR_POINT) {
    return checkerSize * 0.88;
  }
  return checkerSize;
}

export function countAtPoint(snapshot: GameState, pointIndex: number, player: Player): number {
  if (pointIndex === BAR_POINT) {
    return snapshot.bar[player];
  }
  if (pointIndex >= 1 && pointIndex <= 24) {
    return snapshot.points[pointIndex].count;
  }
  return 0;
}

export function destStackCount(snapshot: GameState, to: number, player: Player): number {
  if (to >= 1 && to <= 24) {
    return snapshot.points[to].player === player ? snapshot.points[to].count + 1 : 1;
  }
  return 1;
}

export function buildMoveAnimationFrame(
  snapshot: GameState,
  move: Move,
  onFinish: () => void,
): MoveAnimationFrame {
  const fromCount = countAtPoint(snapshot, move.from, snapshot.currentPlayer);

  return {
    from: move.from,
    to: move.to,
    player: snapshot.currentPlayer,
    sourceStackCount: fromCount,
    sourceDisplayCount: Math.max(0, fromCount - 1),
    destStackCount: destStackCount(snapshot, move.to, snapshot.currentPlayer),
    onFinish,
  };
}

/** Point stack shown on the board while a checker is in flight. */
export function displayPointDuringAnimation(
  pointIndex: number,
  point: BoardPoint,
  animation: MoveAnimationFrame | null,
): BoardPoint {
  if (!animation || animation.from !== pointIndex) {
    return point;
  }

  return {
    player: animation.sourceDisplayCount > 0 ? animation.player : null,
    count: animation.sourceDisplayCount,
  };
}

export function displayBarCountDuringAnimation(
  player: Player,
  count: number,
  animation: MoveAnimationFrame | null,
): number {
  if (animation?.from === BAR_POINT && animation.player === player) {
    return animation.sourceDisplayCount;
  }
  return count;
}

/** Token size for the sliding proxy — matches BarArea / BearOffArea sizing. */
export function overlayTokenSize(dims: BoardDimensions, fromPoint: number): number {
  return checkerRenderSize(dims.checkerSize, fromPoint);
}
