import { router } from 'expo-router';
import { Platform } from 'react-native';

import { cleanup, screen, setup } from '@/lib/test-utils';

import { StackEscapeButton } from './stack-escape-button';

jest.mock('expo-router', () => ({
  router: {
    canGoBack: jest.fn(),
    back: jest.fn(),
    replace: jest.fn(),
  },
}));

jest.mock('expo-router/react-navigation', () => {
  const React = require('react');
  const { Pressable: RNPressable } = require('react-native');
  function HeaderButtonMock({
    children,
    onPress,
    accessibilityLabel,
    testID,
  }: {
    children: React.ReactNode;
    onPress?: () => void;
    accessibilityLabel?: string;
    testID?: string;
  }) {
    return React.createElement(
      RNPressable,
      { onPress, accessibilityLabel, testID },
      children,
    );
  }
  return { HeaderButton: HeaderButtonMock };
});

jest.mock('@/lib/haptics', () => ({
  hapticLight: jest.fn(),
}));

jest.mock('@expo/vector-icons/Feather', () => {
  const React = require('react');
  const { Text } = require('react-native');
  function FeatherMock(props: { name: string }) {
    return React.createElement(Text, null, props.name);
  }
  return { __esModule: true, default: FeatherMock };
});

const mockedRouter = router as jest.Mocked<typeof router>;

afterEach(cleanup);

describe('stack escape button', () => {
  beforeEach(() => {
    mockedRouter.canGoBack.mockReset();
    mockedRouter.back.mockReset();
    mockedRouter.replace.mockReset();
  });

  it('replaces to home when the stack is empty', async () => {
    mockedRouter.canGoBack.mockReturnValue(false);
    const { user } = setup(<StackEscapeButton />);
    await user.press(screen.getByTestId('stack-escape-button'));
    expect(mockedRouter.replace).toHaveBeenCalledWith('/');
    expect(mockedRouter.back).not.toHaveBeenCalled();
  });

  it('shows a text label on native instead of a chevron glyph', () => {
    mockedRouter.canGoBack.mockReturnValue(true);
    Object.defineProperty(Platform, 'OS', { configurable: true, value: 'ios' });
    setup(<StackEscapeButton />);
    expect(screen.getByTestId('stack-escape-label')).toBeTruthy();
    expect(screen.queryByTestId('stack-escape-chevron')).toBeNull();
  });
});
