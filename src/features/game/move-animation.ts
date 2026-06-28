import type { BoardPoint, GameState, Move, Player } from '@/lib/game/types';
import { bearOffTokenSize } from '@/features/game/bear-off-layout';
import { opponent } from '@/lib/game';
import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';

/** Duration of the checker slide animation. */
export const CHECKER_MOVE_DURATION_MS = 360;

export type CheckerSlide = {
  from: number;
  to: number;
  player: Player;
  sourceStackCount: number;
  destStackCount: number;
};

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
  /** Opponent blot sent to the bar on a hit — animates in parallel with the mover. */
  capture?: CheckerSlide;
  onFinish: () => void;
};

export function checkerRenderSize(checkerSize: number, pointIndex: number): number {
  if (pointIndex === BEAR_OFF) {
    return bearOffTokenSize(checkerSize);
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
    const point = snapshot.points[pointIndex];
    return point.player === player ? point.count : 0;
  }
  return 0;
}

export function destStackCount(snapshot: GameState, to: number, player: Player): number {
  if (to === BEAR_OFF) {
    return snapshot.borneOff[player] + 1;
  }
  if (to >= 1 && to <= 24) {
    return snapshot.points[to].player === player ? snapshot.points[to].count + 1 : 1;
  }
  return 1;
}

function isBlotHit(snapshot: GameState, move: Move): boolean {
  if (move.to < 1 || move.to > 24) {
    return false;
  }
  const opp = opponent(snapshot.currentPlayer);
  const dest = snapshot.points[move.to];
  return dest.player === opp && dest.count === 1;
}

function buildCaptureSlide(snapshot: GameState, move: Move): CheckerSlide | undefined {
  if (!isBlotHit(snapshot, move)) {
    return undefined;
  }
  const opp = opponent(snapshot.currentPlayer);
  return {
    from: move.to,
    to: BAR_POINT,
    player: opp,
    sourceStackCount: 1,
    destStackCount: snapshot.bar[opp] + 1,
  };
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
    capture: buildCaptureSlide(snapshot, move),
    onFinish,
  };
}

/** Point stack shown on the board while a checker is in flight. */
export function displayPointDuringAnimation(
  pointIndex: number,
  point: BoardPoint,
  animation: MoveAnimationFrame | null,
): BoardPoint {
  if (animation?.capture?.from === pointIndex) {
    return { player: null, count: 0 };
  }

  if (animation?.from === pointIndex) {
    return {
      player: animation.sourceDisplayCount > 0 ? animation.player : null,
      count: animation.sourceDisplayCount,
    };
  }

  return point;
}

export function displayBarCountDuringAnimation(
  player: Player,
  count: number,
  animation: MoveAnimationFrame | null,
): number {
  if (animation?.from === BAR_POINT && animation.player === player) {
    return animation.sourceDisplayCount;
  }
  if (animation?.capture?.from === BAR_POINT && animation.capture.player === player) {
    return Math.max(0, count - 1);
  }
  return count;
}

/** Selection/legal tints are hidden while a checker slides to avoid a color snap at landing. */
export function isBoardHighlightActive(animation: MoveAnimationFrame | null): boolean {
  return animation === null;
}

export function animationKey(frame: MoveAnimationFrame): string {
  const capture = frame.capture ? `-cap-${frame.capture.player}` : '';
  return `${frame.from}-${frame.to}-${frame.player}${capture}`;
}
