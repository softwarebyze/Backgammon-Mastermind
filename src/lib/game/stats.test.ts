import type { GameResult } from './stats';
import { storage } from '@/lib/storage';
import { createPositionState } from './create-position';
import {
  classifyWin,
  emptyStats,
  loadStats,
  RECENT_GAMES_LIMIT,
  recordResult,
  resultFromState,
  saveStats,
  winRate,
} from './stats';

function result(winner: 'white' | 'black', overrides: Partial<GameResult> = {}): GameResult {
  return { at: 1, mode: 'vs-computer', winner, kind: 'single', moves: 40, ...overrides };
}

describe('classifyWin', () => {
  it('is a single game once the loser has borne a checker off', () => {
    const state = createPositionState({ borneOff: { white: 15, black: 1 }, placements: [{ point: 20, player: 'black', count: 14 }] });
    expect(classifyWin(state, 'white')).toBe('single');
  });

  it('is a gammon when the loser bore nothing off and is out of the winner\'s home board', () => {
    const state = createPositionState({ borneOff: { white: 15 }, placements: [{ point: 20, player: 'black', count: 15 }] });
    expect(classifyWin(state, 'white')).toBe('gammon');
  });

  it('is a backgammon when the loser is still in the winner\'s home board or on the bar', () => {
    const inHome = createPositionState({ borneOff: { white: 15 }, placements: [{ point: 3, player: 'black', count: 15 }] });
    expect(classifyWin(inHome, 'white')).toBe('backgammon');
    const onBar = createPositionState({ borneOff: { black: 15 }, bar: { white: 1 }, placements: [{ point: 10, player: 'white', count: 14 }] });
    expect(classifyWin(onBar, 'black')).toBe('backgammon');
  });
});

describe('resultFromState', () => {
  it('only reports finished games', () => {
    const live = createPositionState({ useStandardSetup: true });
    expect(resultFromState(live, 10)).toBeNull();
    const done = { ...createPositionState({ borneOff: { white: 15, black: 3 } }), phase: 'game-over' as const, winner: 'white' as const };
    expect(resultFromState(done, 52, 99)).toEqual({ at: 99, mode: 'vs-computer', winner: 'white', kind: 'single', moves: 52 });
  });
});

describe('recordResult', () => {
  it('counts games, wins and the white win streak per mode', () => {
    let stats = emptyStats();
    for (const winner of ['white', 'white', 'black', 'white', 'white', 'white'] as const) {
      stats = recordResult(stats, result(winner));
    }
    expect(stats.vsComputer).toMatchObject({ played: 6, whiteWins: 5, blackWins: 1, currentStreak: 3, bestStreak: 3 });
    expect(stats.passAndPlay.played).toBe(0);
    expect(winRate(stats.vsComputer)).toBe(83);
  });

  it('tracks gammons and backgammons won', () => {
    let stats = emptyStats();
    stats = recordResult(stats, result('white', { kind: 'gammon' }));
    stats = recordResult(stats, result('white', { kind: 'backgammon' }));
    stats = recordResult(stats, result('black', { kind: 'gammon' }));
    expect(stats.vsComputer).toMatchObject({ whiteGammons: 1, whiteBackgammons: 1 });
  });

  it('keeps pass-and-play separate and caps the recent list, newest first', () => {
    let stats = emptyStats();
    for (let i = 0; i < RECENT_GAMES_LIMIT + 5; i++) {
      stats = recordResult(stats, result('black', { mode: 'vs-human', at: i }));
    }
    expect(stats.passAndPlay.played).toBe(RECENT_GAMES_LIMIT + 5);
    expect(stats.recent).toHaveLength(RECENT_GAMES_LIMIT);
    expect(stats.recent[0]!.at).toBe(RECENT_GAMES_LIMIT + 4);
  });

  it('has no win rate before the first game', () => {
    expect(winRate(emptyStats().vsComputer)).toBeNull();
  });
});

describe('stats storage', () => {
  beforeEach(() => storage.clearAll());

  it('round-trips saved stats', () => {
    const stats = recordResult(emptyStats(), result('white'));
    saveStats(stats);
    expect(loadStats()).toEqual(stats);
  });

  it('falls back to empty stats for missing or damaged data', () => {
    expect(loadStats()).toEqual(emptyStats());
    storage.set('GAME_STATS_V1', JSON.stringify({ vsComputer: { played: 'lots' } }));
    expect(loadStats()).toEqual(emptyStats());
  });
});
