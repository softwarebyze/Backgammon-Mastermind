import type { GameState } from '@/lib/game';
import { act, renderHook } from '@testing-library/react-native';
import { useBoardPlayInput } from '@/features/game/use-board-play-input';
import { createInitialState } from '@/lib/game';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light', Medium: 'medium' },
  NotificationFeedbackType: { Warning: 'warning' },
}));

type Props = { state: GameState; isAnimating: boolean; isHumanTurn: boolean };

function whiteMoving(): GameState {
  return {
    ...createInitialState('vs-computer'),
    phase: 'moving',
    currentPlayer: 'white',
    dice: [3, 5],
    remainingDice: [3, 5],
  };
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
