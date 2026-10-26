import { act, renderHook } from '@testing-library/react-native';
import { createInitialState } from '@/lib/game';
import { useDiceOrder } from './use-dice-order';

const initial = { ...createInitialState('vs-human'), phase: 'moving' as const, dice: [3, 1] as [number, number], remainingDice: [3, 1] };

it('publishes swap synchronously for a tap before React renders', () => {
  const { result } = renderHook(() => useDiceOrder(initial));
  act(() => {
    result.current.swapDice();
    expect(result.current.reversedRef.current).toBe(true);
  });
  expect(result.current.displayedDice).toEqual([1, 3]);
});

it('retains order through moves, confirm hold, undo and redo within a roll', () => {
  const { result, rerender } = renderHook(useDiceOrder, { initialProps: initial });
  act(() => result.current.swapDice());
  for (const remainingDice of [[3], [], [3], [3, 1], [3], []]) {
    rerender({ ...initial, remainingDice });
    expect(result.current.displayedDice).toEqual([1, 3]);
  }
});

it('resets after confirm/turn changes even when a later roll repeats the original key', () => {
  const { result, rerender } = renderHook(useDiceOrder, { initialProps: initial });
  act(() => result.current.swapDice());
  rerender({ ...initial, currentPlayer: 'black' });
  rerender(initial);
  expect(result.current.displayedDice).toEqual([3, 1]);
});

it('resets when a game is reset through opening roll', () => {
  const { result, rerender } = renderHook(useDiceOrder, { initialProps: initial });
  act(() => result.current.swapDice());
  rerender(createInitialState('vs-human') as typeof initial);
  rerender(initial);
  expect(result.current.reversedRef.current).toBe(false);
});
