import type { Dispatch, SetStateAction } from 'react';
import type { PointAnchor } from '@/features/game/board-point-layout';
import type { PlayMoveOpts } from '@/features/game/create-play-move';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';

import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { createPlayMove } from '@/features/game/create-play-move';
import { playValidatedMoveSequence } from '@/features/game/play-validated-move-sequence';
import { useAnimationWatchdogs } from '@/features/game/use-animation-watchdogs';
import { useConcurrentMoves } from '@/features/game/use-concurrent-moves';

export type { MoveAnimationFrame } from '@/features/game/move-animation';

export type AnimatedMoveOpts = {
  /** Human input can advance logically while earlier visual flights are running. */
  concurrent?: boolean;
  fromAnchor?: PointAnchor;
};

export type AnimatedMoveCallbacks = {
  onMoveApplied?: (before: GameState, move: Move, after: GameState) => void;
  /** Fires when a move's animation begins — used for immediate SFX feedback. */
  onMoveStarted?: (before: GameState, move: Move, after: GameState) => void;
};

type FinishRefs = {
  generationRef: { current: number };
  commitGenRef: { current: number };
  finishOnceRef: { current: (() => void) | null };
};

let nextProviderId = 0;

function armFinish(refs: FinishRefs, onFinish: () => void): () => void {
  const { generationRef, commitGenRef, finishOnceRef } = refs;
  const gen = generationRef.current;
  commitGenRef.current = gen;
  let settled = false;
  const settle = () => {
    if (settled || generationRef.current !== gen) {
      return;
    }
    settled = true;
    finishOnceRef.current = null;
    onFinish();
  };
  finishOnceRef.current = settle;
  return settle;
}

// eslint-disable-next-line max-lines-per-function -- legacy choreography plus independent human flights
export function useAnimatedMoves(
  state: GameState | null,
  setState: Dispatch<SetStateAction<GameState | null>>,
  callbacks: AnimatedMoveCallbacks = {},
) {
  const { onMoveApplied, onMoveStarted } = callbacks;
  const stateRef = useRef(state);
  stateRef.current = state;
  const moveState = useMemo(() => ({
    read: () => stateRef.current,
    commit: (next: GameState) => {
      stateRef.current = next;
      setState(next);
    },
  }), [setState]);
  const { frames, hasPending, start, reset, afterFlights } = useConcurrentMoves(moveState, callbacks);
  useEffect(() => reset, [reset]);
  const [moveAnimation, setMoveAnimation] = useState<MoveAnimationFrame | null>(null);
  const [sequenceActive, setSequenceActive] = useState(false);
  const generationRef = useRef(0);
  const commitGenRef = useRef(0);
  const finishOnceRef = useRef<(() => void) | null>(null);
  const isAnimatingRef = useRef(false);
  isAnimatingRef.current = moveAnimation !== null || sequenceActive;
  const isCommitLive = useCallback(() => commitGenRef.current === generationRef.current, []);

  const resetAnimation = useCallback(() => {
    reset();
    generationRef.current += 1;
    commitGenRef.current = generationRef.current;
    finishOnceRef.current = null;
    setMoveAnimation(null);
    setSequenceActive(false);
  }, [reset]);

  const armAnimationFinish = useCallback((onFinish: () => void) =>
    armFinish({ generationRef, commitGenRef, finishOnceRef }, onFinish), []);

  useAnimationWatchdogs({ moveAnimation, sequenceActive, finishOnceRef, setSequenceActive });

  const playMove = useCallback((
    snapshot: GameState,
    move: Move,
    playOpts?: PlayMoveOpts,
  ) => {
    isAnimatingRef.current = true;
    createPlayMove({
      generationRef,
      commitGenRef,
      finishOnceRef,
      setState,
      setMoveAnimation,
      onMoveApplied,
      onMoveStarted,
    })(snapshot, move, playOpts);
  }, [setState, onMoveApplied, onMoveStarted]);

  const playMoveSequence = useCallback((
    snapshot: GameState,
    moves: Move[],
    playOpts?: AnimatedMoveOpts,
  ) => {
    const wasAnimating = isAnimatingRef.current;
    isAnimatingRef.current = true;
    const gen = generationRef.current;
    commitGenRef.current = gen;
    playValidatedMoveSequence({
      snapshot,
      moves,
      gen,
      generationRef,
      finishOnceRef,
      isAnimating: wasAnimating,
      playMove,
      onMoveApplied,
      onMoveStarted,
      setState,
      setMoveAnimation,
      setSequenceActive,
      isCommitLive,
      fromAnchor: playOpts?.fromAnchor,
    });
  }, [isCommitLive, playMove, onMoveApplied, onMoveStarted, setState]);

  const actionSerial = useRef(0);
  const actionPrefix = useRef(`${Date.now()}-${++nextProviderId}`);
  const nextActionId = useCallback(() => `${actionPrefix.current}-${++actionSerial.current}`, []);

  const doMove = useCallback((move: Move, playOpts?: AnimatedMoveOpts) => {
    const snapshot = stateRef.current;
    move = { ...move, actionId: nextActionId() };
    if (playOpts?.concurrent && !isAnimatingRef.current && start([move], playOpts)) {
      return;
    }
    if (!snapshot || snapshot.phase !== 'moving' || isAnimatingRef.current) {
      return;
    }
    playMove(snapshot, move, playOpts);
  }, [playMove, start, nextActionId]);

  const doMoveSequence = useCallback((moves: Move[], playOpts?: AnimatedMoveOpts) => {
    const snapshot = stateRef.current;
    const actionId = nextActionId();
    moves = moves.map(move => ({ ...move, actionId }));
    if (playOpts?.concurrent && !isAnimatingRef.current) {
      if (start(moves, playOpts)) {
        return;
      }
      afterFlights(() => {
        const live = stateRef.current;
        if (live?.phase === 'moving') {
          playMoveSequence(live, moves, playOpts);
        }
      });
      return;
    }
    if (!snapshot || snapshot.phase !== 'moving' || isAnimatingRef.current) {
      return;
    }
    playMoveSequence(snapshot, moves, playOpts);
  }, [playMoveSequence, start, afterFlights, nextActionId]);

  return {
    moveAnimation: moveAnimation ?? (frames.length ? { ...frames[0]!, parallel: frames, inputBlocked: hasPending } : null),
    getMoveState: moveState.read,
    isAnimating: moveAnimation !== null || sequenceActive || frames.length > 0,
    resetAnimation,
    armAnimationFinish,
    setMoveAnimation,
    doMove,
    doMoveSequence,
    playMove,
    playMoveSequence,
  };
}
