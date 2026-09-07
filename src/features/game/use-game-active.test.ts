import { act, renderHook } from '@testing-library/react-native';
import { usePathname } from 'expo-router';
import { AppState } from 'react-native';
import { useGameActive } from './use-game-active';

jest.mock('expo-router', () => ({ usePathname: jest.fn() }));

it('only enables foreground gameplay, and responds to app visibility changes', () => {
  const original = AppState.currentState;
  AppState.currentState = 'active';
  let onChange: () => void = () => {};
  const remove = jest.fn();
  const subscription = jest.spyOn(AppState, 'addEventListener').mockImplementation((_, listener) => {
    onChange = () => listener(AppState.currentState);
    return { remove };
  });
  jest.mocked(usePathname).mockReturnValue('/');
  const { result, rerender, unmount } = renderHook(() => useGameActive());
  expect(result.current).toBe(false);

  jest.mocked(usePathname).mockReturnValue('/game');
  rerender({});
  expect(result.current).toBe(true);
  act(() => {
    AppState.currentState = 'background';
    onChange();
  });
  expect(result.current).toBe(false);
  act(() => {
    AppState.currentState = 'active';
    onChange();
  });
  expect(result.current).toBe(true);
  jest.mocked(usePathname).mockReturnValue('/settings');
  rerender({});
  expect(result.current).toBe(false);
  unmount();
  expect(remove).toHaveBeenCalled();
  subscription.mockRestore();
  AppState.currentState = original;
});
