import type { AnimatedMoveCallbacks, AnimatedMoveOpts } from '@/features/game/use-animated-moves';
import type { GameState, Move } from '@/lib/game';
import { useCallback, useRef, useState } from 'react';
import { isSingleCheckerPath, resolveSequenceSteps } from '@/features/game/animated-move-sequence';
import { buildMoveAnimationFrame } from '@/features/game/move-animation';
import { useCommittedFlights } from '@/features/game/use-committed-flights';
import { moveSequenceInvolvesHit, passTurn } from '@/lib/game';
import { shouldDeferTurnEnd } from '@/lib/game-preferences/confirm-move';

/** Logical moves commit on input; independently keyed visual flights only remove themselves. */

export function useConcurrentMoves(
  state: { read: () => GameState | null; commit: (next: GameState) => void },
  callbacks: AnimatedMoveCallbacks,
) {
  const [hasPending, setHasPending] = useState(false);
  const pending = useRef<(() => void) | null>(null);
  const flights = useCommittedFlights(() => {
    const live = state.read();
    if (live?.phase === 'moving' && live.remainingDice.length === 0 && !shouldDeferTurnEnd(live)) {
      state.commit(passTurn(live));
    }
    const resume = pending.current;
    pending.current = null;
    setHasPending(false);
    resume?.();
  });
  const { frames, add, hasFlights, reset: resetFlights } = flights;
  const reset = useCallback(() => {
    pending.current = null;
    setHasPending(false);
    resetFlights();
  }, [resetFlights]);

  const start = useCallback((moves: Move[], opts?: AnimatedMoveOpts): boolean => {
    const before = state.read();
    if (!before || before.phase !== 'moving') {
      return true;
    }
    // A path through a hit needs its intermediate landing. Keep that existing
    // sequential choreography; independent single-checker plays can overlap.
    if (moves.length > 1 && (!isSingleCheckerPath(moves) || moveSequenceInvolvesHit(before, moves))) {
      return false;
    }
    const steps = resolveSequenceSteps(before, moves, { deferTurnEnd: true });
    if (!steps?.length) {
      return true;
    }
    const next = steps[steps.length - 1]!.after;
    const frame = buildMoveAnimationFrame(before, {
      ...moves[0]!,
      to: moves[moves.length - 1]!.to,
    }, { onFinish: () => {}, fromAnchor: opts?.fromAnchor });
    // Reserve dice and publish the new position synchronously, before another
    // pointer event can resolve against the preceding render's snapshot.
    state.commit(next);
    add(frame, before);
    for (const step of steps) {
      callbacks.onMoveStarted?.(step.before, step.legal, step.after);
      callbacks.onMoveApplied?.(step.before, step.legal, step.after);
    }
    return true;
  }, [add, callbacks, state]);

  const cancelPending = useCallback(() => {
    pending.current = null;
    setHasPending(false);
  }, []);
  const afterFlights = useCallback((fn: () => void) => {
    if (hasFlights()) {
      pending.current = fn;
      setHasPending(true);
    }
    else {
      fn();
    }
  }, [hasFlights]);
  return { frames, hasPending, start, reset, afterFlights, cancelPending, addHistoryFrame: add };
}
