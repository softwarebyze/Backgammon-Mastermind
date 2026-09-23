import type { GameState, Move, Player } from '@/lib/game/types';

import { planSageTurnFull } from 'expo-bgsage';

import { formatHintNotation } from './sage-hint';

/**
 * Equity loss (in cubeless money-game points) at or above which the tutor
 * flags a turn as a big blunder. 0.05 is a clearly-wrong move (e.g. leaving
 * a blot instead of making a point); smaller inaccuracies stay silent so
 * the tutor doesn't nag over engine noise.
 */
export const TUTOR_BLUNDER_THRESHOLD = 0.05;

type TutorTurnCandidate = {
  /** Resulting board (bgsage 26-array, mover's perspective). */
  board: number[];
  equity: number;
};

export type TutorTurnAnalysis = {
  /** Identifies the analyzed turn: `${player}|${die1},${die2}`. */
  key: string;
  player: Player;
  /** e.g. "13/11 · 8/5" — shown when flagging the blunder. */
  bestNotation: string;
  bestEquity: number;
  /** Best full-turn move sequence (for "play it for me"). */
  bestMoves: Move[];
  /** Every legal candidate's resulting board + equity, best first. */
  candidates: TutorTurnCandidate[];
};

export type TutorVerdict = {
  /** Equity points the played turn gave up vs the engine's best. */
  loss: number;
  bestNotation: string;
};

function boardEq(a: number[], b: number[]): boolean {
  if (a.length !== b.length)
    return false;
  for (let i = 0; i < a.length; i++) {
    if (a[i] !== b[i])
      return false;
  }
  return true;
}

/**
 * Analyze a turn-start position with the Sage engine. Returns null when the
 * engine is unavailable — tutor mode stays silent rather than guessing.
 */
export async function analyzeTutorTurn(state: GameState): Promise<TutorTurnAnalysis | null> {
  let plan;
  try {
    plan = await planSageTurnFull(state, 2);
  }
  catch {
    return null;
  }
  const candidates = plan.candidates.filter(c => Number.isFinite(c.equity));
  if (!Number.isFinite(plan.equity) || candidates.length === 0) {
    return null;
  }
  return {
    key: `${state.currentPlayer}|${state.dice[0]},${state.dice[1]}`,
    player: state.currentPlayer,
    bestNotation: formatHintNotation(plan.moves),
    bestEquity: plan.equity,
    bestMoves: plan.moves as Move[],
    candidates,
  };
}

/**
 * Judge a completed turn: find the played resulting board among the
 * engine's candidates and compare equities. Returns null when the played
 * board isn't among the candidates (partial turn, pass, undo weirdness) or
 * when the equity loss is below the blunder threshold.
 *
 * @param analysis the turn-start analysis from {@link analyzeTutorTurn}.
 * @param endBoard the turn's final board as a bgsage 26-array from the
 * mover's perspective (see gameStateToSageBoard).
 */
export function judgeTutorTurn(
  analysis: TutorTurnAnalysis,
  endBoard: number[],
): TutorVerdict | null {
  const played = analysis.candidates.find(c => boardEq(c.board, endBoard));
  if (!played)
    return null;
  const loss = analysis.bestEquity - played.equity;
  if (!(loss >= TUTOR_BLUNDER_THRESHOLD))
    return null;
  return { loss, bestNotation: analysis.bestNotation };
}
