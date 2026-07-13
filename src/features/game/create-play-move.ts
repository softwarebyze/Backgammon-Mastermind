import type { Dispatch, SetStateAction } from 'react';
import type { PointAnchor } from '@/features/game/board-point-layout';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';
import { buildMoveAnimationFrame } from '@/features/game/move-animation';
import { applyMove, getLegalMoves } from '@/lib/game';

export type PlayMoveOpts = {
  fromAnchor?: PointAnchor;
  onComplete?: (next: GameState) => void;
};

export function createPlayMove(opts: {
  generationRef: { current: number };
  commitGenRef: { current: number };
  finishOnceRef: { current: (() => void) | null };
  setState: Dispatch<SetStateAction<GameState | null>>;
  setMoveAnimation: Dispatch<SetStateAction<MoveAnimationFrame | null>>;
  onMoveApplied?: (before: GameState, move: Move, after: GameState) => void;
}) {
  const {
    generationRef,
    commitGenRef,
    finishOnceRef,
    setState,
    setMoveAnimation,
    onMoveApplied,
  } = opts;

  return (
    snapshot: GameState,
    move: Move,
    playOpts?: PlayMoveOpts,
  ) => {
    const gen = generationRef.current;
    commitGenRef.current = gen;
    let settled = false;
    const settle = () => {
      if (settled || generationRef.current !== gen) {
        return;
      }
      settled = true;
      finishOnceRef.current = null;
      const legal = getLegalMoves(snapshot).find(m => m.from === move.from && m.to === move.to);
      if (!legal) {
        setMoveAnimation(null);
        playOpts?.onComplete?.(snapshot);
        return;
      }
      const next = applyMove(snapshot, legal);
      onMoveApplied?.(snapshot, legal, next);
      setState(next);
      setMoveAnimation(null);
      playOpts?.onComplete?.(next);
    };
    finishOnceRef.current = settle;
    setMoveAnimation(buildMoveAnimationFrame(snapshot, move, {
      onFinish: settle,
      fromAnchor: playOpts?.fromAnchor,
    }));
  };
}
