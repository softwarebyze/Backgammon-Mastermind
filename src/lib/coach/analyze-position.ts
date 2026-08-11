import type { PositionFacts } from '@/lib/coach/types';
import type { GameState, Move, Player } from '@/lib/game';

import { getAIMove } from '@/lib/game/ai';
import { BEAR_OFF } from '@/lib/game/constants';
import { calculatePipCount, getLegalMoves } from '@/lib/game/moves';

function countBlots(state: GameState, player: Player): number {
  let n = 0;
  for (let p = 1; p <= 24; p++) {
    const point = state.points[p];
    if (point?.player === player && point.count === 1) {
      n++;
    }
  }
  return n;
}

function countMadePoints(state: GameState, player: Player): number {
  let n = 0;
  for (let p = 1; p <= 24; p++) {
    const point = state.points[p];
    if (point?.player === player && point.count >= 2) {
      n++;
    }
  }
  return n;
}

export function formatPoint(point: number): string {
  if (point === 0) {
    return 'bar';
  }
  if (point === BEAR_OFF) {
    return 'off';
  }
  return String(point);
}

export function formatMove(move: Move): string {
  return `${formatPoint(move.from)} → ${formatPoint(move.to)}`;
}

/** Snapshot of the live board for coach replies — pure, free, on-device. */
export function analyzePosition(state: GameState): PositionFacts {
  const whitePips = calculatePipCount(state, 'white');
  const blackPips = calculatePipCount(state, 'black');
  const pipDiff = Math.abs(whitePips - blackPips);
  const pipLead
    = whitePips === blackPips
      ? 'tied'
      : whitePips < blackPips
        ? 'white'
        : 'black';

  const legalMoves = state.phase === 'moving' || state.phase === 'no-move'
    ? getLegalMoves(state)
    : [];
  const uniqueKeys = new Set(legalMoves.map(m => `${m.from}:${m.to}`));
  const onBar = state.bar[state.currentPlayer] > 0;
  const canBearOff = legalMoves.some(m => m.to === BEAR_OFF);
  const suggestedMove
    = state.phase === 'moving' && legalMoves.length > 0
      ? getAIMove(state)
      : null;

  return {
    phase: state.phase,
    currentPlayer: state.currentPlayer,
    whitePips,
    blackPips,
    pipLead,
    pipDiff,
    whiteBlots: countBlots(state, 'white'),
    blackBlots: countBlots(state, 'black'),
    whiteBar: state.bar.white,
    blackBar: state.bar.black,
    whiteBorneOff: state.borneOff.white,
    blackBorneOff: state.borneOff.black,
    whiteMadePoints: countMadePoints(state, 'white'),
    blackMadePoints: countMadePoints(state, 'black'),
    dice: [...state.dice] as [number, number],
    remainingDice: [...state.remainingDice],
    legalMoveCount: legalMoves.length,
    uniqueMoveCount: uniqueKeys.size,
    suggestedMove,
    canBearOff,
    onBar,
    mustEnter: onBar && state.phase === 'moving',
  };
}
