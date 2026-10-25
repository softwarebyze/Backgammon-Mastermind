import { act, renderHook } from '@testing-library/react-native';
import { getItem, removeItem, setItem } from '@/lib/storage';
import { loadGamePreferences } from './storage';
import { DEFAULT_GAME_PREFERENCES } from './types';
import { useGamePreferences } from './use-game-preferences';

jest.unmock('./storage');

afterEach(() => {
  removeItem('GAME_PREFERENCES');
});

it('defaults off for fresh installs and older saved preferences', () => {
  removeItem('GAME_PREFERENCES');
  expect(loadGamePreferences().moveInDiceOrder).toBe(false);
  setItem('GAME_PREFERENCES', { confirmMove: true });
  expect(loadGamePreferences().moveInDiceOrder).toBe(false);
});

it.each([true, false])('persists and reloads an explicit dice-order preference: %s', (enabled) => {
  const { result } = renderHook(useGamePreferences);
  act(() => result.current.setMoveInDiceOrder(enabled));
  expect(result.current.preferences.moveInDiceOrder).toBe(enabled);
  expect(getItem('GAME_PREFERENCES')).toMatchObject({ moveInDiceOrder: enabled });
  expect(loadGamePreferences().moveInDiceOrder).toBe(enabled);
  expect(DEFAULT_GAME_PREFERENCES.moveInDiceOrder).toBe(false);
});
