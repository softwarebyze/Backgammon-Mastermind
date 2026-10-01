import type { EngineTurnPlan, GameEngine } from './types';

import type { GameState } from '@/lib/game/types';

import { gameStateToSageBoard, planSageTurnFull } from 'expo-bgsage';

/**
 * The bgsage neural-net engine, behind the GameEngine interface.
 *
 * NOTE: keep this a static import, not a dynamic import(). jest.mock()
 * cannot intercept dynamic import() (known Jest limitation), which broke
 * the unit tests in CI.
 */
export const bgsageEngine: GameEngine = {
  id: 'bgsage',

  async planTurn(state: GameState): Promise<EngineTurnPlan> {
    const plan = await planSageTurnFull(state, 2);
    const candidates = (plan?.candidates ?? []).filter(c => Number.isFinite(c.equity));
    if (!plan || !Number.isFinite(plan.equity) || candidates.length === 0) {
      throw new Error('bgsage returned no usable plan');
    }
    return {
      // Sage indexes into the dice as they stood at plan time. Copy the fields
      // explicitly rather than casting the whole array: a cast would launder a
      // different shape into `Move`, and `die` stays absent so the index is
      // re-resolved against the live dice as the sequence is played.
      moves: plan.moves.map(m => ({ from: m.from, to: m.to, dieIndex: m.dieIndex })),
      equity: plan.equity,
      candidates,
    };
  },

  boardAfterTurn(state: GameState): number[] {
    return gameStateToSageBoard(state);
  },
};
