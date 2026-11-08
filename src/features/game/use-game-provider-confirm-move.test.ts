/**
 * Confirm move setting: with the preference ON, spending the last die holds
 * the turn for Confirm / Undo. Confirm ends the turn; Undo restores a die.
 */
import type { GameState } from '@/lib/game';

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

/** Run the take-back's chained reverse slides to the end. */
function finishAllAnimations(result: { current: Provider }) {
  let guard = 0;
  while (result.current.moveAnimation && guard++ < 12) {
    finishAnimation(result);
  }
}

/** Spend the roll one checker at a time, recording the board after each. */
function playTurnRecording(result: { current: Provider }) {
  const boards: GameState['points'][] = [];
  let guard = 0;
  while (
    result.current.state?.phase === 'moving'
    && result.current.state.remainingDice.length > 0
    && guard++ < 8
  ) {
    const before = result.current.state.remainingDice.length;
    moveFirstLegal(result);
    boards.push(result.current.state!.points);
    if (result.current.state?.remainingDice.length === before)
      break;
  }
  return boards;
}

/** vs-human game, opening played, then the next roll spent: the turn is held. */
function playHeldTurn(result: { current: Provider }) {
  act(() => {
    result.current.startGame('vs-human');
  });
  playOpening(result);
  const turnStart = result.current.state!;
  const logAtStart = result.current.moveLog.length;
  const boards = playTurnRecording(result);
  const played = result.current.moveLog.length - logAtStart;
  return { turnStart, logAtStart, boards, played };
}

/** Header Redo `played` times; each landing must match `boards` when given. */
function redoTurn(result: { current: Provider }, played: number, boards?: GameState['points'][]) {
  for (let i = 0; i < played; i++) {
    act(() => {
      result.current.doRedo();
    });
    finishAnimation(result);
    if (boards)
      expect(result.current.state?.points).toEqual(boards[i]);
  }
}

/** Like `playHeldTurn`, but with a confirmed turn before it in the log. */
function playSecondHeldTurn(result: { current: Provider }) {
  act(() => {
    result.current.startGame('vs-human');
  });
  playOpening(result);
  spendAllDice(result);
  act(() => {
    result.current.doPassTurn();
  });
  expect(result.current.state?.phase).toBe('rolling');
  act(() => {
    result.current.doRollDice();
  });
  expect(result.current.state?.phase).toBe('moving');
  const turnStart = result.current.state!;
  const logAtStart = result.current.moveLog.length;
  expect(logAtStart).toBeGreaterThan(0);
  const boards = playTurnRecording(result);
  const played = result.current.moveLog.length - logAtStart;
  return { turnStart, logAtStart, boards, played };
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

  it('undo from confirm-hold does not leave a lingering historyPath arrow', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => {
      result.current.startGame('vs-human');
    });
    playOpening(result);

    spendAllDice(result);
    expect(result.current.state?.remainingDice).toEqual([]);
    expect(result.current.historyPath).toBeNull();

    act(() => {
      result.current.doUndo();
    });
    // Mid-animation must not flash the undone ply as a dashed arrow.
    expect(result.current.historyPath).toBeNull();
    finishAnimation(result);

    const afterUndo = result.current.state!;
    expect(afterUndo.phase).toBe('moving');
    expect(afterUndo.remainingDice.length).toBeGreaterThan(0);
    // And after the checker lands, still no mis-anchored undo trail.
    expect(result.current.historyPath).toBeNull();
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

describe('provider confirm move: undo all', () => {
  it('rewinds the whole held turn to the rolled position, and redo replays it', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    const { turnStart, logAtStart, boards, played } = playHeldTurn(result);
    expect(played).toBeGreaterThanOrEqual(2);
    expect(result.current.canUndoTurn).toBe(true);

    act(() => {
      result.current.doUndoTurn!();
    });
    finishAllAnimations(result);

    const after = result.current.state!;
    expect(result.current.moveLog.length).toBe(logAtStart);
    expect(after.phase).toBe('moving');
    expect(after.currentPlayer).toBe(turnStart.currentPlayer);
    expect(after.remainingDice).toEqual(turnStart.remainingDice);
    expect(after.points).toEqual(turnStart.points);
    expect(result.current.canUndoTurn).toBe(false);
    expect(result.current.isAnimating).toBe(false);

    // Every undone move went onto the redo stack, and replays in order.
    expect(result.current.canRedo).toBe(true);
    redoTurn(result, played, boards);
    expect(result.current.moveLog.length).toBe(logAtStart + played);
    expect(result.current.state?.remainingDice).toEqual([]);
  });

  it('ignores a second Undo or Redo while the turn is still sliding back', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    const { turnStart, logAtStart, played } = playHeldTurn(result);
    expect(played).toBeGreaterThanOrEqual(2);

    act(() => {
      result.current.doUndoTurn!();
    });
    // First reverse slide lands; the rest of the turn is still sliding back.
    finishAnimation(result);
    expect(result.current.isAnimating).toBe(true);
    // Double-tap Undo, then the header controls, mid-chain.
    act(() => {
      result.current.doUndoTurn!();
    });
    act(() => {
      result.current.doUndo();
    });
    act(() => {
      result.current.doRedo();
    });
    finishAllAnimations(result);

    // The rewind still lands exactly on the rolled position, log and timeline in step.
    expect(result.current.moveLog.length).toBe(logAtStart);
    expect(result.current.state?.points).toEqual(turnStart.points);
    expect(result.current.state?.remainingDice).toEqual(turnStart.remainingDice);
    redoTurn(result, played);
    expect(result.current.moveLog.length).toBe(logAtStart + played);
    expect(result.current.state?.remainingDice).toEqual([]);
  });

  it('keeps the previous turn intact when Undo follows Undo all before the slide renders', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    const { turnStart, logAtStart, boards, played } = playSecondHeldTurn(result);
    expect(played).toBeGreaterThanOrEqual(2);
    const opponent = turnStart.currentPlayer === 'white' ? 'black' : 'white';

    // Both taps land in one tick: the reverse slide is armed but not on screen
    // yet, so the header Undo completes the rewind instantly and then steps
    // back one more ply, into the previous turn.
    act(() => {
      result.current.doUndoTurn!();
      result.current.doUndo();
    });
    finishAllAnimations(result);

    // Exactly one ply of the previous turn is gone: no extra pop from the
    // armed slide callback, and the log stays in step with the timeline.
    expect(result.current.moveLog.length).toBe(logAtStart - 1);
    expect(result.current.state?.currentPlayer).toBe(opponent);
    expect(result.current.isAnimating).toBe(false);

    // Redo lands back on the rolled position, then replays the held turn.
    act(() => {
      result.current.doRedo();
    });
    finishAnimation(result);
    expect(result.current.moveLog.length).toBe(logAtStart);
    expect(result.current.state?.points).toEqual(turnStart.points);
    expect(result.current.state?.remainingDice).toEqual(turnStart.remainingDice);
    redoTurn(result, played, boards);
    expect(result.current.moveLog.length).toBe(logAtStart + played);
    expect(result.current.state?.remainingDice).toEqual([]);
  });

  it('is not offered after a single move', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => {
      result.current.startGame('vs-human');
    });
    playOpening(result);
    expect(result.current.canUndoTurn).toBe(false);
    moveFirstLegal(result);
    expect(result.current.canUndoTurn).toBe(false);
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
