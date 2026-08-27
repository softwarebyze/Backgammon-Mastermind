import { Text } from 'react-native';

import { cleanup, screen, setup } from '@/lib/test-utils';

import { SettingToggleRow } from './setting-toggle-row';

jest.mock('@/lib/haptics', () => ({
  hapticSelection: jest.fn(),
}));

afterEach(cleanup);

describe('setting toggle row', () => {
  it('toggles when the row (icon/label) is pressed, not only the switch', async () => {
    const onChange = jest.fn();
    const { user } = setup(
      <SettingToggleRow
        icon={<Text>icon</Text>}
        label="Move hints"
        hint="Gold dot beside points you can move from"
        value={false}
        onChange={onChange}
        testID="setting-toggle-row"
      />,
    );

    await user.press(screen.getByTestId('setting-toggle-row'));
    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(true);

    await user.press(screen.getByText('Move hints'));
    expect(onChange).toHaveBeenCalledTimes(2);
  });
});
