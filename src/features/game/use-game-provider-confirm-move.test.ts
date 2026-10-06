/**
 * Confirm move setting: with the preference ON, spending the last die holds
 * the turn for Confirm / Undo. Confirm ends the turn; Undo restores a die.
 */
import { getLegalMoves } from '@/lib/game';
import { loadGamePreferences } from '@/lib/game-preferences/storage';
import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { act, renderHook } from '@/lib/test-utils';

import { useGameProviderValue } from './use-game-provider-value';

jest.mock('@/lib/game-preferences/storage', () => {
  const actual = jest.requireActual('@/lib/game-preferences/storage');
  const { DEFAULT_GAME_PREFERENCES: defaults } = jest.requireActual('@/lib/game-preferences/types');
  return {
    ...actual,
    loadGamePreferences: jest.fn(() => ({
      ...defaults,
      confirmMove: true,
      autoRoll: false,
    })),
  };
});

const loadPrefs = loadGamePreferences as jest.MockedFunction<typeof loadGamePreferences>;

type Provider = ReturnType<typeof useGameProviderValue>;

function finishAnimation(result: { current: Provider }) {
  const frame = result.current.moveAnimation;
  if (frame?.onFinish) {
    act(() => {
      frame.onFinish();
    });
  }
}

function playOpening(result: { current: Provider }) {
  let guard = 0;
  while (result.current.state?.phase === 'opening-roll' && guard++ < 100) {
    act(() => {
      result.current.doRollDice();
    });
  }
  expect(result.current.state?.phase).toBe('moving');
}

function moveFirstLegal(result: { current: Provider }) {
  const moves = getLegalMoves(result.current.state!);
  expect(moves.length).toBeGreaterThan(0);
  act(() => {
    result.current.doMove(moves[0]!);
  });
  finishAnimation(result);
}

/** Spend every die on this turn (same idea as forced auto-move finishing the turn). */
function spendAllDice(result: { current: Provider }) {
  let guard = 0;
  while (
    result.current.state?.phase === 'moving'
    && (result.current.state.remainingDice.length ?? 0) > 0
    && guard++ < 8
  ) {
    const before = result.current.state.remainingDice.length;
    moveFirstLegal(result);
    if (result.current.state?.remainingDice.length === before) {
      break;
    }
  }
}

beforeEach(() => {
  loadPrefs.mockReturnValue({ ...DEFAULT_GAME_PREFERENCES, confirmMove: true, autoRoll: false });
});

describe('provider confirm move on', () => {
  it('holds the turn after the last checker move', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => {
      result.current.startGame('vs-human');
    });
    playOpening(result);
    const player = result.current.state!.currentPlayer;
    const dice = [...result.current.state!.dice];

    spendAllDice(result);

    const held = result.current.state!;
    expect(held.phase).toBe('moving');
    expect(held.remainingDice).toEqual([]);
    expect(held.currentPlayer).toBe(player);
    expect(held.dice).toEqual(dice);
  });

  it('confirm ends the turn; undo restores a checker', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => {
      result.current.startGame('vs-human');
    });
    playOpening(result);
    const player = result.current.state!.currentPlayer;

    spendAllDice(result);
    expect(result.current.state?.remainingDice).toEqual([]);
    expect(result.current.canUndo).toBe(true);

    act(() => {
      result.current.doUndo();
    });
    finishAnimation(result);
    const afterUndo = result.current.state!;
    expect(afterUndo.phase).toBe('moving');
    expect(afterUndo.currentPlayer).toBe(player);
    expect(afterUndo.remainingDice.length).toBeGreaterThan(0);

    spendAllDice(result);
    expect(result.current.state?.remainingDice).toEqual([]);

    act(() => {
      result.current.doPassTurn();
    });
    const afterConfirm = result.current.state!;
    expect(afterConfirm.phase).toBe('rolling');
    expect(afterConfirm.currentPlayer).not.toBe(player);
  });
});

describe('provider confirm move off', () => {
  it('auto-ends the turn after the last checker move', () => {
    loadPrefs.mockReturnValue({ ...DEFAULT_GAME_PREFERENCES, confirmMove: false, autoRoll: false });
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => {
      result.current.startGame('vs-human');
    });
    playOpening(result);
    const player = result.current.state!.currentPlayer;

    spendAllDice(result);

    const next = result.current.state!;
    expect(next.phase).toBe('rolling');
    expect(next.currentPlayer).not.toBe(player);
  });
});
