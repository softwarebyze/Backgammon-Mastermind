import type { GameMode, GameState, Player } from './types';
import { createInitialState } from './constants';

export type MatchState = {
  length: 3 | 5;
  score: Record<Player, number>;
  cube: { value: number; owner: Player | 'center' };
  pendingOffer: Player | null;
  crawford: boolean;
  crawfordPlayed: boolean;
  gameNumber: number;
  winner: Player | null;
  result: { winner: Player; points: number; kind: 'single' | 'gammon' | 'backgammon' | 'drop' } | null;
  /** Binding cube/roll decisions: undo only checker moves after this ply. */
  undoFloor: number;
};

export function createMatch(length: 3 | 5): MatchState {
  return { length, score: { white: 0, black: 0 }, cube: { value: 1, owner: 'center' }, pendingOffer: null, crawford: false, crawfordPlayed: false, gameNumber: 1, winner: null, result: null, undoFloor: 0 };
}

export function createMatchGame(length: 3 | 5, mode: GameMode = 'vs-human'): GameState {
  return { ...createInitialState(mode), match: createMatch(length) };
}

/** USBGF Ruling Guide 4.4: before own roll, acceptor owns, Crawford and dead cubes. */
export function canOfferDouble(state: GameState): boolean {
  const m = state.match;
  return !!m && state.phase === 'rolling' && !m.pendingOffer
    && !m.winner && !m.result && !m.crawford
    && (m.cube.owner === 'center' || m.cube.owner === state.currentPlayer)
    && m.score[state.currentPlayer] + m.cube.value < m.length;
}

export function offerDouble(state: GameState, ply: number): GameState {
  if (!canOfferDouble(state))
    return state;
  return { ...state, match: { ...state.match!, pendingOffer: state.currentPlayer, undoFloor: ply } };
}

export function acceptDouble(state: GameState): GameState {
  const m = state.match;
  if (!m?.pendingOffer)
    return state;
  const owner = m.pendingOffer === 'white' ? 'black' : 'white';
  return { ...state, match: { ...m, pendingOffer: null, cube: { value: m.cube.value * 2, owner } } };
}

function award(state: GameState, winner: Player, kind: NonNullable<MatchState['result']>['kind']): GameState {
  const m = state.match;
  if (!m || m.result)
    return state;
  const points = m.cube.value * (kind === 'backgammon' ? 3 : kind === 'gammon' ? 2 : 1);
  const score = { ...m.score, [winner]: m.score[winner] + points };
  return { ...state, phase: 'game-over', winner, remainingDice: [], selectedPoint: null, legalMovesForSelected: [], match: { ...m, score, pendingOffer: null, winner: score[winner] >= m.length ? winner : null, result: { winner, points, kind } } };
}

export function dropDouble(state: GameState): GameState {
  const winner = state.match?.pendingOffer;
  return winner ? award(state, winner, 'drop') : state;
}

/** USBGF Basics: no checker off = gammon; also on bar/in winner's home = backgammon. */
export function scoreMatchGame(state: GameState): GameState {
  if (!state.match || state.phase !== 'game-over' || !state.winner || state.match.result)
    return state;
  const loser = state.winner === 'white' ? 'black' : 'white';
  if (state.borneOff[loser] > 0)
    return award(state, state.winner, 'single');
  const inWinnersHome = state.points.some((p, i) => p.player === loser && p.count > 0
    && (state.winner === 'white' ? i >= 1 && i <= 6 : i >= 19 && i <= 24));
  return state.bar[loser] > 0 || inWinnersHome
    ? award(state, state.winner, 'backgammon')
    : award(state, state.winner, 'gammon');
}

export function nextMatchGame(state: GameState): GameState {
  const m = state.match;
  if (!m?.result || m.winner)
    return state;
  const crawford = !m.crawfordPlayed && (m.score.white === m.length - 1 || m.score.black === m.length - 1);
  // Every game uses the normal opening roll; previous game winner has no privilege.
  return { ...createInitialState(state.mode), match: { ...m, cube: { value: 1, owner: 'center' }, pendingOffer: null, result: null, gameNumber: m.gameNumber + 1, crawford, crawfordPlayed: m.crawfordPlayed || crawford, undoFloor: 0 } };
}
