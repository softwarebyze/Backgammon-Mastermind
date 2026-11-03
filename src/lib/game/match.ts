import type { GameMode, GameState, Player } from './types';
import { createInitialState } from './constants';

export type MatchState = {
  /** Points to win (0 for money play): Home offers odd lengths to 25; a set-up position may carry any length. */
  length: number;
  /** Money games only. Missing means Jacoby on for older money saves. */
  jacoby?: boolean;
  beavers?: boolean;
  /** Maximum cube face; missing means the engine's supported cap. */
  cubeLimit?: number;
  /** An immediate redouble: the beaverer retains ownership when accepted. */
  pendingBeaver?: boolean;
  score: Record<Player, number>;
  cube: { value: number; owner: Player | 'center' };
  pendingOffer: Player | null;
  /** This game is the Crawford game: no doubling. */
  crawford: boolean;
  crawfordPlayed: boolean;
  /** Whether the match plays the Crawford rule at all; saves from before it existed did. */
  crawfordRule?: boolean;
  gameNumber: number;
  winner: Player | null;
  result: { winner: Player; points: number; kind: 'single' | 'gammon' | 'backgammon' | 'drop' } | null;
  /** Binding cube/roll decisions: undo only checker moves after this ply. */
  undoFloor: number;
};

export function createMatch(length: number, crawfordRule = true): MatchState {
  return { length, ...(length === 0 ? { jacoby: true } : {}), score: { white: 0, black: 0 }, cube: { value: 1, owner: 'center' }, pendingOffer: null, crawford: false, crawfordPlayed: false, crawfordRule: length > 0 && crawfordRule, gameNumber: 1, winner: null, result: null, undoFloor: 0 };
}

export function createMatchGame(length: number, mode: GameMode = 'vs-human', crawfordRule = true): GameState {
  return { ...createInitialState(mode), match: createMatch(length, crawfordRule) };
}

/** USBGF Ruling Guide 4.4: before own roll, acceptor owns, Crawford and dead cubes. */
export function canOfferDouble(state: GameState): boolean {
  const m = state.match;
  return !!m && state.phase === 'rolling' && !m.pendingOffer
    && !m.winner && !m.result && !m.crawford
    && (m.cube.owner === 'center' || m.cube.owner === state.currentPlayer)
    && m.cube.value * 2 <= (m.cubeLimit ?? 32768)
    && (m.length === 0 || m.score[state.currentPlayer] + m.cube.value < m.length);
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
  const owner = m.pendingBeaver ? m.pendingOffer : (m.pendingOffer === 'white' ? 'black' : 'white');
  return { ...state, match: { ...m, ...(m.pendingBeaver ? { pendingBeaver: false } : {}), pendingOffer: null, cube: { value: m.cube.value * 2, owner } } };
}

/** Beavers are money-only immediate redoubles; there is no second beaver/raccoon. */
export function canBeaver(state: GameState): boolean {
  const m = state.match;
  return !!m && m.length === 0 && !!m.beavers && state.phase === 'rolling'
    && !!m.pendingOffer && m.pendingOffer === state.currentPlayer && !m.pendingBeaver
    && !m.result && !m.winner && m.cube.value * 4 <= (m.cubeLimit ?? 32768);
}

export function beaverDouble(state: GameState): GameState {
  if (!canBeaver(state))
    return state;
  const m = state.match!;
  const player = state.currentPlayer === 'white' ? 'black' : 'white';
  return { ...state, match: { ...m, cube: { value: m.cube.value * 2, owner: player }, pendingOffer: player, pendingBeaver: true } };
}

function award(state: GameState, winner: Player, kind: NonNullable<MatchState['result']>['kind']): GameState {
  const m = state.match;
  if (!m || m.result)
    return state;
  if (m.length === 0 && m.jacoby !== false && m.cube.owner === 'center' && kind !== 'drop')
    kind = 'single';
  const points = m.cube.value * (kind === 'backgammon' ? 3 : kind === 'gammon' ? 2 : 1);
  const score = { ...m.score, [winner]: m.score[winner] + points };
  return { ...state, phase: 'game-over', winner, remainingDice: [], selectedPoint: null, legalMovesForSelected: [], match: { ...m, score, ...(m.pendingBeaver ? { pendingBeaver: false } : {}), pendingOffer: null, winner: m.length > 0 && score[winner] >= m.length ? winner : null, result: { winner, points, kind } } };
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
  const crawford = m.length > 0 && m.crawfordRule !== false && !m.crawfordPlayed && (m.score.white === m.length - 1 || m.score.black === m.length - 1);
  // Every game uses the normal opening roll; previous game winner has no privilege.
  return { ...createInitialState(state.mode), match: { ...m, cube: { value: 1, owner: 'center' }, ...(m.pendingBeaver ? { pendingBeaver: false } : {}), pendingOffer: null, result: null, gameNumber: m.gameNumber + 1, crawford, crawfordPlayed: m.crawfordPlayed || crawford, undoFloor: 0 } };
}
