import type { EngineTurnPlan, GameEngine } from './types';

import type { GameState } from '@/lib/game/types';
import { gameStateToSageBoard, planSageTurnFull, sageCubeDecision, sageMovesToBoard } from 'expo-bgsage';

import { engineCubeContext } from './cube-context';

/**
 * The bgsage neural-net engine, behind the GameEngine interface.
 *
 * NOTE: keep this a static import, not a dynamic import(). jest.mock()
 * cannot intercept dynamic import() (known Jest limitation), which broke
 * the unit tests in CI.
 */
export const bgsageEngine: GameEngine = {
  id: 'bgsage',

  async planTurn(state: GameState, opts): Promise<EngineTurnPlan> {
    const plan = await planSageTurnFull(state, opts?.ply ?? 2, engineCubeContext(state));
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

  movesToCandidate(state, candidate) {
    return sageMovesToBoard(state, candidate.board).map(m => ({ from: m.from, to: m.to, dieIndex: m.dieIndex }));
  },

  async analyzeCube(state) {
    const context = engineCubeContext(state);
    if (!context)
      throw new Error('No cube in this position');
    const verdict = await sageCubeDecision(state, context.cubeValue, context.cubeOwner, 2, context);
    if (![verdict.equityNoDouble, verdict.equityDoubleTake, verdict.equityDoublePass].every(Number.isFinite))
      throw new Error('bgsage returned no usable cube analysis');
    return verdict;
  },

  boardAfterTurn(state: GameState): number[] {
    return gameStateToSageBoard(state);
  },
};
