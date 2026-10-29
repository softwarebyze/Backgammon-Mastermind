import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { GameState } from '@/lib/game';
import { act, renderHook } from '@testing-library/react-native';
import { getCheckerAnchor } from '@/features/game/board-point-layout';
import { useBoardPlayInput } from '@/features/game/use-board-play-input';
import { createInitialState } from '@/lib/game';
import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';

const DIMS: BoardDimensions = {
  boardWidth: 400,
  boardHeight: 200,
  boardFrameWidth: 4,
  boardOuterWidth: 408,
  boardOuterHeight: 208,
  colWidth: 28,
  checkerSize: 24,
  pointHeight: 94,
  barWidth: 28,
  bearOffWidth: 38,
  middleHeight: 12,
};

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Warning: 'warning' },
}));

type Props = {
  state: GameState;
  isAnimating: boolean;
  isHumanTurn: boolean;
  interactionEnabled?: boolean;
};

function whiteMoving(): GameState {
  return {
    ...createInitialState('vs-computer'),
    phase: 'moving',
    currentPlayer: 'white',
    dice: [3, 5],
    remainingDice: [3, 5],
  };
}

/** One die is still in flight: `remainingDice` is what the settled state will hold. */
function midAnimation(remaining: number[]): GameState {
  return { ...whiteMoving(), remainingDice: remaining };
}

function setup(initial: Props) {
  const actions = { selectPoint: jest.fn(), doMove: jest.fn(), doMoveSequence: jest.fn() };
  const { result, rerender } = renderHook(
    (props: Props) => useBoardPlayInput({ ...props, actions }),
    { initialProps: initial },
  );
  return { result, rerender, actions };
}

describe('useBoardPlayInput drag across a turn change', () => {
  it('drops the drag when a forced move ends the turn mid-drag', () => {
    const state = whiteMoving();
    const { result, rerender, actions } = setup({ state, isAnimating: false, isHumanTurn: true });

    act(() => {
      result.current.handleDragAttempt(24);
      result.current.handleDragStart(24, 0, 0);
    });
    expect(result.current.dragFrom).toBe(24);

    // Auto-move plays the forced checker while the finger is still down; the computer now owns the board.
    const computerTurn: GameState = {
      ...state,
      phase: 'moving',
      currentPlayer: 'black',
      dice: [6, 2],
      remainingDice: [6, 2],
      selectedPoint: null,
    };
    rerender({ state: computerTurn, isAnimating: true, isHumanTurn: false });
    expect(result.current.dragFrom).toBeNull();

    rerender({ state: computerTurn, isAnimating: false, isHumanTurn: false });
    expect(result.current.dragFrom).toBeNull();

    // Next human turn: the stale gesture's late events must not resurrect or play the old drag.
    const nextTurn: GameState = { ...whiteMoving(), dice: [6, 1], remainingDice: [6, 1] };
    rerender({ state: nextTurn, isAnimating: false, isHumanTurn: true });
    expect(result.current.dragFrom).toBeNull();
    act(() => {
      result.current.handleDragEnd(0, 0);
    });
    expect(actions.doMove).not.toHaveBeenCalled();
    expect(actions.doMoveSequence).not.toHaveBeenCalled();
    expect(result.current.dragFrom).toBeNull();
  });

  it('does not revive the drag when the next turn rolls the same dice', () => {
    const state = whiteMoving();
    const { result, rerender, actions } = setup({ state, isAnimating: false, isHumanTurn: true });

    act(() => {
      result.current.handleDragStart(24, 10, 20);
    });
    expect(result.current.dragFrom).toBe(24);

    const computerTurn: GameState = {
      ...state,
      currentPlayer: 'black',
      dice: [6, 2],
      remainingDice: [6, 2],
      selectedPoint: null,
    };
    rerender({ state: computerTurn, isAnimating: false, isHumanTurn: false });
    expect(result.current.dragFrom).toBeNull();

    // Same phase, player, and dice as the drag started with. The key string matches;
    // the gesture must still be dead.
    const nextTurn: GameState = { ...whiteMoving(), dice: [3, 5], remainingDice: [3, 5] };
    rerender({ state: nextTurn, isAnimating: false, isHumanTurn: true });
    expect(result.current.dragFrom).toBeNull();
    actions.selectPoint.mockClear();
    act(() => {
      result.current.setBoardDimensions(DIMS);
      result.current.handleDragEnd(12, 40);
    });
    expect(actions.doMove).not.toHaveBeenCalled();
    expect(actions.doMoveSequence).not.toHaveBeenCalled();
    expect(actions.selectPoint).not.toHaveBeenCalled();
    expect(result.current.dragFrom).toBeNull();
  });

  it('keeps the drag while the same turn animates a previous checker', () => {
    const state = whiteMoving();
    const { result, rerender } = setup({ state, isAnimating: false, isHumanTurn: true });

    act(() => {
      result.current.handleDragStart(24, 0, 0);
    });
    rerender({ state: { ...state, remainingDice: [5] }, isAnimating: true, isHumanTurn: true });
    expect(result.current.dragFrom).toBe(24);
    rerender({ state: { ...state, remainingDice: [5] }, isAnimating: false, isHumanTurn: true });
    expect(result.current.dragFrom).toBe(24);
  });
});

describe('useBoardPlayInput rapid follow-up taps', () => {
  it('plays a different checker tapped while another move animates', () => {
    const state = midAnimation([5]);
    const { result, rerender, actions } = setup({ state, isAnimating: true, isHumanTurn: true });

    act(() => {
      result.current.handlePointPress(13);
    });
    expect(actions.doMove).not.toHaveBeenCalled();

    rerender({ state, isAnimating: false, isHumanTurn: true });
    expect(actions.doMove).toHaveBeenCalledTimes(1);
    expect(actions.doMove).toHaveBeenCalledWith(expect.objectContaining({ from: 13, to: 8, die: 5 }));
  });

  it('auto-plays a checker whose only destination is known once the move settles', () => {
    const state = midAnimation([3, 5]);
    const { result, rerender, actions } = setup({ state, isAnimating: true, isHumanTurn: true });

    act(() => {
      result.current.handlePointPress(6);
    });
    rerender({ state, isAnimating: false, isHumanTurn: true });

    expect(actions.doMove).toHaveBeenCalledWith(expect.objectContaining({ from: 6, to: 3 }));
  });

  it('clears the selection when the selected point is tapped during animation', () => {
    const state: GameState = { ...midAnimation([5]), selectedPoint: 8 };
    const { result, rerender, actions } = setup({ state, isAnimating: true, isHumanTurn: true });

    act(() => {
      result.current.handlePointPress(8);
    });
    rerender({ state, isAnimating: false, isHumanTurn: true });

    expect(actions.selectPoint).toHaveBeenCalledWith(null);
    expect(actions.doMove).not.toHaveBeenCalled();
  });

  it('drains queued taps in order across consecutive settles', () => {
    const state = midAnimation([3, 5]);
    const { result, rerender, actions } = setup({ state, isAnimating: true, isHumanTurn: true });

    act(() => {
      result.current.handlePointPress(6);
      result.current.handlePointPress(13);
    });
    rerender({ state, isAnimating: false, isHumanTurn: true });

    expect(actions.doMove).toHaveBeenCalledTimes(1);
    expect(actions.doMove).toHaveBeenLastCalledWith(expect.objectContaining({ from: 6, to: 3 }));

    rerender({ state: midAnimation([5]), isAnimating: true, isHumanTurn: true });
    rerender({ state: midAnimation([5]), isAnimating: false, isHumanTurn: true });

    expect(actions.doMove).toHaveBeenCalledTimes(2);
    expect(actions.doMove).toHaveBeenLastCalledWith(expect.objectContaining({ from: 13, to: 8 }));
  });

  it('drops queued taps when the turn ended before they replay', () => {
    const state = midAnimation([5]);
    const { result, rerender, actions } = setup({ state, isAnimating: true, isHumanTurn: true });

    act(() => {
      result.current.handlePointPress(13);
    });
    rerender({
      state: { ...createInitialState('vs-computer'), currentPlayer: 'black', phase: 'rolling' },
      isAnimating: false,
      isHumanTurn: false,
    });

    expect(actions.doMove).not.toHaveBeenCalled();
    expect(actions.selectPoint).not.toHaveBeenCalled();
  });

  it('lets a board press cancel queued taps during animation', () => {
    const state = midAnimation([5]);
    const { result, rerender, actions } = setup({ state, isAnimating: true, isHumanTurn: true });

    act(() => {
      result.current.handlePointPress(13);
      // The first board press belongs to the same native tap and is swallowed.
      result.current.handleBoardPress();
      // A deliberate tap on the board background cancels the queued input.
      result.current.handleBoardPress();
    });
    rerender({ state, isAnimating: false, isHumanTurn: true });

    expect(actions.doMove).not.toHaveBeenCalled();
  });
});

describe('useBoardPlayInput concurrent replay', () => {
  it('keeps replaying queued taps after a replayed tap commits a concurrent move', () => {
    // The first replayed tap commits at once (no blocking animation), so the
    // second must replay against that board without waiting for another settle.
    let board = midAnimation([3, 5]);
    const actions = {
      selectPoint: jest.fn(),
      doMove: jest.fn((move: { die: number }) => {
        board = midAnimation(board.remainingDice.filter((d, i, all) => i !== all.indexOf(move.die)));
      }),
      doMoveSequence: jest.fn(),
      getMoveState: () => board,
    };
    const { result, rerender } = renderHook(
      (props: Props) => useBoardPlayInput({ ...props, actions, concurrentMoves: true }),
      { initialProps: { state: board, isAnimating: true, isHumanTurn: true } },
    );

    act(() => {
      result.current.handlePointPress(6);
      result.current.handlePointPress(13);
    });
    rerender({ state: board, isAnimating: false, isHumanTurn: true });

    expect(actions.doMove).toHaveBeenCalledTimes(2);
    expect(actions.doMove).toHaveBeenNthCalledWith(1, expect.objectContaining({ from: 6, to: 3 }), { concurrent: true });
    expect(actions.doMove).toHaveBeenNthCalledWith(2, expect.objectContaining({ from: 13, to: 8 }), { concurrent: true });
  });
});

describe('useBoardPlayInput queued input gating', () => {
  it('ignores taps while a prompt owns the board', () => {
    const state = midAnimation([5]);
    const { result, rerender, actions } = setup({
      state,
      isAnimating: true,
      isHumanTurn: true,
      interactionEnabled: false,
    });

    act(() => {
      result.current.handlePointPress(13);
      result.current.handleBearOffPress();
      result.current.handleBarPress();
    });
    rerender({ state, isAnimating: false, isHumanTurn: true, interactionEnabled: false });

    expect(actions.doMove).not.toHaveBeenCalled();
    expect(actions.selectPoint).not.toHaveBeenCalled();
  });

  it('does not replay a queued tap when the settle opens a prompt', () => {
    const state = midAnimation([5]);
    const { result, rerender, actions } = setup({ state, isAnimating: true, isHumanTurn: true });

    act(() => {
      result.current.handlePointPress(13);
    });
    // The verdict lands in the same commit that ends the slide: the tap must
    // not play under the review/prompt.
    rerender({ state, isAnimating: false, isHumanTurn: true, interactionEnabled: false });
    expect(actions.doMove).not.toHaveBeenCalled();

    // Re-enabling later must not resurrect the dropped input.
    rerender({ state, isAnimating: false, isHumanTurn: true, interactionEnabled: true });
    expect(actions.doMove).not.toHaveBeenCalled();
    expect(actions.selectPoint).not.toHaveBeenCalled();
  });
});

describe('useBoardPlayInput queued destination and drag', () => {
  it('bears off from a selection queued during the previous move', () => {
    const base = whiteMoving();
    const state: GameState = {
      ...base,
      dice: [3, 4],
      remainingDice: [3, 4],
      selectedPoint: null,
      points: base.points.map((point, index) => (index === 4
        ? { player: 'white' as const, count: 1 }
        : { player: null, count: 0 })),
    };
    const { result, rerender, actions } = setup({ state, isAnimating: true, isHumanTurn: true });

    act(() => {
      result.current.handlePointPress(4);
      result.current.handleBearOffPress();
    });
    rerender({ state, isAnimating: false, isHumanTurn: true });

    // With one checker and 3+4, USBGF max-dice plays 4→1 then bears off 1.
    expect(actions.doMoveSequence).toHaveBeenCalledWith([
      expect.objectContaining({ from: 4, to: 1, die: 3 }),
      expect.objectContaining({ from: 1, to: BEAR_OFF, die: 4 }),
    ]);
  });

  it('re-enters from the bar when the bar is tapped during animation', () => {
    const state: GameState = { ...midAnimation([5]), bar: { white: 1, black: 0 } };
    const { result, rerender, actions } = setup({ state, isAnimating: true, isHumanTurn: true });

    act(() => {
      result.current.handleBarPress();
    });
    rerender({ state, isAnimating: false, isHumanTurn: true });

    expect(actions.doMove).toHaveBeenCalledWith(
      expect.objectContaining({ from: BAR_POINT, to: 20, die: 5 }),
    );
  });

  it('clears later queued taps when a queued drag no longer resolves', () => {
    const animating: GameState = midAnimation([3, 5]);
    const settled: GameState = midAnimation([5]);
    const { result, rerender, actions } = setup({
      state: animating,
      isAnimating: true,
      isHumanTurn: true,
    });

    act(() => {
      result.current.setBoardDimensions(DIMS);
      result.current.handleDragStart(24, 0, 0);
    });
    const dropOn21 = getCheckerAnchor({
      pointIndex: 21,
      dims: DIMS,
      stackCount: 1,
      player: 'white',
    });
    act(() => {
      // 24 → 21 is legal with the in-flight 3 but not with the remaining 5.
      result.current.handleDragEnd(dropOn21.x, dropOn21.y);
      result.current.handlePointPress(13);
    });

    rerender({ state: settled, isAnimating: false, isHumanTurn: true });
    expect(actions.doMove).not.toHaveBeenCalled();

    // A later, unrelated slide in the same turn must not resurface the tap
    // that was queued behind the dead drag.
    rerender({ state: settled, isAnimating: true, isHumanTurn: true });
    rerender({ state: settled, isAnimating: false, isHumanTurn: true });
    expect(actions.doMove).not.toHaveBeenCalled();
  });
});
