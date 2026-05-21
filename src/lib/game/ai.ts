/**
 * AI module – simple heuristic search.
 *
 * Strategy:
 *  1. Evaluate all legal first moves.
 *  2. For each, recursively evaluate the best follow-up move sequence.
 *  3. Pick the first move that leads to the highest-scoring leaf state.
 *
 * Board evaluation weights:
 *  - Pip count differential (core racing metric)
 *  - Blot exposure (penalty for lone checkers)
 *  - Points made (bonus for anchors)
 *  - Bar penalty
 *  - Borne-off bonus
 */

import type { GameState, Move, Player } from './types';
import { applyMove, calculatePipCount, getLegalMoves, opponent } from './moves';

// ---------------------------------------------------------------------------
// Board evaluation
// ---------------------------------------------------------------------------

function countBlots(state: GameState, player: Player): number {
  let n = 0;
  for (let p = 1; p <= 24; p++) {
    if (state.points[p].player === player && state.points[p].count === 1)
      n++;
  }
  return n;
}

function countMadePoints(state: GameState, player: Player): number {
  let n = 0;
  for (let p = 1; p <= 24; p++) {
    if (state.points[p].player === player && state.points[p].count >= 2)
      n++;
  }
  return n;
}

function longestPrime(state: GameState, player: Player): number {
  let best = 0;
  let run = 0;
  for (let p = 1; p <= 24; p++) {
    if (state.points[p].player === player && state.points[p].count >= 2) {
      run++;
      best = Math.max(best, run);
    }
    else {
      run = 0;
    }
  }
  return best;
}

function evaluateBoard(state: GameState, aiPlayer: Player): number {
  const opp = opponent(aiPlayer);

  const myPips = calculatePipCount(state, aiPlayer);
  const theirPips = calculatePipCount(state, opp);

  let score = (theirPips - myPips) * 2;

  score -= countBlots(state, aiPlayer) * 6;
  score += countBlots(state, opp) * 2;

  score += countMadePoints(state, aiPlayer) * 4;
  score -= countMadePoints(state, opp) * 2;

  score += longestPrime(state, aiPlayer) * 3;

  score -= state.bar[aiPlayer] * 18;
  score += state.bar[opp] * 12;

  score += state.borneOff[aiPlayer] * 25;
  score -= state.borneOff[opp] * 25;

  return score;
}

// ---------------------------------------------------------------------------
// Recursive best-sequence search
// ---------------------------------------------------------------------------

const MAX_DEPTH = 4; // maximum move depth to search

function bestScore(state: GameState, aiPlayer: Player, depth: number): number {
  if (depth === 0)
    return evaluateBoard(state, aiPlayer);
  if (state.currentPlayer !== aiPlayer || state.phase !== 'moving') {
    return evaluateBoard(state, aiPlayer);
  }

  const moves = getLegalMoves(state);
  if (moves.length === 0)
    return evaluateBoard(state, aiPlayer);

  let best = -Infinity;
  const seen = new Set<string>();

  for (const move of moves) {
    const key = `${move.from}:${move.to}`;
    if (seen.has(key))
      continue;
    seen.add(key);

    const next = applyMove(state, move);
    const score = bestScore(next, aiPlayer, depth - 1);
    if (score > best)
      best = score;
  }

  return best;
}

// ---------------------------------------------------------------------------
// Public API
// ---------------------------------------------------------------------------

/**
 * Choose the best single move for the AI player.
 * Returns null if no legal moves exist.
 */
export function getAIMove(state: GameState): Move | null {
  const moves = getLegalMoves(state);
  if (moves.length === 0)
    return null;

  const aiPlayer = state.currentPlayer;
  let bestMoveScore = -Infinity;
  let bestMove: Move | null = null;
  const seen = new Set<string>();

  for (const move of moves) {
    const key = `${move.from}:${move.to}`;
    if (seen.has(key))
      continue;
    seen.add(key);

    const next = applyMove(state, move);
    const score = bestScore(next, aiPlayer, Math.min(MAX_DEPTH - 1, next.remainingDice.length));
    if (score > bestMoveScore) {
      bestMoveScore = score;
      bestMove = move;
    }
  }

  return bestMove;
}
