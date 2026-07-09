import type { Dispatch, SetStateAction } from 'react';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';

import { useCallback, useRef, useState } from 'react';
import { createPlayMove } from '@/features/game/create-play-move';
import { playValidatedMoveSequence } from '@/features/game/play-validated-move-sequence';
import { useAnimationWatchdogs } from '@/features/game/use-animation-watchdogs';

export type { MoveAnimationFrame } from '@/features/game/move-animation';

export function useAnimatedMoves(
  state: GameState | null,
  setState: Dispatch<SetStateAction<GameState | null>>,
  onMoveApplied?: (before: GameState, move: Move, after: GameState) => void,
) {
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

  const armAnimationFinish = useCallback((onFinish: () => void) => {
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
  }, []);

  useAnimationWatchdogs({ moveAnimation, sequenceActive, finishOnceRef, setSequenceActive });

  const playMove = useCallback((
    snapshot: GameState,
    move: Move,
    onComplete?: (next: GameState) => void,
  ) => {
    createPlayMove({
      generationRef,
      commitGenRef,
      finishOnceRef,
      setState,
      setMoveAnimation,
      onMoveApplied,
    })(snapshot, move, onComplete);
  }, [setState, onMoveApplied]);

  const playMoveSequence = useCallback((snapshot: GameState, moves: Move[]) => {
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
      setState,
      setMoveAnimation,
      setSequenceActive,
      isCommitLive,
    });
  }, [isCommitLive, playMove, onMoveApplied, setState]);

  const doMove = useCallback((move: Move) => {
    const snapshot = stateRef.current;
    if (!snapshot || snapshot.phase !== 'moving' || isAnimatingRef.current) {
      return;
    }
    playMove(snapshot, move);
  }, [playMove]);

  const doMoveSequence = useCallback((moves: Move[]) => {
    const snapshot = stateRef.current;
    if (!snapshot || snapshot.phase !== 'moving' || isAnimatingRef.current) {
      return;
    }
    playMoveSequence(snapshot, moves);
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
