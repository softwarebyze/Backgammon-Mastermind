import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { AnimatedMoveCallbacks, AnimatedMoveOpts } from '@/features/game/use-animated-moves';
import type { GameState, Move } from '@/lib/game';
import { useCallback, useRef, useState } from 'react';
import { isSingleCheckerPath, resolveSequenceSteps } from '@/features/game/animated-move-sequence';
import { buildMoveAnimationFrame, countAtPoint, displayCommittedCount } from '@/features/game/move-animation';
import { moveSequenceInvolvesHit, passTurn } from '@/lib/game';
import { shouldDeferTurnEnd } from '@/lib/game-preferences/confirm-move';

/** Logical moves commit on input; independently keyed visual flights only remove themselves. */
// eslint-disable-next-line max-lines-per-function -- coordinates independent flight lifetimes and dependent continuations
export function useConcurrentMoves(
  state: { read: () => GameState | null; commit: (next: GameState) => void },
  callbacks: AnimatedMoveCallbacks,
) {
  const [frames, setFrames] = useState<MoveAnimationFrame[]>([]);
  const framesRef = useRef(frames);
  const serial = useRef(0);
  const landed = useRef(new Set<number>());
  const [hasPending, setHasPending] = useState(false);
  const generation = useRef(0);
  const pending = useRef<(() => void) | null>(null);
  const timers = useRef(new Map<number, ReturnType<typeof setTimeout>>());
  const reset = useCallback(() => {
    generation.current++;
    pending.current = null;
    setHasPending(false);
    landed.current.clear();
    framesRef.current = [];
    for (const timer of timers.current.values()) {
      clearTimeout(timer);
    }
    timers.current.clear();
    setFrames([]);
  }, []);

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
    const from = moves[0]!.from;
    const count = countAtPoint(before, from, before.currentPlayer);
    const visible = displayCommittedCount({ point: from, player: before.currentPlayer, count }, framesRef.current.length ? { ...framesRef.current[0]!, parallel: framesRef.current } : null);
    const arrival = visible === 0
      ? framesRef.current.findLast(frame => frame.to === from && frame.player === before.currentPlayer)
      : undefined;
    const predecessor = arrival && !landed.current.has(arrival.id!) ? arrival : undefined;
    if (arrival && !predecessor) {
      framesRef.current = framesRef.current.filter(frame => frame.id !== arrival.id);
    }
    const id = ++serial.current;
    const gen = generation.current;
    const finish = () => {
      if (gen !== generation.current || !timers.current.has(id)) {
        return;
      }
      clearTimeout(timers.current.get(id));
      timers.current.delete(id);
      landed.current.add(id);
      const children = framesRef.current.filter(frame => frame.waitFor === id);
      if (children.length) {
        framesRef.current = framesRef.current.filter(frame => frame.id !== id).map(frame =>
          frame.waitFor === id ? { ...frame, waitFor: undefined } : frame);
        for (const child of children) {
          timers.current.set(child.id!, setTimeout(child.onFinish, (child.durationMs ?? 620) + 160));
        }
      }
      setFrames(framesRef.current);
      // Keep landed overlays in their reserved stack slots until all flights
      // land, including when a shorter second flight finishes first.
      if (framesRef.current.every(frame => landed.current.has(frame.id!))) {
        framesRef.current = [];
        landed.current.clear();
        setFrames([]);
        const live = state.read();
        if (live?.phase === 'moving' && live.remainingDice.length === 0 && !shouldDeferTurnEnd(live)) {
          const passed = passTurn(live);
          state.commit(passed);
        }
        const resume = pending.current;
        pending.current = null;
        setHasPending(false);
        resume?.();
      }
    };
    const frame = {
      ...buildMoveAnimationFrame(before, {
        ...moves[0]!,
        to: moves[moves.length - 1]!.to,
      }, { onFinish: finish, fromAnchor: opts?.fromAnchor }),
      id,
      committed: true,
      waitFor: predecessor?.id,
      consumesArrival: !!predecessor,
    };
    if (!predecessor) {
      frame.sourceStackCount = arrival ? count : visible;
    }
    // Reserve dice and publish the new position synchronously, before another
    // pointer event can resolve against the preceding render's snapshot.
    state.commit(next);
    framesRef.current = [...framesRef.current, frame];
    setFrames(framesRef.current);
    if (!predecessor) {
      timers.current.set(id, setTimeout(finish, (frame.durationMs ?? 620) + 160));
    }
    for (const step of steps) {
      callbacks.onMoveStarted?.(step.before, step.legal, step.after);
      callbacks.onMoveApplied?.(step.before, step.legal, step.after);
    }
    return true;
  }, [callbacks, state]);

  const afterFlights = useCallback((fn: () => void) => {
    if (framesRef.current.length) {
      pending.current = fn;
      setHasPending(true);
    }
    else {
      fn();
    }
  }, []);
  return { frames, hasPending, start, reset, afterFlights };
}
