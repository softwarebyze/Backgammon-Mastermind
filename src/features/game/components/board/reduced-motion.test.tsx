import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import { act, render, screen } from '@testing-library/react-native';
import { useReducedMotion, withTiming } from 'react-native-reanimated';
import { buildMoveAnimationFrame } from '@/features/game/move-animation';
import { createPositionState } from '@/lib/game/create-position';
import { DiceDisplay } from './dice-display';
import { MoveAnimationOverlay } from './move-animation-overlay';

const dimensions: BoardDimensions = {
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

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(useReducedMotion).mockReturnValue(true);
  jest.mocked(withTiming).mockClear();
});

afterEach(() => {
  jest.useRealTimers();
  jest.mocked(useReducedMotion).mockReturnValue(false);
});

it('shows rolled dice immediately without scheduling a scale pulse', () => {
  const { rerender } = render(
    <DiceDisplay dice={[3, 1]} remainingDice={[3, 1]} playerColor="white" displayStyle="numbers" />,
  );
  expect(screen.getByText('3')).toBeTruthy();
  expect(screen.getByText('1')).toBeTruthy();
  rerender(<DiceDisplay dice={[6, 2]} remainingDice={[6, 2]} playerColor="white" displayStyle="numbers" />);
  expect(screen.getByText('6')).toBeTruthy();
  expect(withTiming).not.toHaveBeenCalled();
});

it.each([false, true])('commits a checker move once without travel, including capture=%s', (capture) => {
  const state = createPositionState({
    placements: [
      { point: 8, player: 'white', count: 15 },
      ...(capture ? [{ point: 5, player: 'black' as const, count: 1 }] : []),
    ],
    dice: [3, 1],
  });
  const onFinish = jest.fn();
  const animation = buildMoveAnimationFrame(state, { from: 8, to: 5, dieIndex: 0 }, { onFinish });
  render(<MoveAnimationOverlay animation={animation} dimensions={dimensions} />);
  expect(onFinish).toHaveBeenCalledTimes(1);
  expect(withTiming).not.toHaveBeenCalled();
  act(() => jest.runAllTimers());
  expect(onFinish).toHaveBeenCalledTimes(1);
});

it('retains the normal dice pulse when reduced motion is disabled', () => {
  jest.mocked(useReducedMotion).mockReturnValue(false);
  render(<DiceDisplay dice={[3, 1]} remainingDice={[3, 1]} playerColor="white" />);
  expect(withTiming).toHaveBeenCalledTimes(2);
});
