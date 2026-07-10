import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { buildReviewStepAnimation, buildReviewStepBackAnimation } from '@/features/game/review-helpers';
import { isNoMoveLogEntry } from '@/lib/game/move-log';
import { stateAtPly } from '@/lib/game/move-replay';

export type ReviewAnimDirection = 'forward' | 'backward';

/** Ply shown on the board (before state while forward anim; after state while backward anim). */
export function reviewDisplayPly(
  viewIndex: number,
  pendingAnimTarget: number | null,
  pendingDirection: ReviewAnimDirection | null,
): number {
  if (pendingAnimTarget === null || pendingDirection === null) {
    return viewIndex;
  }
  return pendingDirection === 'forward' ? pendingAnimTarget - 1 : pendingAnimTarget + 1;
}

/** Which move's arrow/label to show (the move being played or undone). */
export function reviewHighlightMovePly(
  viewIndex: number,
  pendingAnimTarget: number | null,
  pendingDirection: ReviewAnimDirection | null,
): number | null {
  if (pendingAnimTarget !== null && pendingDirection !== null) {
    return pendingDirection === 'forward' ? pendingAnimTarget : pendingAnimTarget + 1;
  }
  return viewIndex > 0 ? viewIndex : null;
}

export function reviewEffectivePly(viewIndex: number, pendingAnimTarget: number | null): number {
  return pendingAnimTarget ?? viewIndex;
}

export function reviewMoveEntry(
  moveLog: MoveLogEntry[],
  highlightMovePly: number | null,
): MoveLogEntry | null {
  if (!highlightMovePly || highlightMovePly <= 0) {
    return null;
  }
  return moveLog[highlightMovePly - 1] ?? null;
}

export function reviewBeforeStateForHighlight(
  replayBaseline: GameState | null,
  moveLog: MoveLogEntry[],
  highlightMovePly: number | null,
): GameState | null {
  if (!replayBaseline || !highlightMovePly || highlightMovePly <= 0) {
    return null;
  }
  return stateAtPly(replayBaseline, moveLog, highlightMovePly - 1);
}

/** Dice for review UI — dim unused dice so partial / no-move turns are clear. */
export function reviewDiceForPly(
  moveLog: MoveLogEntry[],
  ply: number,
  snap: GameState,
): { dice: [number, number]; remainingDice: number[] } {
  if (ply <= 0) {
    return { dice: snap.dice, remainingDice: [...snap.remainingDice] };
  }
  const entry = moveLog[ply - 1];
  if (!entry) {
    return { dice: snap.dice, remainingDice: [...snap.remainingDice] };
  }
  const dice = [...entry.dice] as [number, number];
  if (isNoMoveLogEntry(entry)) {
    return { dice, remainingDice: [] };
  }
  // Prefer the snapshot's remaining dice (unused after the turn / ply).
  if (entry.after) {
    return { dice, remainingDice: [...entry.after.remainingDice] };
  }
  return { dice, remainingDice: [...snap.remainingDice] };
}

/** Overlay dice, active player, and phase so review matches the move being viewed. */
export function applyReviewPresenterOverlay(
  moveLog: MoveLogEntry[],
  ply: number,
  snap: GameState,
): GameState {
  const dice = reviewDiceForPly(moveLog, ply, snap);
  const entry = ply > 0 ? moveLog[ply - 1] : null;

  return {
    ...snap,
    ...dice,
    currentPlayer: entry?.player ?? snap.currentPlayer,
  };
}

export function startReviewStepAnimation(ctx: {
  replayBaseline: GameState;
  moveLog: MoveLogEntry[];
  targetPly: number;
  direction: ReviewAnimDirection;
  generation: number;
  animGenerationRef: { current: number };
  onFinish: (generation: number) => void;
}): MoveAnimationFrame | null {
  const build = ctx.direction === 'forward'
    ? buildReviewStepAnimation
    : buildReviewStepBackAnimation;
  const frame = build({
    replayBaseline: ctx.replayBaseline,
    moveLog: ctx.moveLog,
    targetPly: ctx.targetPly,
    onFinish: () => ctx.onFinish(ctx.generation),
  });
  if (!frame) {
    return null;
  }
  return frame;
}

export function shouldAcceptReviewAnimationFinish(
  generation: number,
  animGenerationRef: { current: number },
): boolean {
  return generation === animGenerationRef.current;
}
