import { StyleSheet } from 'react-native';
import { createInitialState } from '@/lib/game/constants';
import { cleanup, fireEvent, render, renderHook, screen } from '@/lib/test-utils';
import { useGameScreenHeader } from './use-game-screen-header';

jest.mock('@expo/vector-icons/Feather', () => 'Feather');
jest.mock('@expo/vector-icons', () => ({ Feather: 'Feather' }));
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));
afterEach(cleanup);

it('replaces the full-width header with all five accessible 44px game controls', () => {
  const setOptions = jest.fn();
  const actions = { doUndo: jest.fn(), doRedo: jest.fn(), openOptions: jest.fn(), handleReset: jest.fn(), confirmLeaveGame: jest.fn() };
  const { result } = renderHook(() => useGameScreenHeader({ navigation: { setOptions }, state: createInitialState('vs-human'), canUndo: true, canRedo: true, ...actions }));
  expect(setOptions).toHaveBeenCalledWith({ headerShown: false });
  render(result.current!);
  for (const [id, callback] of [
    ['leave-game-button', actions.confirmLeaveGame],
    ['header-undo-button', actions.doUndo],
    ['header-redo-button', actions.doRedo],
    ['game-settings-button', actions.openOptions],
    ['reset-game-button', actions.handleReset],
  ] as const) {
    const control = screen.getByTestId(id);
    expect(control.props.accessibilityLabel).toBeTruthy();
    const style = StyleSheet.flatten(control.props.style);
    expect(style.minHeight).toBeGreaterThanOrEqual(44);
    expect(style.minWidth).toBeGreaterThanOrEqual(44);
    fireEvent.press(control);
    expect(callback).toHaveBeenCalledTimes(1);
  }
});
