import type { GameState, Move, Player } from '@/lib/game/types';

import { applyMoveSequence, calculatePipCount } from '@/lib/game';
import { translate } from '@/lib/i18n';

type Shape = {
  blots: number;
  points: Set<number>;
  opponentOnBar: number;
  opponentPips: number;
};

function shapeOf(state: GameState, player: Player): Shape {
  const opponent: Player = player === 'white' ? 'black' : 'white';
  const points = new Set<number>();
  let blots = 0;
  for (let p = 1; p <= 24; p++) {
    const pt = state.points[p];
    if (pt.player !== player)
      continue;
    if (pt.count === 1)
      blots += 1;
    if (pt.count >= 2)
      points.add(p);
  }
  return {
    blots,
    points,
    opponentOnBar: state.bar[opponent],
    opponentPips: calculatePipCount(state, opponent),
  };
}

function diff<T>(a: Set<T>, b: Set<T>): T[] {
  return [...a].filter(x => !b.has(x));
}

/**
 * One beginner-readable sentence about why the best move beats the played
 * one. Derived from the two resulting positions (hits, blots, points made or
 * given up); falls back to the rank sentence when nothing stands out. The
 * engine only gives equities, so this is a heuristic, not an explanation
 * from the engine — the candidate table stays behind "More" for that.
 */
export function blunderKeyPoint(args: {
  questionState: GameState;
  myMoves: Move[];
  engineMoves: Move[];
  playedRank: number;
  candidateCount: number;
}): string {
  const { questionState, myMoves, engineMoves, playedRank, candidateCount } = args;
  const player = questionState.currentPlayer;
  const before = shapeOf(questionState, player);
  const mine = shapeOf(applyMoveSequence(questionState, myMoves), player);
  const best = shapeOf(applyMoveSequence(questionState, engineMoves), player);

  const bestHits = best.opponentOnBar > before.opponentOnBar;
  const mineHits = mine.opponentOnBar > before.opponentOnBar;
  if (bestHits && !mineHits) {
    return translate('game.tutor.key_point.hit', { pips: best.opponentPips - mine.opponentPips });
  }
  const bestMakes = diff(best.points, before.points);
  const mineMakes = diff(mine.points, before.points);
  if (bestMakes.length > 0 && mineMakes.length === 0) {
    return translate('game.tutor.key_point.makes_point', { point: bestMakes[0] });
  }
  const mineBreaks = diff(before.points, mine.points);
  const bestBreaks = diff(before.points, best.points);
  if (mineBreaks.length > 0 && bestBreaks.length === 0) {
    return translate('game.tutor.key_point.breaks_point', { point: mineBreaks[0] });
  }
  if (mine.blots > best.blots) {
    return translate('game.tutor.key_point.blots', { mine: mine.blots, best: best.blots });
  }
  return translate('game.tutor.key_point.rank', { rank: playedRank, count: candidateCount });
}
