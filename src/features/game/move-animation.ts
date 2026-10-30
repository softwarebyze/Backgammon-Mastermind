import type { PointAnchor } from '@/features/game/board-point-layout';
import type { MovePace } from '@/features/game/checker-travel';
import type { BoardPoint, GameState, Move, Player } from '@/lib/game/types';
import { bearOffTokenSize } from '@/features/game/bear-off-layout';
import { checkerTravelDurationMs } from '@/features/game/checker-travel';
import { opponent } from '@/lib/game';
import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';

/**
 * Fallback slide length when a frame has no duration. Real slides use
 * `checkerTravelDurationMs` (distance-based). This stays at the long end so a
 * missing duration cannot commit the move before a computer slide finishes.
 */
export const CHECKER_MOVE_DURATION_MS = 620;

export type CheckerSlide = {
  hidden?: boolean;
  consumesArrival?: boolean;
  consumesArrivalOf?: string;
  from: number;
  to: number;
  player: Player;
  sourceStackCount: number;
  destStackCount: number;
  /** Optional board-local center override (e.g. finger release after a drag). */
  fromAnchor?: PointAnchor;
};

export type MoveAnimationFrame = {
  /** This mover has continued; its sibling capture may still occupy its slot. */
  hidden?: boolean;
  id?: number;
  waitFor?: number;
  waitForIds?: number[];
  consumesArrival?: boolean;
  consumesArrivalOf?: string;
  inputBlocked?: boolean;
  /** Logical state already includes these in-flight checkers. */
  committed?: boolean;
  parallel?: MoveAnimationFrame[];
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
  /** Start the mover slide from this board-local center instead of the source stack. */
  fromAnchor?: PointAnchor;
  /** Override slide duration (e.g. faster review scrub). */
  durationMs?: number;
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

export type BuildMoveAnimationOpts = {
  onFinish: () => void;
  fromAnchor?: PointAnchor;
  /** Explicit length. Review scrubbing sets this; otherwise travel is paced by distance. */
  durationMs?: number;
  pace?: MovePace;
};

export function buildMoveAnimationFrame(
  snapshot: GameState,
  move: Move,
  opts: BuildMoveAnimationOpts,
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
    fromAnchor: opts.fromAnchor,
    durationMs: opts.durationMs ?? checkerTravelDurationMs({
      from: move.from,
      to: move.to,
      pace: opts.pace,
    }),
    onFinish: opts.onFinish,
  };
}

/** Point stack shown on the board while a checker is in flight. */
export function displayPointDuringAnimation(
  pointIndex: number,
  point: BoardPoint,
  animation: MoveAnimationFrame | null,
): BoardPoint {
  if (animation?.committed) {
    const count = displayCommittedCount({ point: pointIndex, player: point.player, count: point.count }, animation);
    return { player: count > 0 ? point.player : null, count };
  }
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
  if (animation?.committed) {
    return displayCommittedCount({ point: BAR_POINT, player, count }, animation);
  }
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
  return animation === null || animation.committed === true;
}

export function animationKey(frame: MoveAnimationFrame): string {
  if (frame.id !== undefined) {
    return `flight-${frame.id}`;
  }
  const capture = frame.capture ? `-cap-${frame.capture.player}` : '';
  // Stack height distinguishes a second checker leaving the same point (6/4, 6/4).
  return `${frame.from}-${frame.to}-${frame.player}-${frame.sourceStackCount}${capture}`;
}

/** Hide arrivals until they land. Later departures cancel matching pending arrivals. */
export function displayCommittedCount(
  { point, player, count }: { point: number; player: Player | null; count: number },
  animation: MoveAnimationFrame | null,
): number {
  if (!animation?.committed || player === null) {
    return count;
  }
  const arrivals = new Set<string>();
  const consumed = new Set<string>();
  let legacyDepartures = 0;
  for (const [index, frame] of (animation.parallel ?? [animation]).entries()) {
    const slides = [
      { slide: frame, key: `${frame.id ?? index}-mover` },
      ...(frame.capture ? [{ slide: frame.capture, key: `${frame.id ?? index}-capture` }] : []),
    ];
    for (const { slide, key } of slides) {
      if (slide.hidden || slide.player !== player) {
        continue;
      }
      if (slide.to === point) {
        arrivals.add(key);
      }
      if (slide.from === point && slide.consumesArrival) {
        if (slide.consumesArrivalOf) {
          consumed.add(slide.consumesArrivalOf);
        }
        else {
          legacyDepartures++;
        }
      }
    }
  }
  for (const key of consumed) {
    arrivals.delete(key);
  }
  const arriving = Math.max(0, arrivals.size - legacyDepartures);
  return Math.max(0, count - arriving);
}
