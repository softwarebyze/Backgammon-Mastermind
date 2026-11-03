import type { GameEngine } from './engine';
import type { GameState } from '@/lib/game/types';
import { canOfferDouble } from '@/lib/game/match';
import { primaryEngine } from './engine';

export type MoneyCubeHint = 'double' | 'no_double' | 'accept' | 'drop';

/** Keep the offerer's perspective when answering: shouldTake is for their opponent. */
export async function getMoneyCubeHint(state: GameState, engine: GameEngine = primaryEngine): Promise<MoneyCubeHint> {
  const m = state.match;
  if (!m || m.length !== 0 || state.phase !== 'rolling' || m.result || m.winner || m.crawford
    || (!m.pendingOffer && !canOfferDouble(state))) {
    throw new Error('No money cube decision available');
  }
  if (m.jacoby === false && m.cube.value === 1)
    throw new Error('unsupported_money_rules');
  if (!engine.analyzeMoneyCube)
    throw new Error('Cube analysis unavailable');
  const owner = m.cube.owner === 'center' ? 0 : m.cube.owner === state.currentPlayer ? 1 : 2;
  const verdict = await engine.analyzeMoneyCube(state, { value: m.cube.value, owner });
  return m.pendingOffer
    ? verdict.shouldTake ? 'accept' : 'drop'
    : verdict.shouldDouble ? 'double' : 'no_double';
}
