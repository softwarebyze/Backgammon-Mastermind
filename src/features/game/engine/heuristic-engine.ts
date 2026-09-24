import type { EngineTurnPlan, GameEngine } from './types';

import type { GameState, Move } from '@/lib/game/types';
import { getAIMove } from '@/lib/game/ai';

import { applyMove } from '@/lib/game/moves';

/**
 * Position fingerprint, self-consistent within this engine: a 26-array
 * from the mover's perspective (index 0 = opponent's bar, 25 = my bar),
 * mirroring the convention the primary engine uses. Only ever compared
 * against fingerprints from this same engine.
 */
function fingerprint(state: GameState): number[] {
  const P = state.currentPlayer;
  const opp = P === 'white' ? 'black' : 'white';
  const b = Array.from<number>({ length: 26 }).fill(0);
  for (let i = 1; i <= 24; i++) {
    const pt = state.points[i];
    if (!pt?.player || pt.count === 0)
      continue;
    const idx = P === 'white' ? i : 25 - i;
    b[idx] = pt.player === P ? pt.count : -pt.count;
  }
  b[25] = state.bar[P] ?? 0;
  b[0] = state.bar[opp] ?? 0;
  return b;
}

/**
 * The built-in heuristic AI, behind the GameEngine interface. It has no
 * equity model, so it offers a single candidate (the greedy line) with
 * equity 0 — enough for move suggestions, never for blunder verdicts.
 */
export const heuristicEngine: GameEngine = {
  id: 'heuristic',

  async planTurn(state: GameState): Promise<EngineTurnPlan> {
    const moves: Move[] = [];
    let snap = state;
    // At most 4 plies (doubles); stop if the turn ends or the player changes.
    for (let i = 0; i < 4; i++) {
      if (snap.phase !== 'moving' || snap.currentPlayer !== state.currentPlayer)
        break;
      const m = getAIMove(snap);
      if (!m)
        break;
      moves.push(m);
      snap = applyMove(snap, m);
    }
    if (moves.length === 0) {
      throw new Error('no legal moves to suggest');
    }
    return {
      moves,
      equity: 0,
      candidates: [{ board: fingerprint(snap), equity: 0 }],
    };
  },

  boardAfterTurn(state: GameState): number[] {
    return fingerprint(state);
  },
};
