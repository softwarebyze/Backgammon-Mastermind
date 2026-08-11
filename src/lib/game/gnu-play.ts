/**
 * Map GNU / XG checker-play notation onto our single-die Move list.
 *
 * Notation is from the side on roll: their ace = 1. White uses absolute
 * points; Black mirrors (GNU 1 ↔ absolute 24).
 */
import type { GameState, Move, Player } from './types';

import { BAR_POINT, BEAR_OFF } from './constants';
import { applyMove, findMoveSequence, getLegalMoves } from './moves';

function gnuPointToAbsolute(token: string, player: Player): number | null {
  const t = token.trim().toLowerCase();
  if (t === 'bar')
    return BAR_POINT;
  if (t === 'off')
    return BEAR_OFF;
  const n = Number(t);
  if (!Number.isInteger(n) || n < 1 || n > 24)
    return null;
  return player === 'white' ? n : 25 - n;
}

/**
 * Parse one token like "8/5", "24/18/13", "bar/23*", "3/off".
 * Returns absolute from→…→to waypoints (hits stripped).
 */
export function parseGnuMoveToken(token: string, player: Player): number[] | null {
  const cleaned = token.replace(/\*/g, '');
  const parts = cleaned.split('/').filter(Boolean);
  if (parts.length < 2)
    return null;
  const points: number[] = [];
  for (const part of parts) {
    const abs = gnuPointToAbsolute(part, player);
    if (abs === null)
      return null;
    points.push(abs);
  }
  return points;
}

function applyEndpoint(
  state: GameState,
  from: number,
  to: number,
): { moves: Move[]; state: GameState } | null {
  const direct = getLegalMoves(state).find(m => m.from === from && m.to === to);
  if (direct) {
    return { moves: [direct], state: applyMove(state, direct) };
  }

  const seq = findMoveSequence(state, from, to);
  if (!seq || seq.length === 0)
    return null;

  let next = state;
  for (const m of seq)
    next = applyMove(next, m);
  return { moves: seq, state: next };
}

/**
 * Resolve a full GNU play string (e.g. "8/5 6/5") into legal single-die moves.
 * Returns null if the play cannot be realized from `state`.
 */
export function resolveGnuPlay(state: GameState, moveNotation: string): Move[] | null {
  const tokens = moveNotation.trim().split(/\s+/).filter(Boolean);
  if (tokens.length === 0)
    return null;

  const player = state.currentPlayer;
  let current = state;
  const out: Move[] = [];

  for (const token of tokens) {
    const waypoints = parseGnuMoveToken(token, player);
    if (!waypoints)
      return null;

    for (let i = 0; i < waypoints.length - 1; i++) {
      const from = waypoints[i]!;
      const to = waypoints[i + 1]!;
      // Same point can appear when notation collapses; skip no-ops.
      if (from === to)
        continue;
      const applied = applyEndpoint(current, from, to);
      if (!applied)
        return null;
      out.push(...applied.moves);
      current = applied.state;
    }
  }

  return out.length > 0 ? out : null;
}
