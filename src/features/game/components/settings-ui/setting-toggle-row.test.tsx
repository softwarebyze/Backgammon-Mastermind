import { Feather } from '@expo/vector-icons';
import * as React from 'react';
import { Switch, Text } from 'react-native';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { cleanup, screen, setup } from '@/lib/test-utils';

import { FastComputerIcon } from './fast-computer-icon';
import { SettingToggleRow } from './setting-toggle-row';
import { SoundIcon } from './sound-icon';

jest.mock('@/lib/haptics', () => ({
  hapticSelection: jest.fn(),
}));

jest.mock('@expo/vector-icons', () => {
  const React = require('react');
  const { Text: RNText } = require('react-native');
  function FeatherMock(props: { name: string; color: string }) {
    return React.createElement(RNText, null, `${props.name}:${props.color}`);
  }
  return { Feather: FeatherMock };
});

afterEach(cleanup);

function ControlledRow({
  label,
  icon,
  initial = false,
  onChange,
}: {
  label: string;
  icon?: React.ReactNode;
  initial?: boolean;
  onChange: jest.Mock;
}) {
  const [value, setValue] = React.useState(initial);
  return (
    <SettingToggleRow
      icon={icon ?? <Text>icon</Text>}
      label={label}
      value={value}
      onChange={(next) => {
        onChange(next);
        setValue(next);
      }}
    />
  );
}

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

  it('flips exactly once when the label is pressed', async () => {
    const onChange = jest.fn();
    const { user } = setup(
      <ControlledRow label="Game sounds" initial={true} onChange={onChange} />,
    );

    await user.press(screen.getByText('Game sounds'));

    expect(onChange).toHaveBeenCalledTimes(1);
    expect(onChange).toHaveBeenCalledWith(false);
    expect(
      screen.getByRole('switch', { name: 'Game sounds' }).props.accessibilityState.checked,
    ).toBe(false);
  });

  it('does not mount a native Switch that could double-fire on web', () => {
    setup(
      <SettingToggleRow
        icon={<Text>icon</Text>}
        label="Move hints"
        value={true}
        onChange={jest.fn()}
      />,
    );

    expect(screen.UNSAFE_queryAllByType(Switch)).toHaveLength(0);
    expect(screen.getAllByRole('switch')).toHaveLength(1);
  });
});

describe('sound icon', () => {
  it('uses volume-2 and accent when on', () => {
    const { UNSAFE_getByType } = setup(
      <SettingToggleRow
        icon={<SoundIcon size={32} active />}
        label="Game sounds"
        value={true}
        onChange={jest.fn()}
      />,
    );

    expect(UNSAFE_getByType(Feather).props).toEqual(expect.objectContaining({
      name: 'volume-2',
      color: GAME_PALETTE.accent,
    }));
  });

  it('uses volume-x and muted when off', () => {
    const { UNSAFE_getByType } = setup(
      <SettingToggleRow
        icon={<SoundIcon size={32} active={false} />}
        label="Game sounds"
        value={false}
        onChange={jest.fn()}
      />,
    );

    expect(UNSAFE_getByType(Feather).props).toEqual(expect.objectContaining({
      name: 'volume-x',
      color: GAME_PALETTE.textMuted,
    }));
  });
});

describe('fast computer icon', () => {
  it('uses accent when on and muted when off', () => {
    const on = setup(
      <SettingToggleRow
        icon={<FastComputerIcon size={32} active />}
        label="Fast computer"
        value={true}
        onChange={jest.fn()}
      />,
    );
    expect(on.UNSAFE_getByType(Feather).props).toEqual(expect.objectContaining({
      name: 'fast-forward',
      color: GAME_PALETTE.accent,
    }));
    on.unmount();

    const off = setup(
      <SettingToggleRow
        icon={<FastComputerIcon size={32} active={false} />}
        label="Fast computer"
        value={false}
        onChange={jest.fn()}
      />,
    );
    expect(off.UNSAFE_getByType(Feather).props).toEqual(expect.objectContaining({
      name: 'fast-forward',
      color: GAME_PALETTE.textMuted,
    }));
  });
});
