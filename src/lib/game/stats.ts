import type { GameMode, GameState, Player } from './types';
import { getItem, setRawString } from '@/lib/storage';

import { opponent } from './moves';

const STORAGE_KEY = 'GAME_STATS_V1';
/** Recent games kept for the history list. Older results stay in the totals. */
export const RECENT_GAMES_LIMIT = 30;

/** Single game, gammon (loser bore nothing off) or backgammon (…and is still in the winner's home or on the bar). */
export type WinKind = 'single' | 'gammon' | 'backgammon';

export type GameResult = {
  /** ms since epoch */
  at: number;
  mode: GameMode;
  winner: Player;
  kind: WinKind;
  /** Checker moves played in the game, both sides. */
  moves: number;
};

/** Totals for one mode. Against the computer the human is always white. */
export type ModeStats = {
  played: number;
  whiteWins: number;
  blackWins: number;
  /** Gammons and backgammons won by white (you, against the computer). */
  whiteGammons: number;
  whiteBackgammons: number;
  /** Consecutive white wins, ending with the latest game. */
  currentStreak: number;
  bestStreak: number;
};

export type GameStats = {
  vsComputer: ModeStats;
  passAndPlay: ModeStats;
  recent: GameResult[];
};

function emptyMode(): ModeStats {
  return {
    played: 0,
    whiteWins: 0,
    blackWins: 0,
    whiteGammons: 0,
    whiteBackgammons: 0,
    currentStreak: 0,
    bestStreak: 0,
  };
}

export function emptyStats(): GameStats {
  return { vsComputer: emptyMode(), passAndPlay: emptyMode(), recent: [] };
}

/** White's home board is points 1–6, black's 19–24. */
function inHomeBoardOf(player: Player, point: number): boolean {
  return player === 'white' ? point >= 1 && point <= 6 : point >= 19 && point <= 24;
}

/** How big the win was, from the finished position. */
export function classifyWin(state: GameState, winner: Player): WinKind {
  const loser = opponent(winner);
  if (state.borneOff[loser] > 0) {
    return 'single';
  }
  const stuck = state.bar[loser] > 0 || state.points.some((point, index) =>
    point.player === loser && point.count > 0 && inHomeBoardOf(winner, index),
  );
  return stuck ? 'backgammon' : 'gammon';
}

/** A finished game as a result, or null when the state has no winner yet. */
export function resultFromState(state: GameState, moves: number, at = Date.now()): GameResult | null {
  if (state.phase !== 'game-over' || !state.winner) {
    return null;
  }
  return { at, mode: state.mode, winner: state.winner, kind: classifyWin(state, state.winner), moves };
}

function applyToMode(mode: ModeStats, result: GameResult): ModeStats {
  const whiteWon = result.winner === 'white';
  const currentStreak = whiteWon ? mode.currentStreak + 1 : 0;
  return {
    played: mode.played + 1,
    whiteWins: mode.whiteWins + (whiteWon ? 1 : 0),
    blackWins: mode.blackWins + (whiteWon ? 0 : 1),
    whiteGammons: mode.whiteGammons + (whiteWon && result.kind === 'gammon' ? 1 : 0),
    whiteBackgammons: mode.whiteBackgammons + (whiteWon && result.kind === 'backgammon' ? 1 : 0),
    currentStreak,
    bestStreak: Math.max(mode.bestStreak, currentStreak),
  };
}

export function recordResult(stats: GameStats, result: GameResult): GameStats {
  const key = result.mode === 'vs-computer' ? 'vsComputer' : 'passAndPlay';
  return {
    ...stats,
    [key]: applyToMode(stats[key], result),
    recent: [result, ...stats.recent].slice(0, RECENT_GAMES_LIMIT),
  };
}

/** Whole-number win percentage, or null before the first game. */
export function winRate(mode: ModeStats): number | null {
  return mode.played === 0 ? null : Math.round((mode.whiteWins / mode.played) * 100);
}

function isModeStats(value: unknown): value is ModeStats {
  if (!value || typeof value !== 'object') {
    return false;
  }
  const v = value as Record<string, unknown>;
  const counts = ['played', 'whiteWins', 'blackWins', 'whiteGammons', 'whiteBackgammons', 'currentStreak', 'bestStreak']
    .every(key => typeof v[key] === 'number' && Number.isInteger(v[key]) && (v[key] as number) >= 0);
  if (!counts) {
    return false;
  }
  // Every write keeps these consistent; anything else is damaged data.
  const m = v as ModeStats;
  return m.played === m.whiteWins + m.blackWins
    && m.whiteGammons + m.whiteBackgammons <= m.whiteWins
    && m.currentStreak <= m.bestStreak
    && m.bestStreak <= m.whiteWins;
}

/** Saved stats, or empty ones when nothing (or something unreadable) is stored. */
export function loadStats(): GameStats {
  const stored = getItem<Partial<GameStats>>(STORAGE_KEY);
  if (!stored || !isModeStats(stored.vsComputer) || !isModeStats(stored.passAndPlay)) {
    return emptyStats();
  }
  return {
    vsComputer: stored.vsComputer,
    passAndPlay: stored.passAndPlay,
    recent: Array.isArray(stored.recent) ? stored.recent.slice(0, RECENT_GAMES_LIMIT) : [],
  };
}

/** False when storage refused the write; the in-memory record still updates. */
export function saveStats(stats: GameStats): boolean {
  try {
    setRawString(STORAGE_KEY, JSON.stringify(stats));
    return true;
  }
  catch {
    return false;
  }
}
