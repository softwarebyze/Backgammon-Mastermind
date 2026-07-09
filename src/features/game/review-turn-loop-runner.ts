import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry, MoveLogTurn } from '@/lib/game/move-log';

import { buildReviewStepAnimation } from '@/features/game/review-helpers';

const HOLD_AFTER_TURN_MS = 1100;
const PAUSE_BEFORE_LOOP_MS = 400;
const PAUSE_BETWEEN_MOVES_MS = 140;

type LoopTimers = ReturnType<typeof setTimeout>[];

type LoopSetters = {
  setLoopAnimation: (frame: MoveAnimationFrame | null) => void;
  setLoopDisplayPly: (ply: number | null) => void;
};

/** Schedules one looping playback of a turn; timers are pushed into `timers`. */
export function startTurnLoopPlayback(args: {
  turn: MoveLogTurn;
  startPly: number;
  endPly: number;
  generation: number;
  isCurrent: () => boolean;
  replayBaseline: GameState;
  moveLog: MoveLogEntry[];
  timers: LoopTimers;
  setters: LoopSetters;
}) {
  const {
    turn,
    startPly,
    endPly,
    generation,
    isCurrent,
    replayBaseline,
    moveLog,
    timers,
    setters,
  } = args;

  const playMoveAt = (moveIndex: number) => {
    if (!isCurrent()) {
      return;
    }
    if (moveIndex >= turn.moves.length) {
      setters.setLoopAnimation(null);
      setters.setLoopDisplayPly(endPly);
      timers.push(setTimeout(() => {
        if (!isCurrent()) {
          return;
        }
        setters.setLoopDisplayPly(startPly - 1);
        timers.push(setTimeout(() => {
          if (isCurrent()) {
            playMoveAt(0);
          }
        }, PAUSE_BEFORE_LOOP_MS));
      }, HOLD_AFTER_TURN_MS));
      return;
    }

    const entry = turn.moves[moveIndex]!;
    setters.setLoopDisplayPly(entry.ply - 1);
    const frame = buildReviewStepAnimation({
      replayBaseline,
      moveLog,
      targetPly: entry.ply,
      onFinish: () => {
        if (!isCurrent()) {
          return;
        }
        setters.setLoopAnimation(null);
        setters.setLoopDisplayPly(entry.ply);
        timers.push(setTimeout(() => playMoveAt(moveIndex + 1), PAUSE_BETWEEN_MOVES_MS));
      },
    });

    if (!frame) {
      timers.push(setTimeout(() => playMoveAt(moveIndex + 1), 80));
      return;
    }
    setters.setLoopAnimation(frame);
  };

  timers.push(setTimeout(() => {
    if (!isCurrent()) {
      return;
    }
    setters.setLoopDisplayPly(startPly - 1);
    playMoveAt(0);
  }, PAUSE_BEFORE_LOOP_MS));

  return generation;
}
