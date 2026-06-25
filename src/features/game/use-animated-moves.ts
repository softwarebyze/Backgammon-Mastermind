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
  const isAnimatingRef = useRef(false);
  isAnimatingRef.current = moveAnimation !== null;

  const playMove = useCallback((snapshot: GameState, move: Move) => {
    setMoveAnimation(buildMoveAnimationFrame(snapshot, move, () => {
      setState(applyMove(snapshot, move));
      setMoveAnimation(null);
    }));
  }, [setState]);

  const doMove = useCallback((move: Move) => {
    const snapshot = stateRef.current;
    if (!snapshot || snapshot.phase !== 'moving' || isAnimatingRef.current) {
      return;
    }
    playMove(snapshot, move);
  }, [playMove]);

  return {
    moveAnimation,
    isAnimating: moveAnimation !== null,
    doMove,
    playMove,
  };
}
