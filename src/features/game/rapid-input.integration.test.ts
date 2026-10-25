import type { GameState } from '@/lib/game';
import { act, renderHook } from '@testing-library/react-native';
import { useMemo, useState } from 'react';
import { useAnimatedMoves } from '@/features/game/use-animated-moves';
import { useBoardPlayInput } from '@/features/game/use-board-play-input';
import { useDiceOrder } from '@/features/game/use-dice-order';
import { useGameSelectPoint } from '@/features/game/use-game-select-point';
import { createInitialState, getLegalMoves } from '@/lib/game';

jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning' },
}));
jest.mock('@/lib/game-preferences/confirm-move', () => ({ shouldDeferTurnEnd: () => true }));

function useLiveBoard(dice: [number, number] = [3, 1], moveInDiceOrder = false) {
  const [state, setState] = useState<GameState | null>(() => {
    const initial: GameState = {
      ...createInitialState('vs-human'),
      currentPlayer: 'white',
      phase: 'moving',
      dice,
      remainingDice: dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [...dice],
      selectedPoint: 8,
    };
    return { ...initial, legalMovesForSelected: getLegalMoves(initial).filter(m => m.from === 8) };
  });
  const animation = useAnimatedMoves(state, setState);
  const selectPoint = useGameSelectPoint(setState, animation.isAnimating && !animation.moveAnimation?.committed);
  const actions = useMemo(() => ({
    selectPoint,
    doMove: animation.doMove,
    doMoveSequence: animation.doMoveSequence,
    getMoveState: animation.getMoveState,
  }), [selectPoint, animation.doMove, animation.doMoveSequence, animation.getMoveState]);
  const order = useDiceOrder(state);
  const input = useBoardPlayInput({ moveInDiceOrder, diceOrderReversed: order.reversedRef, state, actions, isAnimating: animation.isAnimating && !animation.moveAnimation?.committed, concurrentMoves: true, isHumanTurn: true });
  return { state, animation, input, order };
}

it('starts both checker flights before either lands, including pre-render taps', () => {
  const { result } = renderHook(() => useLiveBoard());
  act(() => {
    result.current.input.handlePointPress(5);
    result.current.input.handlePointPress(6);
  });
  const flights = result.current.animation.moveAnimation!.parallel!;
  expect(flights).toHaveLength(2);
  expect(flights).toMatchObject([{ from: 8, to: 5 }, { from: 6, to: 5 }]);
  expect(result.current.state?.remainingDice).toEqual([]);
  // Landing in reverse order cannot overwrite newer moves or restore spent dice.
  act(() => flights[1]!.onFinish());
  expect(result.current.animation.moveAnimation?.parallel).toHaveLength(2);
  act(() => flights[0]!.onFinish());
  expect(result.current.animation.isAnimating).toBe(false);
  expect(result.current.state?.points[6].count).toBe(4);
  expect(result.current.state?.points[5].count).toBe(2);
  expect(result.current.state?.remainingDice).toEqual([]);
});

it('highlights a newly selected checker while an earlier checker is moving', () => {
  const { result } = renderHook(() => useLiveBoard([2, 2]));
  act(() => result.current.input.handlePointPress(6)); // 8→6
  act(() => result.current.input.handlePointPress(13));
  expect(result.current.state?.selectedPoint).toBe(13);
  expect(result.current.animation.isAnimating).toBe(true);
  expect(result.current.state?.legalMovesForSelected.length).toBeGreaterThan(0);
});

it('keeps separate identities for repeated moves from the same stack', () => {
  const { result } = renderHook(() => useLiveBoard([2, 2]));
  act(() => {
    result.current.input.handlePointPress(6); // 8→6
    result.current.input.handlePointPress(8);
    result.current.input.handlePointPress(6); // 8→6 again
  });
  const flights = result.current.animation.moveAnimation!.parallel!;
  expect(flights).toHaveLength(2);
  expect(new Set(flights.map(frame => frame.id)).size).toBe(2);
  expect(result.current.state?.points[8].count).toBe(1);
  expect(result.current.state?.remainingDice).toHaveLength(2);
  act(() => result.current.animation.resetAnimation());
  act(() => flights.forEach(frame => frame.onFinish()));
  expect(result.current.animation.isAnimating).toBe(false);
  expect(result.current.state?.remainingDice).toHaveLength(2);
});

it('dice order spends both dice in overlapping flights before React renders', () => {
  const { result } = renderHook(() => useLiveBoard([3, 1], true));
  act(() => {
    result.current.input.handlePointPress(8);
    result.current.input.handlePointPress(6);
  });
  const flights = result.current.animation.moveAnimation!.parallel!;
  expect(flights).toMatchObject([{ from: 8, to: 5 }, { from: 6, to: 5 }]);
  expect(result.current.state?.remainingDice).toEqual([]);
  act(() => flights[1]!.onFinish());
  act(() => flights[0]!.onFinish());
  expect(result.current.state?.points[5].count).toBe(2);
  expect(result.current.state?.remainingDice).toEqual([]);
});

it('swap then rapid taps consumes the swapped die first without a render between events', () => {
  const { result } = renderHook(() => useLiveBoard([3, 1], true));
  act(() => {
    result.current.order.swapDice();
    result.current.input.handlePointPress(8);
    result.current.input.handlePointPress(13);
  });
  expect(result.current.animation.moveAnimation!.parallel!).toMatchObject([{ from: 8, to: 7 }, { from: 13, to: 10 }]);
  expect(result.current.state?.remainingDice).toEqual([]);
});
