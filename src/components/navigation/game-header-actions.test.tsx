import { Feather } from '@expo/vector-icons';

import { useLayoutIsRTL } from '@/lib/i18n';
import { cleanup, fireEvent, render, screen, within } from '@/lib/test-utils';
import he from '@/translations/he.json';

import { GameHeaderActions } from './game-header-actions';

jest.mock('@/lib/i18n', () => ({
  ...jest.requireActual('@/lib/i18n'),
  useLayoutIsRTL: jest.fn(() => false),
}));
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));

const layoutRTL = jest.mocked(useLayoutIsRTL);
beforeEach(() => layoutRTL.mockReturnValue(false));
afterEach(cleanup);

it('uses the Settings gear and opens Settings through its accessible button', () => {
  const onOptions = jest.fn();
  render(<GameHeaderActions onOptions={onOptions} onReset={jest.fn()} />);
  const settings = screen.getByRole('button', { name: 'Settings' });
  expect(within(settings).UNSAFE_getByType(Feather).props.name).toBe('settings');
  fireEvent.press(settings);
  expect(onOptions).toHaveBeenCalledTimes(1);
});

// The header timeline undo is the only undo reachable while dice remain in the
// turn, because the confirm bar only renders once remainingDice hits 0. Maestro
// drives it by testID, so these IDs are part of the E2E contract.
it('exposes testIDs for the mid-sequence header undo and redo', () => {
  render(<GameHeaderActions canUndo canRedo onUndo={jest.fn()} onRedo={jest.fn()} onOptions={jest.fn()} onReset={jest.fn()} />);
  expect(screen.getByTestId('header-undo-button')).toBeOnTheScreen();
  expect(screen.getByTestId('header-redo-button')).toBeOnTheScreen();
});

it('drives header undo and redo through their testIDs', () => {
  const onUndo = jest.fn();
  const onRedo = jest.fn();
  render(<GameHeaderActions canUndo canRedo onUndo={onUndo} onRedo={onRedo} onOptions={jest.fn()} onReset={jest.fn()} />);
  fireEvent.press(screen.getByTestId('header-undo-button'));
  expect(onUndo).toHaveBeenCalledTimes(1);
  fireEvent.press(screen.getByTestId('header-redo-button'));
  expect(onRedo).toHaveBeenCalledTimes(1);
});

it('keeps the header undo testID distinct from the confirm bar undo testID', () => {
  render(<GameHeaderActions canUndo onUndo={jest.fn()} onOptions={jest.fn()} onReset={jest.fn()} />);
  expect(screen.queryByTestId('undo-move-button')).toBeNull();
});

it.each([false, true])('points undo backward and redo forward with RTL=%s', (rtl) => {
  layoutRTL.mockReturnValue(rtl);
  render(<GameHeaderActions canUndo canRedo onUndo={jest.fn()} onRedo={jest.fn()} onOptions={jest.fn()} onReset={jest.fn()} />);
  const undo = screen.getByTestId('header-undo-button');
  const redo = screen.getByTestId('header-redo-button');
  expect(within(undo).UNSAFE_getByType(Feather).props.name).toBe(rtl ? 'corner-up-right' : 'corner-up-left');
  expect(within(redo).UNSAFE_getByType(Feather).props.name).toBe(rtl ? 'corner-up-left' : 'corner-up-right');
});

it('provides Hebrew undo and redo labels rather than the English fallback', () => {
  expect(he.game.controls.undo_a11y).toBe('ביטול המהלך');
  expect(he.game.controls.redo_a11y).toBe('ביצוע המהלך מחדש');
});
