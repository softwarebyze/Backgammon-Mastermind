import { router, useNavigation, useRoute } from 'expo-router';
import { StrictMode } from 'react';
import { Platform } from 'react-native';
import { GameContext } from '@/features/game/game-context';
import { useGameProviderValue } from '@/features/game/use-game-provider-value';
import { useLeaveGame } from '@/features/game/use-leave-game';
import { createPositionState } from '@/lib/game';
import { createMatch } from '@/lib/game/match';
import { clearActiveGame, loadPersistedSession } from '@/lib/game/persistence';
import { act, renderHook } from '@/lib/test-utils';

const mockGetState = jest.fn(() => ({ routes: [] as { key: string }[] }));

jest.mock('expo-router', () => ({
  router: { replace: jest.fn() },
  useNavigation: jest.fn(() => ({ getState: mockGetState })),
  useRoute: jest.fn(() => ({ key: 'game-route' })),
}));

const mockCapture = jest.fn();
jest.mock('posthog-react-native', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- public hook mock
  usePostHog: () => ({ capture: mockCapture }),
}));

beforeEach(() => {
  jest.useFakeTimers();
  clearActiveGame();
  mockGetState.mockReturnValue({ routes: [] });
  jest.mocked(useRoute).mockReturnValue({ key: 'game-route' } as ReturnType<typeof useRoute>);
  jest.mocked(useNavigation).mockReturnValue({ getState: mockGetState } as ReturnType<typeof useNavigation>);
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

it('saves the latest session on web removal without dispatching another navigation', async () => {
  const original = Platform.OS;
  Platform.OS = 'web';
  try {
    const { result: provider } = renderHook(() => useGameProviderValue(true));
    act(() => provider.current.startFromPosition(createPositionState({ useStandardSetup: true, mode: 'vs-human', match: createMatch(5) })));
    const { rerender, unmount } = renderHook(() => useLeaveGame(), {
      wrapper: ({ children }) => <StrictMode><GameContext value={provider.current}>{children}</GameContext></StrictMode>,
    });
    mockCapture.mockClear();
    await Promise.resolve();
    expect(mockCapture).not.toHaveBeenCalled();
    act(() => provider.current.matchAction!('offer'));
    rerender({});
    jest.mocked(router.replace).mockClear();
    clearActiveGame();
    mockCapture.mockClear();
    mockGetState.mockReturnValue({ routes: [] });
    await act(async () => unmount());
    expect(loadPersistedSession()?.state.match?.pendingOffer).toBe('white');
    expect(loadPersistedSession()?.cubeEvents).toEqual(provider.current.cubeEvents);
    expect(router.replace).not.toHaveBeenCalled();
    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture).toHaveBeenCalledWith('game_exited', expect.objectContaining({ mode: 'vs-human' }));
  }
  finally {
    Platform.OS = original;
  }
});

it('does not finish on web when the route is still present (language remount)', async () => {
  const original = Platform.OS;
  Platform.OS = 'web';
  try {
    const { result: provider } = renderHook(() => useGameProviderValue(true));
    act(() => provider.current.startFromPosition(createPositionState({ useStandardSetup: true, mode: 'vs-human', match: createMatch(5) })));
    const { unmount } = renderHook(() => useLeaveGame(), {
      wrapper: ({ children }) => <GameContext value={provider.current}>{children}</GameContext>,
    });
    mockCapture.mockClear();
    mockGetState.mockReturnValue({ routes: [{ key: 'game-route' }] });
    await act(async () => unmount());
    expect(mockCapture).not.toHaveBeenCalled();
  }
  finally {
    Platform.OS = original;
  }
});

it('does not finish on web when there is no session (missing-state redirect)', async () => {
  const original = Platform.OS;
  Platform.OS = 'web';
  try {
    const { result: provider } = renderHook(() => useGameProviderValue(true));
    expect(provider.current.state).toBeNull();
    const { unmount } = renderHook(() => useLeaveGame(), {
      wrapper: ({ children }) => <GameContext value={provider.current}>{children}</GameContext>,
    });
    mockCapture.mockClear();
    mockGetState.mockReturnValue({ routes: [] });
    await act(async () => unmount());
    expect(mockCapture).not.toHaveBeenCalled();
  }
  finally {
    Platform.OS = original;
  }
});
