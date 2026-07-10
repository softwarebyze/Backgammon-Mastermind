import type { Dispatch, SetStateAction } from 'react';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';

import {
  applyResolvedSequence,
  resolveSequenceSteps,
  runMoveSequence,
} from '@/features/game/animated-move-sequence';
import { buildMoveAnimationFrame } from '@/features/game/move-animation';
import { moveSequenceInvolvesHit } from '@/lib/game';

type PlayMove = (
  snapshot: GameState,
  move: Move,
  onComplete?: (next: GameState) => void,
) => void;

export function playValidatedMoveSequence(opts: {
  snapshot: GameState;
  moves: Move[];
  gen: number;
  generationRef: { current: number };
  finishOnceRef: { current: (() => void) | null };
  isAnimating: boolean;
  playMove: PlayMove;
  onMoveApplied?: (before: GameState, move: Move, after: GameState) => void;
  setState: Dispatch<SetStateAction<GameState | null>>;
  setMoveAnimation: Dispatch<SetStateAction<MoveAnimationFrame | null>>;
  setSequenceActive: Dispatch<SetStateAction<boolean>>;
  isCommitLive: () => boolean;
}): void {
  const {
    snapshot,
    moves,
    gen,
    generationRef,
    finishOnceRef,
    isAnimating,
    playMove,
    onMoveApplied,
    setState,
    setMoveAnimation,
    setSequenceActive,
    isCommitLive,
  } = opts;

  if (
    moves.length > 1
    && !moveSequenceInvolvesHit(snapshot, moves)
    && resolveSequenceSteps(snapshot, moves)
  ) {
    const glideMove: Move = {
      from: moves[0]!.from,
      to: moves[moves.length - 1]!.to,
      dieIndex: 0,
    };
    let settled = false;
    const settle = () => {
      if (settled || generationRef.current !== gen) {
        return;
      }
      settled = true;
      finishOnceRef.current = null;
      setState(applyResolvedSequence(snapshot, moves, onMoveApplied));
      setMoveAnimation(null);
      setSequenceActive(false);
    };
    setSequenceActive(true);
    finishOnceRef.current = settle;
    setMoveAnimation(buildMoveAnimationFrame(snapshot, glideMove, settle));
    return;
  }

  runMoveSequence(snapshot, moves, {
    isAnimating,
    playMove,
    onMoveApplied,
    setState,
    setMoveAnimation,
    setSequenceActive,
    isCommitLive,
  });
}
