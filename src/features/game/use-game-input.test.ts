import type { GameState } from '@/lib/game';
import { renderHook } from '@testing-library/react-native';
import { useGameInput } from '@/features/game/use-game-input';
import { createInitialState } from '@/lib/game';
import { BAR_POINT } from '@/lib/game/constants';

jest.mock('posthog-react-native', () => ({ usePostHog: () => ({ capture: jest.fn() }) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
}));

const mockGame = { active: false, selectPoint: jest.fn(), state: null as GameState | null };
jest.mock('@/features/game/use-game', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock preserves public hook name
  useGame: () => ({
    ...mockGame,
    doRollDice: jest.fn(),
    doPassTurn: jest.fn(),
    doMove: jest.fn(),
    doMoveSequence: jest.fn(),
    resetGame: jest.fn(),
    isAnimating: false,
    moveAnimation: null,
  }),
}));

function onBar(): GameState {
  const state = createInitialState('vs-human');
  return {
    ...state,
    phase: 'moving',
    currentPlayer: 'white',
    dice: [3, 1],
    remainingDice: [3, 1],
    points: state.points.map((p, i) => (i === 24 ? { ...p, count: 1 } : p)),
    bar: { white: 1, black: 0 },
  };
}

it('preselects the bar once the game route becomes active, not before', () => {
  mockGame.state = onBar();
  mockGame.active = false;
  const { rerender } = renderHook(() => useGameInput());
  // The provider would drop this selection while inactive.
  expect(mockGame.selectPoint).not.toHaveBeenCalled();
  mockGame.active = true;
  rerender({});
  expect(mockGame.selectPoint).toHaveBeenCalledWith(BAR_POINT);
});
