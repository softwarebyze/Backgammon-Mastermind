import type { Dispatch, SetStateAction } from 'react';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';

import { useCallback, useRef, useState } from 'react';
import { buildMoveAnimationFrame } from '@/features/game/move-animation';

import { applyMove, getLegalMoves, moveSequenceInvolvesHit } from '@/lib/game';

export type { MoveAnimationFrame } from '@/features/game/move-animation';

function applyResolvedSequence(
  snapshot: GameState,
  moves: Move[],
  onMoveApplied: ((before: GameState, move: Move, after: GameState) => void) | undefined,
): GameState {
  let snap = snapshot;
  for (const planned of moves) {
    const legal = getLegalMoves(snap).find(m => m.from === planned.from && m.to === planned.to);
    if (!legal) {
      break;
    }
    const next = applyMove(snap, legal);
    onMoveApplied?.(snap, legal, next);
    snap = next;
  }
  return snap;
}

function runMoveSequence(
  snapshot: GameState,
  moves: Move[],
  ctx: {
    isAnimating: boolean;
    playMove: (snap: GameState, move: Move, onComplete?: (next: GameState) => void) => void;
    onMoveApplied?: (before: GameState, move: Move, after: GameState) => void;
    setState: Dispatch<SetStateAction<GameState | null>>;
    setMoveAnimation: Dispatch<SetStateAction<MoveAnimationFrame | null>>;
    setSequenceActive: Dispatch<SetStateAction<boolean>>;
  },
): void {
  if (moves.length === 0 || ctx.isAnimating) {
    return;
  }
  if (moves.length === 1) {
    ctx.playMove(snapshot, moves[0]!);
    return;
  }
  ctx.setSequenceActive(true);
  if (!moveSequenceInvolvesHit(snapshot, moves)) {
    const glideMove: Move = {
      from: moves[0]!.from,
      to: moves[moves.length - 1]!.to,
      dieIndex: 0,
    };
    ctx.setMoveAnimation(buildMoveAnimationFrame(snapshot, glideMove, () => {
      const next = applyResolvedSequence(snapshot, moves, ctx.onMoveApplied);
      ctx.setState(next);
      ctx.setMoveAnimation(null);
      ctx.setSequenceActive(false);
    }));
    return;
  }
  const playFromIndex = (snap: GameState, index: number) => {
    const planned = moves[index]!;
    const legal = getLegalMoves(snap).find(m => m.from === planned.from && m.to === planned.to);
    if (!legal) {
      ctx.setSequenceActive(false);
      return;
    }
    ctx.playMove(snap, legal, (next) => {
      if (index + 1 < moves.length) {
        playFromIndex(next, index + 1);
      }
      else {
        ctx.setSequenceActive(false);
      }
    });
  };
  playFromIndex(snapshot, 0);
}

export function useAnimatedMoves(
  state: GameState | null,
  setState: Dispatch<SetStateAction<GameState | null>>,
  onMoveApplied?: (before: GameState, move: Move, after: GameState) => void,
) {
  const stateRef = useRef(state);
  stateRef.current = state;

  const [moveAnimation, setMoveAnimation] = useState<MoveAnimationFrame | null>(null);
  const [sequenceActive, setSequenceActive] = useState(false);

  const isAnimatingRef = useRef(false);
  isAnimatingRef.current = moveAnimation !== null || sequenceActive;

  const resetAnimation = useCallback(() => {
    setMoveAnimation(null);
    setSequenceActive(false);
  }, []);

  const playMove = useCallback((
    snapshot: GameState,
    move: Move,
    onComplete?: (next: GameState) => void,
  ) => {
    setMoveAnimation(buildMoveAnimationFrame(snapshot, move, () => {
      const legal = getLegalMoves(snapshot).find(m => m.from === move.from && m.to === move.to);
      if (!legal) {
        setMoveAnimation(null);
        onComplete?.(snapshot);
        return;
      }
      const next = applyMove(snapshot, legal);
      onMoveApplied?.(snapshot, legal, next);
      setState(next);
      setMoveAnimation(null);
      onComplete?.(next);
    }));
  }, [setState, onMoveApplied]);

  const playMoveSequence = useCallback((snapshot: GameState, moves: Move[]) => {
    runMoveSequence(snapshot, moves, {
      isAnimating: isAnimatingRef.current,
      playMove,
      onMoveApplied,
      setState,
      setMoveAnimation,
      setSequenceActive,
    });
  }, [playMove, onMoveApplied, setState]);

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
    setMoveAnimation,
    doMove,
    doMoveSequence,
    playMove,
    playMoveSequence,
  };
}
