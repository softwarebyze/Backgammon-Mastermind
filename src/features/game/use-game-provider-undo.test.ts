import type { GameState } from '@/lib/game';
/**
 * Provider-level regression tests for undo keeping the player's roll.
 *
 * Covers Zachary's report (2026-09-24): "When I roll, move a checker, then
 * press undo, it shouldn't have me roll again. Obviously it should just undo
 * that move and let me make a different move with the same roll."
 *
 * Drives the real composed provider (useGameProviderValue): startGame ->
 * opening -> roll -> doMove -> doUndo, completing each animation frame by
 * invoking its onFinish the way the board UI does when a slide lands.
 */
import { getLegalMoves } from '@/lib/game';
import { act, renderHook } from '@/lib/test-utils';

import { useGameProviderValue } from './use-game-provider-value';

type Provider = ReturnType<typeof useGameProviderValue>;

/** Fire the pending animation frame's onFinish, like the board UI does. */
function finishAnimation(result: { current: Provider }) {
  const frame = result.current.moveAnimation;
  if (frame?.onFinish) {
    act(() => {
      frame.onFinish();
    });
  }
}

/** Roll the opening until somebody wins it (ties re-roll). */
function playOpening(result: { current: Provider }) {
  let guard = 0;
  while (result.current.state?.phase === 'opening-roll' && guard++ < 10) {
    act(() => {
      result.current.doRollDice();
    });
  }
  expect(result.current.state?.phase).toBe('moving');
}

function roll(result: { current: Provider }) {
  act(() => {
    result.current.doRollDice();
  });
  expect(result.current.state?.phase).toBe('moving');
}

function moveFirstLegal(result: { current: Provider }): GameState {
  const moves = getLegalMoves(result.current.state!);
  expect(moves.length).toBeGreaterThan(0);
  act(() => {
    result.current.doMove(moves[0]!);
  });
  finishAnimation(result);
  return result.current.state!;
}

function undo(result: { current: Provider }) {
  expect(result.current.canUndo).toBe(true);
  act(() => {
    result.current.doUndo();
  });
  finishAnimation(result);
}

/** Complete a vs-computer opening: human rolls directly, computer rolls via AI timers. */
function playComputerOpening(result: { current: Provider }) {
  jest.useFakeTimers();
  try {
    let guard = 0;
    while (result.current.state?.phase === 'opening-roll' && guard++ < 20) {
      if (result.current.state.currentPlayer === 'white') {
        act(() => {
          result.current.doRollDice();
        });
      }
      else {
        act(() => {
          jest.advanceTimersByTime(5000);
        });
      }
    }
    expect(result.current.state?.phase).toBe('moving');
    // If the computer won the opening, let it finish its turn.
    guard = 0;
    while (result.current.state?.currentPlayer !== 'white' && guard++ < 40) {
      act(() => {
        jest.advanceTimersByTime(5000);
      });
      finishAnimation(result);
    }
    expect(result.current.state?.currentPlayer).toBe('white');
  }
  finally {
    jest.useRealTimers();
  }
}

describe('provider undo keeps the roll (pass-and-play)', () => {
  it('pass-and-play: roll, move, undo restores the same dice in phase moving', () => {
    const { result } = renderHook(() => useGameProviderValue());
    act(() => {
      result.current.startGame('vs-human');
    });
    playOpening(result);
    const dice = result.current.state!.dice;

    moveFirstLegal(result);
    undo(result);

    const restored = result.current.state!;
    expect(restored.phase).toBe('moving');
    expect(restored.dice).toEqual(dice);
    expect(restored.remainingDice).toHaveLength(dice[0] === dice[1] ? 4 : 2);
  });

  it('pass-and-play: undo after two moves restores one move with the same roll', () => {
    const { result } = renderHook(() => useGameProviderValue());
    act(() => {
      result.current.startGame('vs-human');
    });
    playOpening(result);
    const dice = result.current.state!.dice;

    moveFirstLegal(result);
    // Second move if the turn is still going.
    if (result.current.state?.phase === 'moving') {
      moveFirstLegal(result);
    }
    undo(result);

    const restored = result.current.state!;
    expect(restored.phase).toBe('moving');
    expect(restored.dice).toEqual(dice);
    // Exactly one die was consumed by the remaining (not undone) move.
    const expectedRemaining = (dice[0] === dice[1] ? 4 : 2) - 1;
    expect(restored.remainingDice).toHaveLength(expectedRemaining);
  });

  it('pass-and-play: after undo, an alternate legal move can be made with the same roll', () => {
    const { result } = renderHook(() => useGameProviderValue());
    act(() => {
      result.current.startGame('vs-human');
    });
    playOpening(result);
    const dice = result.current.state!.dice;

    const before = result.current.state!;
    const moves = getLegalMoves(before);
    expect(moves.length).toBeGreaterThan(0);
    act(() => {
      result.current.doMove(moves[0]!);
    });
    finishAnimation(result);
    undo(result);

    const restored = result.current.state!;
    expect(restored.phase).toBe('moving');
    expect(restored.dice).toEqual(dice);

    // Play a different move than the undone one (when one exists).
    const alt = getLegalMoves(restored).find(m =>
      m.from !== moves[0]!.from || m.to !== moves[0]!.to,
    ) ?? getLegalMoves(restored)[0]!;
    act(() => {
      result.current.doMove(alt);
    });
    finishAnimation(result);
    const afterAlt = result.current.state!;
    expect(afterAlt.dice).toEqual(dice);
    expect(afterAlt.remainingDice.length).toBeLessThan(restored.remainingDice.length);
  });
});

describe('provider undo keeps the roll (vs-computer and history)', () => {
  it('pass-and-play mid-game: roll, move, undo keeps the same roll', () => {
    const { result } = renderHook(() => useGameProviderValue());
    act(() => {
      result.current.startGame('vs-human');
    });
    playOpening(result);

    // Play a full first turn so we are on a regular mid-game turn.
    let guard = 0;
    while (result.current.state?.phase === 'moving' && guard++ < 8) {
      const mv = getLegalMoves(result.current.state!)[0];
      if (!mv)
        break;
      act(() => {
        result.current.doMove(mv);
      });
      finishAnimation(result);
    }
    expect(result.current.state?.phase).toBe('rolling');

    roll(result);
    const dice = result.current.state!.dice;
    moveFirstLegal(result);
    undo(result);

    const restored = result.current.state!;
    expect(restored.phase).toBe('moving');
    expect(restored.dice).toEqual(dice);
  });

  it('vs-computer: human roll, move, undo restores the human roll', () => {
    const { result } = renderHook(() => useGameProviderValue());
    act(() => {
      result.current.startGame('vs-computer');
    });
    playComputerOpening(result);
    // Human turn: roll if needed, then move + undo.
    if (result.current.state?.phase === 'rolling') {
      roll(result);
    }
    expect(result.current.state?.phase).toBe('moving');
    const dice = result.current.state!.dice;

    moveFirstLegal(result);
    // Undo before the turn passes to the computer.
    if (result.current.state?.phase === 'moving') {
      undo(result);
      const restored = result.current.state!;
      expect(restored.phase).toBe('moving');
      expect(restored.currentPlayer).toBe('white');
      expect(restored.dice).toEqual(dice);
    }
  });

  it('undo -> redo -> undo still restores the same roll', () => {
    const { result } = renderHook(() => useGameProviderValue());
    act(() => {
      result.current.startGame('vs-human');
    });
    playOpening(result);
    const dice = result.current.state!.dice;

    moveFirstLegal(result);
    undo(result);
    expect(result.current.canRedo).toBe(true);
    act(() => {
      result.current.doRedo();
    });
    finishAnimation(result);
    undo(result);

    const restored = result.current.state!;
    expect(restored.phase).toBe('moving');
    expect(restored.dice).toEqual(dice);
  });
});
