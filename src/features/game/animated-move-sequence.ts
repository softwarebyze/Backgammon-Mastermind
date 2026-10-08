import type { Dispatch, SetStateAction } from 'react';
import type { PointAnchor } from '@/features/game/board-point-layout';
import type { PlayMoveOpts } from '@/features/game/create-play-move';
import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { ApplyMoveOptions, GameState, Move } from '@/lib/game';

import { buildMoveAnimationFrame } from '@/features/game/move-animation';
import { applyMove, getLegalMoves, moveSequenceInvolvesHit } from '@/lib/game';
import { shouldDeferTurnEnd } from '@/lib/game-preferences/confirm-move';

/** One checker continuing (13/10 then 10/9), not two separate plays. */
export function isSingleCheckerPath(moves: Move[]): boolean {
  for (let i = 1; i < moves.length; i++) {
    if (moves[i]!.from !== moves[i - 1]!.to) {
      return false;
    }
  }
  return moves.length > 1;
}

export function resolveSequenceSteps(
  snapshot: GameState,
  moves: Move[],
  applyOpts?: ApplyMoveOptions,
): { legal: Move; before: GameState; after: GameState }[] | null {
  const steps: { legal: Move; before: GameState; after: GameState }[] = [];
  let snap = snapshot;
  for (let i = 0; i < moves.length; i++) {
    const planned = moves[i]!;
    const legal = getLegalMoves(snap).find(m => m.from === planned.from && m.to === planned.to);
    if (!legal) {
      return null;
    }
    // Only the last step may defer turn end — intermediate dice still remain.
    const opts = i === moves.length - 1 ? applyOpts : undefined;
    const after = applyMove(snap, legal, opts);
    steps.push({ legal, before: snap, after });
    snap = after;
  }
  return steps;
}

export function applyResolvedSequence(
  snapshot: GameState,
  moves: Move[],
  opts?: {
    onMoveApplied?: (before: GameState, move: Move, after: GameState) => void;
    applyOpts?: ApplyMoveOptions;
  },
): GameState {
  const steps = resolveSequenceSteps(snapshot, moves, opts?.applyOpts);
  if (!steps) {
    return snapshot;
  }
  for (const step of steps) {
    opts?.onMoveApplied?.(step.before, step.legal, step.after);
  }
  return steps[steps.length - 1]?.after ?? snapshot;
}

export function runMoveSequence(
  snapshot: GameState,
  moves: Move[],
  ctx: {
    isAnimating: boolean;
    playMove: (snap: GameState, move: Move, playOpts?: PlayMoveOpts) => void;
    onMoveApplied?: (before: GameState, move: Move, after: GameState) => void;
    setState: Dispatch<SetStateAction<GameState | null>>;
    setMoveAnimation: Dispatch<SetStateAction<MoveAnimationFrame | null>>;
    setSequenceActive: Dispatch<SetStateAction<boolean>>;
    isCommitLive: () => boolean;
    fromAnchor?: PointAnchor;
  },
): void {
  if (moves.length === 0 || ctx.isAnimating) {
    return;
  }
  if (moves.length === 1) {
    ctx.playMove(snapshot, moves[0]!, { fromAnchor: ctx.fromAnchor });
    return;
  }
  ctx.setSequenceActive(true);
  if (isSingleCheckerPath(moves) && !moveSequenceInvolvesHit(snapshot, moves)) {
    const glideMove: Move = {
      from: moves[0]!.from,
      to: moves[moves.length - 1]!.to,
      dieIndex: 0,
    };
    ctx.setMoveAnimation(buildMoveAnimationFrame(snapshot, glideMove, {
      fromAnchor: ctx.fromAnchor,
      onFinish: () => {
        if (!ctx.isCommitLive()) {
          return;
        }
        const next = applyResolvedSequence(snapshot, moves, {
          onMoveApplied: ctx.onMoveApplied,
          applyOpts: shouldDeferTurnEnd(snapshot) ? { deferTurnEnd: true } : undefined,
        });
        ctx.setState(next);
        ctx.setMoveAnimation(null);
        ctx.setSequenceActive(false);
      },
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
    ctx.playMove(snap, legal, {
      fromAnchor: index === 0 ? ctx.fromAnchor : undefined,
      onComplete: (next) => {
        if (!ctx.isCommitLive()) {
          return;
        }
        if (index + 1 < moves.length) {
          playFromIndex(next, index + 1);
        }
        else {
          ctx.setSequenceActive(false);
        }
      },
    });
  };
  playFromIndex(snapshot, 0);
}
