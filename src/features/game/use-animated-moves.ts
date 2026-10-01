import type { Dispatch, SetStateAction } from 'react';
import type { PointAnchor } from '@/features/game/board-point-layout';
import type { PlayMoveOpts } from '@/features/game/create-play-move';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';

import { useCallback, useRef, useState } from 'react';
import { createPlayMove } from '@/features/game/create-play-move';
import { playValidatedMoveSequence } from '@/features/game/play-validated-move-sequence';
import { useAnimationWatchdogs } from '@/features/game/use-animation-watchdogs';

export type { MoveAnimationFrame } from '@/features/game/move-animation';

export type AnimatedMoveOpts = {
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

export function useAnimatedMoves(
  state: GameState | null,
  setState: Dispatch<SetStateAction<GameState | null>>,
  callbacks: AnimatedMoveCallbacks = {},
) {
  const { onMoveApplied, onMoveStarted } = callbacks;
  const stateRef = useRef(state);
  stateRef.current = state;
  const [moveAnimation, setMoveAnimation] = useState<MoveAnimationFrame | null>(null);
  const [sequenceActive, setSequenceActive] = useState(false);
  const generationRef = useRef(0);
  const commitGenRef = useRef(0);
  const finishOnceRef = useRef<(() => void) | null>(null);
  const isAnimatingRef = useRef(false);
  isAnimatingRef.current = moveAnimation !== null || sequenceActive;
  const isCommitLive = useCallback(() => commitGenRef.current === generationRef.current, []);

  const resetAnimation = useCallback(() => {
    generationRef.current += 1;
    commitGenRef.current = generationRef.current;
    finishOnceRef.current = null;
    setMoveAnimation(null);
    setSequenceActive(false);
  }, []);

  const armAnimationFinish = useCallback((onFinish: () => void) =>
    armFinish({ generationRef, commitGenRef, finishOnceRef }, onFinish), []);

  useAnimationWatchdogs({ moveAnimation, sequenceActive, finishOnceRef, setSequenceActive });

  const playMove = useCallback((
    snapshot: GameState,
    move: Move,
    playOpts?: PlayMoveOpts,
  ) => {
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
    const gen = generationRef.current;
    commitGenRef.current = gen;
    playValidatedMoveSequence({
      snapshot,
      moves,
      gen,
      generationRef,
      finishOnceRef,
      isAnimating: isAnimatingRef.current,
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

  const doMove = useCallback((move: Move, playOpts?: AnimatedMoveOpts) => {
    const snapshot = stateRef.current;
    if (!snapshot || snapshot.phase !== 'moving' || isAnimatingRef.current) {
      return;
    }
    playMove(snapshot, move, playOpts);
  }, [playMove]);

  const doMoveSequence = useCallback((moves: Move[], playOpts?: AnimatedMoveOpts) => {
    const snapshot = stateRef.current;
    if (!snapshot || snapshot.phase !== 'moving' || isAnimatingRef.current) {
      return;
    }
    playMoveSequence(snapshot, moves, playOpts);
  }, [playMoveSequence]);

  return {
    moveAnimation,
    isAnimating: moveAnimation !== null || sequenceActive,
    resetAnimation,
    armAnimationFinish,
    setMoveAnimation,
    doMove,
    doMoveSequence,
    playMove,
    playMoveSequence,
  };
}
