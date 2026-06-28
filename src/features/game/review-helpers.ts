import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { buildMoveAnimationFrame } from '@/features/game/move-animation';
import { resolveMoveFromLogEntry, stateAtPly } from '@/lib/game/move-replay';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';

export function moveFromLogEntry(before: GameState, entry: MoveLogEntry): Move {
  return resolveMoveFromLogEntry(before, entry) ?? {
    from: entry.from,
    to: entry.to,
    dieIndex: 0,
  };
}

export function formatReviewPositionLabel(
  viewIndex: number,
  liveIndex: number,
  moveLog: MoveLogEntry[],
): string {
  if (viewIndex <= 0) {
    return translate('game.review.opening');
  }
  const entry = moveLog[viewIndex - 1];
  if (!entry) {
    return translate('game.review.opening');
  }
  const playerKey = entry.player === 'white'
    ? 'game.review.player_white'
    : 'game.review.player_black';
  return translate('game.review.move_position', {
    current: viewIndex,
    total: liveIndex,
    player: translate(playerKey),
  });
}

type JumpCtx = {
  ply: number;
  viewIndex: number;
  liveIndex: number;
  isAnimating: boolean;
  playStepAnimation: (targetPly: number, onComplete: () => void) => void;
  setManualIndex: (v: number | null) => void;
  clearAnimation: () => void;
};

export function performReviewJump(ctx: JumpCtx): void {
  const { ply, viewIndex, liveIndex, isAnimating, playStepAnimation, setManualIndex, clearAnimation } = ctx;
  if (isAnimating) {
    return;
  }
  hapticLight();
  if (ply >= liveIndex) {
    setManualIndex(null);
    clearAnimation();
    return;
  }
  if (ply <= viewIndex) {
    clearAnimation();
    setManualIndex(ply);
    return;
  }
  if (ply > viewIndex + 1) {
    clearAnimation();
    setManualIndex(ply);
    return;
  }
  playStepAnimation(ply, () => setManualIndex(ply));
}

export function buildReviewStepAnimation(ctx: {
  replayBaseline: GameState;
  moveLog: MoveLogEntry[];
  targetPly: number;
  onFinish: () => void;
}): MoveAnimationFrame | null {
  const { replayBaseline, moveLog, targetPly, onFinish } = ctx;
  if (targetPly <= 0 || targetPly > moveLog.length) {
    return null;
  }
  const before = stateAtPly(replayBaseline, moveLog, targetPly - 1);
  const entry = moveLog[targetPly - 1]!;
  const move = moveFromLogEntry(before, entry);
  return buildMoveAnimationFrame(before, move, onFinish);
}
