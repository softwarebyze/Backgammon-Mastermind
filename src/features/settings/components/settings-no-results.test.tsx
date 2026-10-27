import { cleanup, screen, setup } from '@/lib/test-utils';

import { SettingsNoResults } from './settings-no-results';

jest.mock('@expo/vector-icons/Feather', () => {
  const React = require('react');
  const { Text } = require('react-native');
  function FeatherMock(props: { name: string }) {
    return React.createElement(Text, null, props.name);
  }
  return { __esModule: true, default: FeatherMock };
});

afterEach(cleanup);

describe('settings no results', () => {
  it('shows the query, announces itself, and clears the search', async () => {
    const onClear = jest.fn();
    const { user } = setup(<SettingsNoResults query="zzzz" onClear={onClear} />);

    const alert = screen.getByTestId('settings-no-results');
    expect(alert.props.accessibilityRole).toBe('alert');
    expect(alert.props.accessibilityLiveRegion).toBe('polite');
    expect(screen.getByText('No settings found')).toBeTruthy();
    expect(screen.getByText('No settings match “zzzz”.')).toBeTruthy();

    await user.press(screen.getByTestId('settings-no-results-clear'));
    expect(onClear).toHaveBeenCalledTimes(1);
  });
});
