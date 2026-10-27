import * as React from 'react';
import { Keyboard } from 'react-native';

import { cleanup, fireEvent, screen, setup } from '@/lib/test-utils';

import { SettingsSearchField } from './settings-search-field';

jest.mock('@expo/vector-icons/Feather', () => {
  const React = require('react');
  const { Text } = require('react-native');
  function FeatherMock(props: { name: string }) {
    return React.createElement(Text, null, props.name);
  }
  return { __esModule: true, default: FeatherMock };
});

afterEach(cleanup);

function ControlledField({ onClear }: { onClear: () => void }) {
  const [value, setValue] = React.useState('');
  return (
    <SettingsSearchField
      value={value}
      onChangeText={setValue}
      onClear={() => {
        setValue('');
        onClear();
      }}
    />
  );
}

describe('settings search field', () => {
  it('labels the input and shows search-specific accessibility hints', () => {
    setup(<ControlledField onClear={jest.fn()} />);

    const input = screen.getByTestId('settings-search-input');
    expect(input.props.placeholder).toBe('Search settings');
    expect(input.props.accessibilityLabel).toBe('Search settings');
    expect(input.props.accessibilityHint).toBe(
      'Filters settings by name, description, or section.',
    );
    expect(screen.queryByTestId('settings-search-clear')).toBeNull();
  });

  it('clears the query with the clear button', async () => {
    const onClear = jest.fn();
    const { user } = setup(<ControlledField onClear={onClear} />);

    fireEvent.changeText(screen.getByTestId('settings-search-input'), 'sound');
    expect(screen.getByTestId('settings-search-input').props.value).toBe('sound');

    await user.press(screen.getByTestId('settings-search-clear'));

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('settings-search-input').props.value).toBe('');
  });

  it('dismisses the keyboard on submission', () => {
    const dismiss = jest.spyOn(Keyboard, 'dismiss').mockImplementation(() => {});
    setup(<ControlledField onClear={jest.fn()} />);
    fireEvent(screen.getByTestId('settings-search-input'), 'submitEditing');
    expect(dismiss).toHaveBeenCalledTimes(1);
    dismiss.mockRestore();
  });

  it('clears the query with Escape for hardware keyboards on web', () => {
    const onClear = jest.fn();
    setup(<ControlledField onClear={onClear} />);

    const input = screen.getByTestId('settings-search-input');
    fireEvent.changeText(input, 'sound');
    fireEvent(input, 'keyPress', { nativeEvent: { key: 'Escape' } });

    expect(onClear).toHaveBeenCalledTimes(1);
    expect(screen.getByTestId('settings-search-input').props.value).toBe('');
  });
});
