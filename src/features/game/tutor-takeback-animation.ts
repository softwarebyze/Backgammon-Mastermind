import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';

import { buildReviewStepBackAnimation } from '@/features/game/review-helpers';
import { stateAtPly } from '@/lib/game/move-replay';

export type TakeBackAnimationDeps = {
  replayBaseline: GameState;
  moveLog: MoveLogEntry[];
  popLastMove: () => MoveLogEntry | null;
  setState: (state: GameState) => void;
  setMoveAnimation: (frame: MoveAnimationFrame | null) => void;
  /** Wire each per-step commit into the shared animation watchdog. */
  armAnimationFinish: (onFinish: () => void) => () => void;
  /** Instant revert + timeline rewind once the animation (or fallback) ends. */
  finish: (movesUndone: number) => void;
};

/**
 * Animate a tutor "take back & retry": slide each of the player's checkers
 * back to its turn-start spot (newest move first), popping the move log as
 * each reverse slide lands, then hand off to `finish` for the exact
 * turn-start restore. Reuses the undo/review reverse-frame builder so the
 * motion matches undo; no-move entries are popped without animating.
 */
export function runTakeBackAnimation(
  deps: TakeBackAnimationDeps,
  movesMade: number,
): void {
  const { replayBaseline, armAnimationFinish, finish } = deps;
  let log = [...deps.moveLog];
  const n = Math.max(0, Math.min(movesMade, 8, log.length));
  if (n <= 0) {
    finish(n);
    return;
  }
  const step = (remaining: number): void => {
    if (remaining <= 0 || log.length === 0) {
      finish(n);
      return;
    }
    const commitStep = (): void => {
      deps.popLastMove();
      log = log.slice(0, -1);
      if (remaining - 1 <= 0) {
        finish(n);
        return;
      }
      // Show the pre-move board under the next reverse slide.
      deps.setState(stateAtPly(replayBaseline, log, log.length));
      step(remaining - 1);
    };
    const frame = buildReviewStepBackAnimation({
      replayBaseline,
      moveLog: log,
      targetPly: log.length - 1,
      onFinish: commitStep,
    });
    if (!frame) {
      // No-move entries have nothing to slide — pop and continue instantly.
      commitStep();
      return;
    }
    deps.setMoveAnimation({ ...frame, onFinish: armAnimationFinish(commitStep) });
  };
  step(n);
}
