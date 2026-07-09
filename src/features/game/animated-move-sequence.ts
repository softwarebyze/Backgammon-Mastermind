import type { Dispatch, SetStateAction } from 'react';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';

import { buildMoveAnimationFrame } from '@/features/game/move-animation';
import { applyMove, getLegalMoves, moveSequenceInvolvesHit } from '@/lib/game';

export function resolveSequenceSteps(
  snapshot: GameState,
  moves: Move[],
): { legal: Move; before: GameState; after: GameState }[] | null {
  const steps: { legal: Move; before: GameState; after: GameState }[] = [];
  let snap = snapshot;
  for (const planned of moves) {
    const legal = getLegalMoves(snap).find(m => m.from === planned.from && m.to === planned.to);
    if (!legal) {
      return null;
    }
    const after = applyMove(snap, legal);
    steps.push({ legal, before: snap, after });
    snap = after;
  }
  return steps;
}

export function applyResolvedSequence(
  snapshot: GameState,
  moves: Move[],
  onMoveApplied: ((before: GameState, move: Move, after: GameState) => void) | undefined,
): GameState {
  const steps = resolveSequenceSteps(snapshot, moves);
  if (!steps) {
    return snapshot;
  }
  for (const step of steps) {
    onMoveApplied?.(step.before, step.legal, step.after);
  }
  return steps[steps.length - 1]?.after ?? snapshot;
}

export function runMoveSequence(
  snapshot: GameState,
  moves: Move[],
  ctx: {
    isAnimating: boolean;
    playMove: (snap: GameState, move: Move, onComplete?: (next: GameState) => void) => void;
    onMoveApplied?: (before: GameState, move: Move, after: GameState) => void;
    setState: Dispatch<SetStateAction<GameState | null>>;
    setMoveAnimation: Dispatch<SetStateAction<MoveAnimationFrame | null>>;
    setSequenceActive: Dispatch<SetStateAction<boolean>>;
    isCommitLive: () => boolean;
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
      if (!ctx.isCommitLive()) {
        return;
      }
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
      if (!ctx.isCommitLive()) {
        return;
      }
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
