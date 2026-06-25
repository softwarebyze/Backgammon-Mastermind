import type { Dispatch, SetStateAction } from 'react';
import type { GameState, Move, Player } from '@/lib/game';
import { useCallback, useRef, useState } from 'react';

import { applyMove } from '@/lib/game';
import { BAR_POINT } from '@/lib/game/constants';

export type MoveAnimationFrame = {
  from: number;
  to: number;
  player: Player;
  sourceStackCount: number;
  destStackCount: number;
  onFinish: () => void;
};

export function useAnimatedMoves(
  state: GameState | null,
  setState: Dispatch<SetStateAction<GameState | null>>,
) {
  const stateRef = useRef(state);
  stateRef.current = state;

  const [moveAnimation, setMoveAnimation] = useState<MoveAnimationFrame | null>(null);
  const isAnimating = moveAnimation !== null;

  const sourceStackCount = useCallback((snapshot: GameState, from: number, player: Player) => {
    if (from === BAR_POINT) {
      return snapshot.bar[player];
    }
    return snapshot.points[from].count;
  }, []);

  const playMove = useCallback((snapshot: GameState, move: Move) => {
    const destStackCount
      = move.to >= 1 && move.to <= 24
        ? snapshot.points[move.to].player === snapshot.currentPlayer
          ? snapshot.points[move.to].count + 1
          : 1
        : 1;

    setMoveAnimation({
      from: move.from,
      to: move.to,
      player: snapshot.currentPlayer,
      sourceStackCount: sourceStackCount(snapshot, move.from, snapshot.currentPlayer),
      destStackCount,
      onFinish: () => {
        setState(applyMove(snapshot, move));
        setMoveAnimation(null);
      },
    });
  }, [setState, sourceStackCount]);

  const isAnimatingRef = useRef(false);
  isAnimatingRef.current = moveAnimation !== null;

  const doMove = useCallback((move: Move) => {
    const snapshot = stateRef.current;
    if (!snapshot || snapshot.phase !== 'moving' || isAnimatingRef.current) {
      return;
    }
    playMove(snapshot, move);
  }, [playMove]);

  return { moveAnimation, isAnimating, doMove, playMove };
}
