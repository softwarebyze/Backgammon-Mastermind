/**
 * Sage hint — asks the bgsage neural-net engine for the best turn, with a
 * graceful fallback to the built-in heuristic AI when the engine isn't
 * available (Expo Go, unlinked native module, web assets not yet loaded).
 *
 * The expo-bgsage import is side-effect free on every platform: the native
 * module handle is only required (and the WASM only fetched) inside the
 * async planSageTurn call, so merely rendering a game screen never pays
 * the cost of — or fails on — the engine.
 *
 * NOTE: keep this a static import, not a dynamic import(). jest.mock()
 * cannot intercept dynamic import() (known Jest limitation), which broke
 * the unit tests in CI.
 */
import type { GameState, Move } from '@/lib/game/types';

import { planSageTurn } from 'expo-bgsage';

import { getAIMove } from '@/lib/game/ai';
import { applyMove } from '@/lib/game/moves';

export type SageHint = {
  moves: Move[];
  /** e.g. "13/11 · 8/5" */
  notation: string;
  ms: number;
  /** Which brain produced the suggestion. */
  engine: 'sage' | 'heuristic';
};

function pointLabel(p: number): string {
  if (p === 0) return 'bar';
  if (p === 25) return 'off';
  return String(p);
}

export function formatHintNotation(moves: Array<{ from: number; to: number }>): string {
  return moves.map(m => `${pointLabel(m.from)}/${pointLabel(m.to)}`).join(' · ');
}

/** Greedy full-turn plan using the built-in heuristic AI. */
function heuristicTurn(state: GameState): Move[] {
  const moves: Move[] = [];
  let snap = state;
  // At most 4 plies (doubles); stop if the turn ends or the player changes.
  for (let i = 0; i < 4; i++) {
    if (snap.phase !== 'moving' || snap.currentPlayer !== state.currentPlayer) break;
    const m = getAIMove(snap);
    if (!m) break;
    moves.push(m);
    snap = applyMove(snap, m);
  }
  return moves;
}

export async function getSageHint(state: GameState): Promise<SageHint> {
  const t0 = Date.now();
  try {
    const sageMoves = await planSageTurn(state, 2);
    const moves = sageMoves as Move[];
    if (moves.length > 0) {
      return {
        moves,
        notation: formatHintNotation(moves),
        ms: Date.now() - t0,
        engine: 'sage',
      };
    }
  } catch {
    // Engine unavailable — fall through to the heuristic.
  }
  const moves = heuristicTurn(state);
  if (moves.length === 0) {
    throw new Error('no legal moves to suggest');
  }
  return {
    moves,
    notation: formatHintNotation(moves),
    ms: Date.now() - t0,
    engine: 'heuristic',
  };
}
