import { Feather } from '@expo/vector-icons';
import { fireEvent, render, screen, within } from '@/lib/test-utils';
import { GameHeaderActions } from './game-header-actions';

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
