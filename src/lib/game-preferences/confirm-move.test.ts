import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { createInitialState } from '@/lib/game/constants';
import { applyDiceRoll, applyMove, getLegalMoves, passTurn } from '@/lib/game/moves';

import {
  isAwaitingMoveConfirm,
  isLocalHumanTurn,
  shouldDeferTurnEnd,
} from './confirm-move';
import { loadGamePreferences } from './storage';

jest.mock('./storage', () => {
  const actual = jest.requireActual('./storage');
  return {
    ...actual,
    loadGamePreferences: jest.fn(() => ({
      ...actual.loadGamePreferences(),
      confirmMove: false,
    })),
  };
});

const loadPrefs = loadGamePreferences as jest.MockedFunction<typeof loadGamePreferences>;

beforeEach(() => {
  loadPrefs.mockReturnValue({ ...DEFAULT_GAME_PREFERENCES, confirmMove: false });
});

describe('confirm move helpers', () => {
  it('ships confirmMove on by default', () => {
    expect(DEFAULT_GAME_PREFERENCES.confirmMove).toBe(true);
  });

  it('defers only local human turns when the setting is on', () => {
    expect(shouldDeferTurnEnd(createInitialState('vs-computer'))).toBe(false);

    loadPrefs.mockReturnValue({ ...DEFAULT_GAME_PREFERENCES, confirmMove: true });
    const bot = { ...createInitialState('vs-computer'), currentPlayer: 'black' as const };
    expect(isLocalHumanTurn(bot)).toBe(false);
    expect(shouldDeferTurnEnd(bot)).toBe(false);
    expect(shouldDeferTurnEnd(createInitialState('vs-computer'))).toBe(true);
    expect(shouldDeferTurnEnd(createInitialState('vs-human'))).toBe(true);
  });

  it('detects when a turn is ready to confirm (ON) and ignores it when OFF', () => {
    const movingEmpty = {
      ...createInitialState('vs-human'),
      phase: 'moving' as const,
      dice: [3, 5] as [number, number],
      remainingDice: [] as number[],
    };
    expect(isAwaitingMoveConfirm(movingEmpty, true)).toBe(true);
    expect(isAwaitingMoveConfirm(movingEmpty, false)).toBe(false);

    const blocked = {
      ...createInitialState('vs-human'),
      phase: 'no-move' as const,
      dice: [6, 6] as [number, number],
      remainingDice: [6, 6, 6, 6],
    };
    expect(isAwaitingMoveConfirm(blocked, true)).toBe(true);
    expect(isAwaitingMoveConfirm(blocked, false)).toBe(false);

    const botBlocked = { ...blocked, mode: 'vs-computer' as const, currentPlayer: 'black' as const };
    expect(isAwaitingMoveConfirm(botBlocked, true)).toBe(false);
  });
});

describe('applyMove gating', () => {
  function playUntilOneDie(state: ReturnType<typeof createInitialState>) {
    let next = applyDiceRoll(state, [1, 2]);
    expect(next.phase).toBe('moving');
    while (next.remainingDice.length > 1) {
      const moves = getLegalMoves(next);
      expect(moves.length).toBeGreaterThan(0);
      next = applyMove(next, moves[0]!);
    }
    return next;
  }

  it('keeps the human turn after the last die when deferred', () => {
    const mid = playUntilOneDie(createInitialState('vs-human'));
    const last = getLegalMoves(mid)[0];
    expect(last).toBeDefined();
    const held = applyMove(mid, last!, { deferTurnEnd: true });
    expect(held.phase).toBe('moving');
    expect(held.remainingDice).toEqual([]);
    expect(held.currentPlayer).toBe(mid.currentPlayer);
    expect(isAwaitingMoveConfirm(held, true)).toBe(true);
  });

  it('auto-ends the turn after the last die when not deferred', () => {
    const mid = playUntilOneDie(createInitialState('vs-human'));
    const last = getLegalMoves(mid)[0];
    expect(last).toBeDefined();
    const passed = applyMove(mid, last!);
    expect(passed.phase).toBe('rolling');
    expect(passed.currentPlayer).not.toBe(mid.currentPlayer);
    expect(isAwaitingMoveConfirm(passed, false)).toBe(false);
  });

  it('passTurn after a deferred turn hands play to the opponent', () => {
    const mid = playUntilOneDie(createInitialState('vs-human'));
    const last = getLegalMoves(mid)[0]!;
    const held = applyMove(mid, last, { deferTurnEnd: true });
    const confirmed = passTurn(held);
    expect(confirmed.phase).toBe('rolling');
    expect(confirmed.currentPlayer).not.toBe(held.currentPlayer);
  });
});
