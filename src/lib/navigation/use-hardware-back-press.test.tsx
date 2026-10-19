import { router, Stack } from 'expo-router';
import { act, renderRouter, screen } from 'expo-router/testing-library';
import { BackHandler, Text } from 'react-native';

import { useHardwareBackPress } from './use-hardware-back-press';

type BackListener = Parameters<typeof BackHandler.addEventListener>[1];

const listeners: BackListener[] = [];

/** Android semantics: newest listener first; stop at the first that returns true. The navigation container registers its own listener, which pops the stack. */
function pressHardwareBack(): boolean {
  for (const listener of [...listeners].reverse()) {
    if (listener({ type: 'hardwareBackPress', timeStamp: Date.now() })) {
      return true;
    }
  }
  return false;
}

beforeEach(() => {
  listeners.length = 0;
  jest.spyOn(BackHandler, 'addEventListener').mockImplementation((_event, listener) => {
    listeners.push(listener);
    return {
      remove: () => {
        const index = listeners.indexOf(listener);
        if (index !== -1) {
          listeners.splice(index, 1);
        }
      },
    };
  });
});

afterEach(() => {
  jest.restoreAllMocks();
});

describe('useHardwareBackPress', () => {
  it('only intercepts back while its screen is focused', async () => {
    const onBack = jest.fn(() => true);

    function Game() {
      useHardwareBackPress(onBack);
      return <Text>game screen</Text>;
    }

    renderRouter(
      {
        _layout: () => <Stack />,
        index: () => <Text>home screen</Text>,
        game: Game,
        settings: () => <Text>settings screen</Text>,
      },
      { initialUrl: '/' },
    );
    expect(await screen.findByText('home screen')).toBeTruthy();

    // Push after mount so the game's listener is registered after the
    // navigation container's, as it is in the real app.
    act(() => router.push('/game'));
    expect(await screen.findByText('game screen')).toBeTruthy();

    act(() => {
      pressHardwareBack();
    });
    expect(onBack).toHaveBeenCalledTimes(1);

    act(() => router.push('/settings'));
    expect(await screen.findByText('settings screen')).toBeTruthy();

    act(() => {
      pressHardwareBack();
    });
    expect(await screen.findByText('game screen')).toBeTruthy();
    expect(onBack).toHaveBeenCalledTimes(1);

    act(() => {
      pressHardwareBack();
    });
    expect(onBack).toHaveBeenCalledTimes(2);
  });
});
