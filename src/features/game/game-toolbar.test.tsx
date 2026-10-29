import { cleanup, fireEvent, render, screen } from '@/lib/test-utils';
import { GameToolbar } from './game-toolbar';

jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));
afterEach(cleanup);

it('keeps every game action without a navigation bar', () => {
  const props = { canUndo: true, canRedo: false, onUndo: jest.fn(), onRedo: jest.fn(), onOptions: jest.fn(), onReset: jest.fn(), onHome: jest.fn() };
  render(<GameToolbar {...props} />);
  fireEvent.press(screen.getByTestId('leave-game-button'));
  fireEvent.press(screen.getByTestId('header-undo-button'));
  fireEvent.press(screen.getByTestId('game-settings-button'));
  fireEvent.press(screen.getByTestId('reset-game-button'));
  expect(props.onHome).toHaveBeenCalledTimes(1);
  expect(props.onUndo).toHaveBeenCalledTimes(1);
  expect(props.onOptions).toHaveBeenCalledTimes(1);
  expect(props.onReset).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('header-redo-button')).toBeDisabled();
});
