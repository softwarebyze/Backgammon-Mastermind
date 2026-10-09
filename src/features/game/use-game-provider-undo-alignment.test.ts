import type { GameState, Move } from '@/lib/game';
/**
 * Provider-level regression tests for undo/redo staying aligned with the move
 * log and never changing the roll.
 *
 * Covers raw feedback 8/30 ("sometimes when undoing one move, a previous move
 * or opponent's move gets animated too") and the 9/23 note (undo/redo must
 * never change the roll). Blocked rolls ("no move") are logged but used to
 * skip the timeline, so the undo cursor pointed at the wrong log entry.
 */
import { createInitialPoints, getLegalMoves } from '@/lib/game';
import { act, renderHook } from '@/lib/test-utils';

import { useGameProviderValue } from './use-game-provider-value';

type Provider = ReturnType<typeof useGameProviderValue>;
type Hook = { current: Provider };

function mockDice(a: number, b: number) {
  const face = (v: number) => (v - 1) / 6 + 0.05;
  jest.spyOn(Math, 'random').mockReturnValueOnce(face(a)).mockReturnValueOnce(face(b));
}

function finishAnimation(result: Hook) {
  let guard = 0;
  while (result.current.moveAnimation?.onFinish && guard++ < 10) {
    const frame = result.current.moveAnimation;
    act(() => {
      frame.onFinish();
    });
  }
}

/**
 * Black to play [1, 2] from the 1-point. White is on the bar behind a closed
 * board (black holds points 19-24), so any white roll is blocked.
 */
function blockedWhitePosition(): GameState {
  const points = createInitialPoints().map(() => ({ player: null, count: 0 })) as GameState['points'];
  points[1] = { player: 'black', count: 3 };
  for (let p = 19; p <= 24; p++) {
    points[p] = { player: 'black', count: 2 };
  }
  points[6] = { player: 'white', count: 14 };
  return {
    points,
    bar: { white: 1, black: 0 },
    borneOff: { white: 0, black: 0 },
    currentPlayer: 'black',
    dice: [1, 2],
    remainingDice: [1, 2],
    phase: 'moving',
    winner: null,
    mode: 'vs-human',
    openingRolls: { white: null, black: null },
    selectedPoint: null,
    legalMovesForSelected: [],
  };
}

function play(result: Hook, from: number, to: number) {
  const move = getLegalMoves(result.current.state!).find((m: Move) => m.from === from && m.to === to);
  expect(move).toBeDefined();
  act(() => {
    result.current.doMove(move!);
  });
  finishAnimation(result);
}

function roll(result: Hook, a: number, b: number) {
  mockDice(a, b);
  act(() => {
    result.current.doRollDice();
  });
}

afterEach(() => {
  jest.restoreAllMocks();
});

describe('undo animates the move being undone (blocked rolls in the log)', () => {
  function playThroughBlockedTurn() {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => {
      result.current.startFromPosition(blockedWhitePosition());
    });
    play(result, 1, 2);
    play(result, 1, 3);
    expect(result.current.state?.currentPlayer).toBe('white');
    roll(result, 3, 4);
    expect(result.current.state?.phase).toBe('no-move');
    act(() => {
      result.current.doPassTurn();
    });
    expect(result.current.state?.currentPlayer).toBe('black');
    return result;
  }

  it('slides back the last checker, not the move before the blocked roll', () => {
    const result = playThroughBlockedTurn();
    roll(result, 1, 2);
    play(result, 2, 3);
    play(result, 1, 3);

    expect(result.current.canUndo).toBe(true);
    act(() => {
      result.current.doUndo();
    });

    // Last move was 1 -> 3, so the reverse slide runs 3 -> 1.
    expect(result.current.moveAnimation).toMatchObject({ from: 3, to: 1, player: 'black' });
    finishAnimation(result);
    expect(result.current.state?.points[1].count).toBe(1);
    expect(result.current.state?.points[2].count).toBe(0);
    expect(result.current.state?.points[3].count).toBe(2);
    expect(result.current.state?.remainingDice).toEqual([2]);
    expect(result.current.state?.dice).toEqual([1, 2]);
  });

  it('undo right after a blocked roll steps back over it onto the real move', () => {
    const result = playThroughBlockedTurn();

    act(() => {
      result.current.doUndo();
    });
    finishAnimation(result);

    // Rewound to black's second checker move with its roll intact.
    expect(result.current.state?.currentPlayer).toBe('black');
    expect(result.current.state?.phase).toBe('moving');
    expect(result.current.state?.dice).toEqual([1, 2]);
    expect(result.current.state?.remainingDice).toEqual([2]);
    expect(result.current.state?.points[3].count).toBe(0);
    expect(result.current.moveLog.every(e => e.from !== -1)).toBe(true);
    expect(result.current.moveLog).toHaveLength(1);
  });

  it('redo replays the move and the blocked roll with the same dice', () => {
    const result = playThroughBlockedTurn();
    act(() => {
      result.current.doUndo();
    });
    finishAnimation(result);
    expect(result.current.canRedo).toBe(true);

    act(() => {
      result.current.doRedo();
    });
    finishAnimation(result);

    expect(result.current.state?.currentPlayer).toBe('black');
    expect(result.current.state?.phase).toBe('rolling');
    expect(result.current.moveLog).toHaveLength(3);
    expect(result.current.moveLog[2]).toMatchObject({ from: -1, to: -1, dice: [3, 4] });
  });
});

describe('undo/redo never changes the roll', () => {
  it('undo the previous turn after rolling, then redo, keeps the fresh roll', () => {
    const { result } = renderHook(() => useGameProviderValue(true));
    act(() => {
      result.current.startFromPosition(blockedWhitePosition());
    });
    play(result, 1, 2);
    play(result, 1, 3);
    roll(result, 3, 4);
    const rolled = result.current.state!;
    expect(rolled.phase).toBe('no-move');

    // Go back before the roll, then forward again.
    act(() => {
      result.current.doUndo();
    });
    finishAnimation(result);
    act(() => {
      result.current.doRedo();
    });
    finishAnimation(result);

    expect(result.current.state?.currentPlayer).toBe('white');
    expect(result.current.state?.dice).toEqual([3, 4]);
    expect(result.current.state?.phase).toBe(rolled.phase);
  });
});
