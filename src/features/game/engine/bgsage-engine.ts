import type { EngineTurnPlan, GameEngine } from './types';

import type { GameState, Move } from '@/lib/game/types';

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
      moves: plan.moves as Move[],
      equity: plan.equity,
      candidates,
    };
  },

  boardAfterTurn(state: GameState): number[] {
    return gameStateToSageBoard(state);
  },
};
