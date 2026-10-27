import type { GameState } from './types';
import { canOfferDouble } from './match';
import { calculatePipCount } from './moves';

/**
 * Bounded classic-AI policy, NOT neural-net match equity. The shipped Sage
 * cube API has no score/Crawford inputs and exposes money-game equities only, not win probabilities. Converting those cubeful
 * equities to win chances would misrepresent gammons and recube value.
 * This single-game model ignores gammons, future recubes and market volatility.
 * Its fair, single-point continuation model is deliberately small (3/5 points).
 */
function continuation(blackAway: number, whiteAway: number): number {
  if (blackAway <= 0)
    return 1;
  if (whiteAway <= 0)
    return 0;
  return (continuation(blackAway - 1, whiteAway) + continuation(blackAway, whiteAway - 1)) / 2;
}

function winEstimate(state: GameState): number {
  // Smooth bounded racing estimate; contact/bar adjustments are heuristic.
  const black = calculatePipCount(state, 'black');
  const white = calculatePipCount(state, 'white');
  const advantage = white - black + 8 * (state.bar.white - state.bar.black);
  return Math.max(0.02, Math.min(0.98, 1 / (1 + Math.exp(-advantage / 24))));
}

export function computerCubeAction(state: GameState): 'offer' | 'accept' | 'drop' | null {
  const m = state.match;
  if (state.mode !== 'vs-computer' || !m || m.result || m.winner || state.phase !== 'rolling')
    return null;
  const blackAway = m.length - m.score.black;
  const whiteAway = m.length - m.score.white;
  const p = winEstimate(state);
  const value = (stake: number) => p * continuation(blackAway - stake, whiteAway)
    + (1 - p) * continuation(blackAway, whiteAway - stake);
  if (m.pendingOffer === 'white') {
    const drop = continuation(blackAway, whiteAway - m.cube.value);
    // Ties are takes. Refusing every offer would be especially poor at DMP.
    return value(m.cube.value * 2) >= drop ? 'accept' : 'drop';
  }
  if (state.currentPlayer !== 'black' || !canOfferDouble(state))
    return null;
  const opponentDrops = continuation(blackAway - m.cube.value, whiteAway);
  const doubled = Math.min(opponentDrops, value(m.cube.value * 2));
  // A small margin avoids speculative offers from an approximate model.
  return p >= 0.60 && doubled > value(m.cube.value) + 0.005 ? 'offer' : null;
}
