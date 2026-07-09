import type { MoveAnimationFrame } from '@/features/game/move-animation';
import type { GameState, Move } from '@/lib/game';
import type { MoveLogEntry } from '@/lib/game/move-log';
import { buildMoveAnimationFrame, countAtPoint } from '@/features/game/move-animation';
import { REVIEW_CHECKER_MOVE_DURATION_MS } from '@/features/game/review-navigator';
import { opponent } from '@/lib/game';
import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';
import { groupMoveLogByTurn, isNoMoveLogEntry } from '@/lib/game/move-log';
import { resolveMoveFromLogEntry, stateAtPly } from '@/lib/game/move-replay';
import { translate } from '@/lib/i18n';

function moveFromLogEntry(before: GameState, entry: MoveLogEntry): Move {
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
  const turns = groupMoveLogByTurn(moveLog);
  const turn = turns.find(
    t => viewIndex >= t.endPly - t.moves.length + 1 && viewIndex <= t.endPly,
  );
  if (!turn) {
    return translate('game.review.move_position', {
      current: viewIndex,
      total: liveIndex,
      player: translate(playerKey),
    });
  }
  return translate('game.review.turn_label', {
    turn: turn.turnIndex,
    totalTurns: turns.length,
    player: translate(playerKey),
  });
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
  const entry = moveLog[targetPly - 1]!;
  if (isNoMoveLogEntry(entry)) {
    return null;
  }
  const before = stateAtPly(replayBaseline, moveLog, targetPly - 1);
  const move = moveFromLogEntry(before, entry);
  const frame = buildMoveAnimationFrame({ ...before, currentPlayer: entry.player }, move, onFinish);
  return frame ? { ...frame, durationMs: REVIEW_CHECKER_MOVE_DURATION_MS } : null;
}

function wasBlotHit(before: GameState, to: number, player: MoveLogEntry['player']): boolean {
  if (to < 1 || to > 24) {
    return false;
  }
  const opp = opponent(player);
  const dest = before.points[to];
  return dest.player === opp && dest.count === 1;
}

/** Undo animation: slide the mover's checker back; restore hit blots from the bar when needed. */
export function buildReviewStepBackAnimation(ctx: {
  replayBaseline: GameState;
  moveLog: MoveLogEntry[];
  targetPly: number;
  onFinish: () => void;
}): MoveAnimationFrame | null {
  const { replayBaseline, moveLog, targetPly, onFinish } = ctx;
  const undoPly = targetPly + 1;
  if (undoPly <= 0 || undoPly > moveLog.length) {
    return null;
  }

  const entry = moveLog[undoPly - 1]!;
  if (isNoMoveLogEntry(entry)) {
    return null;
  }
  const player = entry.player;
  const before = stateAtPly(replayBaseline, moveLog, undoPly - 1);
  const after = stateAtPly(replayBaseline, moveLog, undoPly);
  const from = entry.to;
  const to = entry.from;

  const sourceStackCount = from === BEAR_OFF
    ? after.borneOff[player]
    : countAtPoint(after, from, player);
  const destStackCount = to === BEAR_OFF
    ? before.borneOff[player] + 1
    : countAtPoint(before, to, player);

  const frame: MoveAnimationFrame = {
    from,
    to,
    player,
    sourceStackCount,
    sourceDisplayCount: Math.max(0, sourceStackCount - 1),
    destStackCount,
    onFinish,
  };

  if (wasBlotHit(before, entry.to, player)) {
    const opp = opponent(player);
    if (after.bar[opp] > before.bar[opp]) {
      frame.capture = {
        from: BAR_POINT,
        to: entry.to,
        player: opp,
        sourceStackCount: after.bar[opp],
        destStackCount: 1,
      };
    }
  }

  return { ...frame, durationMs: REVIEW_CHECKER_MOVE_DURATION_MS };
}
