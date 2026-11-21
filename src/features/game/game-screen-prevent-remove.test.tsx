import { router, Stack, usePreventRemove } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { useEffect, useState } from 'react';
import { Platform, Text } from 'react-native';
import { GameContext } from '@/features/game/game-context';
import { useGameProviderValue } from '@/features/game/use-game-provider-value';
import { useLeaveGame } from '@/features/game/use-leave-game';
import { createPositionState } from '@/lib/game';
import { createMatch } from '@/lib/game/match';
import { clearActiveGame } from '@/lib/game/persistence';

jest.mock('posthog-react-native', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- public hook mock
  usePostHog: () => ({ capture: jest.fn() }),
}));

/**
 * Mirrors GameScreen's usePreventRemove leave path (game-screen.tsx): back
 * actions call leaveGame and stay blocked; the follow-up REPLACE from
 * leaveGame goes through via repeat() once allowLeaveRef is set.
 */
function GameLeaveScreen() {
  const { leaveGame, allowLeaveRef } = useLeaveGame();
  const [preventLeave, setPreventLeave] = useState(Platform.OS !== 'web');
  usePreventRemove(preventLeave, ({ data, repeat }) => {
    const isBack = data.action.type === 'GO_BACK' || data.action.type === 'POP';
    if (allowLeaveRef.current || !isBack) {
      setPreventLeave(false);
      repeat();
      return;
    }
    leaveGame();
  });
  return <Text>game screen</Text>;
}

function HomeScreen() {
  return <Text>home screen</Text>;
}

const startGameRef: { current: (() => void) | null } = { current: null };

function ProviderLayout({ children }: { children: React.ReactNode }) {
  const value = useGameProviderValue(true);
  useEffect(() => {
    startGameRef.current = () => {
      value.startFromPosition(createPositionState({
        useStandardSetup: true,
        mode: 'vs-human',
        match: createMatch(5),
      }));
    };
    return () => {
      startGameRef.current = null;
    };
  }, [value]);
  return <GameContext value={value}>{children}</GameContext>;
}

beforeEach(() => {
  clearActiveGame();
  startGameRef.current = null;
});

it('routes GO_BACK through leaveGame and lets the follow-up REPLACE remove the screen', async () => {
  const original = Platform.OS;
  Platform.OS = 'ios';
  try {
    const view = await renderRouter(
      {
        _layout: () => (
          <ProviderLayout>
            <Stack />
          </ProviderLayout>
        ),
        index: HomeScreen,
        game: GameLeaveScreen,
      },
      { initialUrl: '/' },
    );
    expect(await screen.findByText('home screen')).toBeTruthy();

    act(() => startGameRef.current?.());
    act(() => router.push('/game'));
    expect(await screen.findByText('game screen')).toBeTruthy();
    expect(view.getPathname()).toBe('/game');

    const replaceSpy = jest.spyOn(router, 'replace');
    act(() => {
      router.back();
    });

    expect(replaceSpy).toHaveBeenCalledTimes(1);
    expect(replaceSpy).toHaveBeenCalledWith('/');
    expect(await screen.findByText('home screen')).toBeTruthy();
    expect(screen.queryByText('game screen')).toBeNull();
    expect(view.getPathname()).toBe('/');
    replaceSpy.mockRestore();
  }
  finally {
    Platform.OS = original;
  }
});
