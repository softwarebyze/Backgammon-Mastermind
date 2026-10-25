import type { GameState } from '@/lib/game';
import { act, renderHook } from '@testing-library/react-native';
import { useMemo, useState } from 'react';
import { useAnimatedMoves } from '@/features/game/use-animated-moves';
import { useBoardPlayInput } from '@/features/game/use-board-play-input';
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

function useLiveBoard() {
  const [state, setState] = useState<GameState | null>(() => {
    const initial: GameState = {
      ...createInitialState('vs-human'),
      currentPlayer: 'white',
      phase: 'moving',
      dice: [3, 1],
      remainingDice: [3, 1],
      selectedPoint: 8,
    };
    return { ...initial, legalMovesForSelected: getLegalMoves(initial).filter(m => m.from === 8) };
  });
  const animation = useAnimatedMoves(state, setState);
  const selectPoint = useGameSelectPoint(setState, animation.isAnimating);
  const actions = useMemo(() => ({
    selectPoint,
    doMove: animation.doMove,
    doMoveSequence: animation.doMoveSequence,
  }), [selectPoint, animation.doMove, animation.doMoveSequence]);
  const input = useBoardPlayInput({ state, actions, isAnimating: animation.isAnimating, isHumanTurn: true });
  return { state, animation, input };
}

it('preserves the next tap before React renders the first animation', () => {
  const { result } = renderHook(useLiveBoard);
  act(() => {
    result.current.input.handlePointPress(5);
    // A second pointer event can arrive before the animation prop rerenders.
    result.current.input.handlePointPress(6);
  });
  expect(result.current.animation.isAnimating).toBe(true);
  act(() => result.current.animation.moveAnimation?.onFinish());
  // The queued 6→5 must now be animating, not silently replaced by the first commit.
  expect(result.current.animation.moveAnimation).toMatchObject({ from: 6, to: 5 });
  act(() => result.current.animation.moveAnimation?.onFinish());
  expect(result.current.state?.points[6].count).toBe(4);
  expect(result.current.state?.points[5].count).toBe(2);
  expect(result.current.state?.remainingDice).toEqual([]);
});
