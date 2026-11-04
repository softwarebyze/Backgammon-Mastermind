import { GameContext } from '@/features/game/game-context';
import { useGameProviderValue } from '@/features/game/use-game-provider-value';
import { useLeaveGame } from '@/features/game/use-leave-game';
import { createPositionState } from '@/lib/game';
import { createMatch } from '@/lib/game/match';
import { clearActiveGame, loadPersistedSession } from '@/lib/game/persistence';
import { act, renderHook } from '@/lib/test-utils';

jest.mock('expo-router', () => ({ router: { replace: jest.fn() } }));

jest.mock('posthog-react-native', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- public hook mock
  usePostHog: () => ({ capture: jest.fn() }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  clearActiveGame();
});
afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

it.each(['leaveGame', 'handleBackPress'] as const)('retains cube history through %s and a cold restore', (action) => {
  const { result: provider, unmount: unmountProvider } = renderHook(() => useGameProviderValue(true));
  act(() => provider.current.startFromPosition(createPositionState({ useStandardSetup: true, mode: 'vs-human', match: createMatch(5) })));
  act(() => provider.current.matchAction!('offer'));
  act(() => provider.current.matchAction!('accept'));
  const events = provider.current.cubeEvents;
  const { result: leave, unmount: unmountLeave } = renderHook(() => useLeaveGame(), {
    wrapper: ({ children }) => <GameContext value={provider.current}>{children}</GameContext>,
  });
  act(() => leave.current[action]());
  expect(loadPersistedSession()?.cubeEvents).toEqual(events);
  unmountLeave();
  unmountProvider();
  const { result: restored } = renderHook(() => useGameProviderValue(true));
  expect(restored.current.cubeEvents).toHaveLength(2);
  expect(restored.current.state?.match?.cube).toEqual({ value: 2, owner: 'black' });
});
