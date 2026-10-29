import type { NativeStackHeaderProps } from 'expo-router';
import { Text } from 'react-native';

import { render, screen } from '@/lib/test-utils';

import { AlwaysOnEscapeHeader } from './always-on-escape-header';

jest.mock('./stack-escape-button', () => ({ StackEscapeButton: () => null }));
jest.mock('expo-router/react-navigation', () => {
  const { View } = require('react-native');
  return {
    getHeaderTitle: (options: { title?: string }) => options.title ?? '',
    Header: ({ headerRight }: { headerRight?: () => React.ReactNode }) => <View>{headerRight?.()}</View>,
  };
});

it('keeps screen actions on the web header (e.g. Settings → Feedback)', () => {
  const props = {
    options: { title: 'Settings', headerRight: () => <Text testID="screen-action">Action</Text> },
    route: { name: 'settings' },
  } as unknown as NativeStackHeaderProps;
  render(<AlwaysOnEscapeHeader {...props} />);
  expect(screen.getByTestId('screen-action')).toBeOnTheScreen();
});
