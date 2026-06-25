import type { Dispatch, SetStateAction } from 'react';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';

import { useCallback, useRef, useState } from 'react';
import { buildMoveAnimationFrame } from '@/features/game/move-animation';

import { applyMove } from '@/lib/game';

export type { MoveAnimationFrame } from '@/features/game/move-animation';

export function useAnimatedMoves(
  state: GameState | null,
  setState: Dispatch<SetStateAction<GameState | null>>,
) {
  const stateRef = useRef(state);
  stateRef.current = state;

  const [moveAnimation, setMoveAnimation] = useState<MoveAnimationFrame | null>(null);
  const [sequenceActive, setSequenceActive] = useState(false);

  const isAnimatingRef = useRef(false);
  isAnimatingRef.current = moveAnimation !== null || sequenceActive;

  const playMove = useCallback((
    snapshot: GameState,
    move: Move,
    onComplete?: (next: GameState) => void,
  ) => {
    setMoveAnimation(buildMoveAnimationFrame(snapshot, move, () => {
      const next = applyMove(snapshot, move);
      setState(next);
      setMoveAnimation(null);
      onComplete?.(next);
    }));
  }, [setState]);

  const playMoveSequence = useCallback((snapshot: GameState, moves: Move[]) => {
    if (moves.length === 0 || isAnimatingRef.current) {
      return;
    }

    if (moves.length === 1) {
      playMove(snapshot, moves[0]);
      return;
    }

    setSequenceActive(true);

    const playFromIndex = (snap: GameState, index: number) => {
      playMove(snap, moves[index], (next) => {
        if (index + 1 < moves.length) {
          playFromIndex(next, index + 1);
        }
        else {
          setSequenceActive(false);
        }
      });
    };

    playFromIndex(snapshot, 0);
  }, [playMove]);

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
    doMove,
    doMoveSequence,
    playMove,
    playMoveSequence,
  };
}
