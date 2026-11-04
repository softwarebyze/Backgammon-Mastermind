import type { GameEngine } from './engine';
import type { GameState, Player } from '@/lib/game';
import { canBeaver, canOfferDouble } from '@/lib/game/match';
import { primaryEngine } from './engine';

export type CubeDecision = 'roll' | 'offer' | 'accept' | 'drop' | 'beaver';
export type CubeAnalysis = {
  actor: Player;
  best: CubeDecision;
  /** All values are from the deciding player's perspective, in current-cube equity units. */
  values: Partial<Record<CubeDecision, number>>;
};

/** One analysis powers Hint, Tutor, and the computer; every rule is in the engine context. */
export async function analyzeCubeDecision(state: GameState, engine: GameEngine = primaryEngine): Promise<CubeAnalysis> {
  const m = state.match;
  if (!m || state.phase !== 'rolling' || m.result || m.winner
    || (!m.pendingOffer && !canOfferDouble(state))) {
    throw new Error('No cube decision available');
  }
  if (!engine.analyzeCube)
    throw new Error('Cube analysis unavailable');
  if (m.pendingBeaver) {
    // The original roller answers the beaver. Evaluate the accepted cube from
    // that roller's perspective, then compare with losing the existing stake.
    const taken = { ...state, match: { ...m, pendingOffer: null, pendingBeaver: false, cube: { value: m.cube.value * 2, owner: m.pendingOffer! } } };
    const verdict = await engine.analyzeCube(taken);
    const accept = 2 * verdict.equityNoDouble;
    return { actor: state.currentPlayer, best: accept >= -1 ? 'accept' : 'drop', values: { accept, drop: -1 } };
  }
  const verdict = await engine.analyzeCube(state);
  if (!m.pendingOffer) {
    return {
      actor: state.currentPlayer,
      best: verdict.shouldDouble ? 'offer' : 'roll',
      values: { roll: verdict.equityNoDouble, offer: Math.min(verdict.equityDoubleTake, verdict.equityDoublePass) },
    };
  }
  const take = verdict.shouldBeaver ? verdict.equityDoubleTake / 2 : verdict.equityDoubleTake;
  const beaver = canBeaver(state);
  return {
    actor: state.currentPlayer === 'white' ? 'black' : 'white',
    best: beaver && verdict.shouldBeaver ? 'beaver' : verdict.shouldTake ? 'accept' : 'drop',
    values: { accept: -take, drop: -verdict.equityDoublePass, ...(beaver ? { beaver: -2 * take } : {}) },
  };
}

export type CubeHint = 'double' | 'no_double' | 'accept' | 'drop' | 'beaver';
export async function getCubeHint(state: GameState, engine: GameEngine = primaryEngine): Promise<CubeHint> {
  const { best } = await analyzeCubeDecision(state, engine);
  return best === 'offer' ? 'double' : best === 'roll' ? 'no_double' : best;
}
