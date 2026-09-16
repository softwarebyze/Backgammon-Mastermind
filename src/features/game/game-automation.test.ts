import { act, renderHook } from '@testing-library/react-native';
import { useComputerOpponent } from '@/features/game/use-computer-opponent';
import { useGameplayHelpers } from '@/features/game/use-gameplay-helpers';
import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { createInitialState } from '@/lib/game/constants';

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({ useGamePreferences: jest.fn() }));
jest.mock('@/lib/game-sfx/play-game-sfx', () => ({ playGameSfx: jest.fn() }));

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(useGamePreferences).mockReturnValue({
    preferences: { ...DEFAULT_GAME_PREFERENCES, autoRoll: true },
  } as ReturnType<typeof useGamePreferences>);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

it('does not start the saved computer turn on home, and cancels a pending turn on leave', () => {
  const setState = jest.fn();
  const options = {
    state: { ...createInitialState('vs-computer'), currentPlayer: 'black' as const },
    setState,
    playMove: jest.fn(),
    isAnimating: false,
    moveCount: 2,
    hasRedo: false,
    recordNoMove: jest.fn(),
  };
  const { rerender } = renderHook(
    ({ enabled }: { enabled: boolean }) => useComputerOpponent({ ...options, enabled }),
    { initialProps: { enabled: false } },
  );
  act(() => jest.advanceTimersByTime(10000));
  expect(setState).not.toHaveBeenCalled();

  rerender({ enabled: true });
  rerender({ enabled: false });
  act(() => jest.advanceTimersByTime(10000));
  expect(setState).not.toHaveBeenCalled();

  rerender({ enabled: true });
  act(() => jest.advanceTimersByTime(2000));
  expect(setState).toHaveBeenCalledTimes(1);
});

it('pauses human auto-roll off the board and resumes on return', () => {
  const doRollDice = jest.fn();
  const options = {
    state: createInitialState('vs-human'),
    isAnimating: false,
    hasRedo: false,
    doRollDice,
    doMove: jest.fn(),
    doMoveSequence: jest.fn(),
    doPassTurn: jest.fn(),
  };
  const { rerender } = renderHook(
    ({ enabled }: { enabled: boolean }) => useGameplayHelpers({ ...options, enabled }),
    { initialProps: { enabled: false } },
  );
  act(() => jest.advanceTimersByTime(10000));
  expect(doRollDice).not.toHaveBeenCalled();
  rerender({ enabled: true });
  rerender({ enabled: false });
  act(() => jest.advanceTimersByTime(10000));
  expect(doRollDice).not.toHaveBeenCalled();
  rerender({ enabled: true });
  act(() => jest.advanceTimersByTime(1000));
  expect(doRollDice).toHaveBeenCalledTimes(1);
});
