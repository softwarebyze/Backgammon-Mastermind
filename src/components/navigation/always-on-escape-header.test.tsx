import type { NativeStackHeaderProps } from 'expo-router';
import { Platform, Text } from 'react-native';

import { render, screen } from '@/lib/test-utils';

import { AlwaysOnEscapeHeader } from './always-on-escape-header';

jest.mock('./stack-escape-button', () => ({ StackEscapeButton: () => null }));
jest.mock('expo-router/react-navigation', () => {
  const { View, Text: RNText } = require('react-native');
  return {
    getHeaderTitle: (options: { title?: string }) => options.title ?? '',
    Header: ({
      headerRight,
      headerTransparent,
    }: {
      headerRight?: () => React.ReactNode;
      headerTransparent?: boolean;
    }) => (
      <View>
        <RNText testID="header-transparent">{String(headerTransparent)}</RNText>
        {headerRight?.()}
      </View>
    ),
  };
});

it('keeps screen actions on the web header (e.g. Settings → Feedback)', () => {
  const props = {
    options: { title: 'Settings', headerRight: () => <Text testID="screen-action">Action</Text> },
    route: { name: 'settings' },
    navigation: { isFocused: () => true },
  } as unknown as NativeStackHeaderProps;
  render(<AlwaysOnEscapeHeader {...props} />);
  expect(screen.getByTestId('screen-action')).toBeOnTheScreen();
});

it('resolves per-platform headerTransparent objects for the JS Header', () => {
  const original = Platform.OS;
  Platform.OS = 'ios';
  try {
    const props = {
      options: { title: 'Game', headerTransparent: { ios: true, android: false } },
      route: { name: 'game' },
      navigation: { isFocused: () => true },
    } as unknown as NativeStackHeaderProps;
    render(<AlwaysOnEscapeHeader {...props} />);
    expect(screen.getByTestId('header-transparent')).toHaveTextContent('true');
  }
  finally {
    Platform.OS = original;
  }
});
