import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry, MoveLogTurn } from '@/lib/game/move-log';
import { useCallback, useEffect, useRef, useState } from 'react';

import { startTurnLoopPlayback } from '@/features/game/review-turn-loop-runner';
import { groupMoveLogByTurn } from '@/lib/game/move-log';
import { stateAtPly } from '@/lib/game/move-replay';

export type ReviewPathSegment = {
  entry: MoveLogEntry;
  beforeState: GameState;
};

/** Find the turn that contains `ply` (1-based move index), or null for opening. */
export function turnContainingPly(moveLog: MoveLogEntry[], ply: number): MoveLogTurn | null {
  if (ply <= 0) {
    return null;
  }
  return groupMoveLogByTurn(moveLog).find(
    t => ply >= t.endPly - t.moves.length + 1 && ply <= t.endPly,
  ) ?? null;
}

export function turnStartPly(turn: MoveLogTurn): number {
  return turn.endPly - turn.moves.length + 1;
}

/** Previous turn's end ply, or 0 for opening. */
export function previousTurnEndPly(moveLog: MoveLogEntry[], currentPly: number): number {
  const turns = groupMoveLogByTurn(moveLog);
  const idx = turns.findIndex(
    t => currentPly >= turnStartPly(t) && currentPly <= t.endPly,
  );
  if (idx <= 0) {
    return 0;
  }
  return turns[idx - 1]!.endPly;
}

/** Next turn's end ply, or liveIndex when past the last turn. */
export function nextTurnEndPly(moveLog: MoveLogEntry[], currentPly: number, liveIndex: number): number {
  const turns = groupMoveLogByTurn(moveLog);
  if (currentPly <= 0) {
    return turns[0]?.endPly ?? liveIndex;
  }
  const idx = turns.findIndex(
    t => currentPly >= turnStartPly(t) && currentPly <= t.endPly,
  );
  if (idx < 0 || idx >= turns.length - 1) {
    return liveIndex;
  }
  return turns[idx + 1]!.endPly;
}

export function buildTurnPathSegments(
  replayBaseline: GameState,
  moveLog: MoveLogEntry[],
  turn: MoveLogTurn,
): ReviewPathSegment[] {
  return turn.moves
    .filter(entry => entry.from >= 0 && entry.to >= 0)
    .map((entry) => {
      const beforeState = stateAtPly(replayBaseline, moveLog, entry.ply - 1);
      return { entry, beforeState };
    });
}

/**
 * Optional looping of the focused turn (openings-website style).
 * Off by default — Replay toggles it. Holds the final position before restarting.
 */
export function useReviewTurnLoop(args: {
  enabled: boolean;
  looping: boolean;
  replayBaseline: GameState | null;
  moveLog: MoveLogEntry[];
  focusedPly: number;
  isNavigating: boolean;
}) {
  const { enabled, looping, replayBaseline, moveLog, focusedPly, isNavigating } = args;
  const [loopAnimation, setLoopAnimation] = useState<MoveAnimationFrame | null>(null);
  const [loopDisplayPly, setLoopDisplayPly] = useState<number | null>(null);
  const [replayToken, setReplayToken] = useState(0);
  const generationRef = useRef(0);
  const timersRef = useRef<ReturnType<typeof setTimeout>[]>([]);

  const clearTimers = useCallback(() => {
    timersRef.current.forEach(clearTimeout);
    timersRef.current = [];
  }, []);

  const restartLoop = useCallback(() => {
    setReplayToken(t => t + 1);
  }, []);

  useEffect(() => {
    clearTimers();
    generationRef.current += 1;
    const generation = generationRef.current;
    queueMicrotask(() => {
      if (generation === generationRef.current) {
        setLoopAnimation(null);
        setLoopDisplayPly(null);
      }
    });

    if (!enabled || !looping || isNavigating || !replayBaseline || focusedPly <= 0) {
      return clearTimers;
    }

    const turn = turnContainingPly(moveLog, focusedPly);
    if (!turn || turn.moves.length === 0) {
      return clearTimers;
    }

    startTurnLoopPlayback({
      turn,
      startPly: turnStartPly(turn),
      endPly: turn.endPly,
      generation,
      isCurrent: () => generation === generationRef.current,
      replayBaseline,
      moveLog,
      timers: timersRef.current,
      setters: { setLoopAnimation, setLoopDisplayPly },
    });

    return () => {
      generationRef.current += 1;
      clearTimers();
    };
  }, [clearTimers, enabled, focusedPly, isNavigating, looping, moveLog, replayBaseline, replayToken]);

  return {
    loopAnimation,
    loopDisplayPly,
    restartLoop,
    canReplay: enabled && focusedPly > 0 && !isNavigating,
  };
}
