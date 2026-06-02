import type { GameState } from './types';
import { BEAR_OFF } from './constants';
import { getLegalMoves } from './moves';

/** Points (1–24) or bar (0) that have at least one legal move this turn. */
export function getMovableSources(state: GameState): Set<number> {
  const sources = new Set<number>();
  for (const move of getLegalMoves(state)) {
    sources.add(move.from);
  }
  return sources;
}

export function getLegalTargetPoints(state: GameState): Set<number> {
  const targets = new Set<number>();
  for (const move of getLegalMoves(state)) {
    if (move.to >= 1 && move.to <= 24) {
      targets.add(move.to);
    }
  }
  return targets;
}

export function canBearOff(state: GameState): boolean {
  return getLegalMoves(state).some(m => m.to === BEAR_OFF);
}

/** True when exactly one stack (or bar) can initiate a move. */
export function hasSingleMovableSource(state: GameState): boolean {
  return getMovableSources(state).size === 1;
}
