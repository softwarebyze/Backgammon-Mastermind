import { fireEvent, render, screen } from '@testing-library/react-native';
import { PositionHistoryActions } from './position-history-actions';

jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key, useLayoutIsRTL: jest.fn(() => false) }));
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));

it('offers undo and redo only when there is a step to take', () => {
  const undo = jest.fn();
  const redo = jest.fn();
  render(<PositionHistoryActions canUndo canRedo={false} onUndo={undo} onRedo={redo} />);
  fireEvent.press(screen.getByTestId('position-undo'));
  expect(undo).toHaveBeenCalledTimes(1);
  expect(screen.getByTestId('position-redo')).toBeDisabled();
});
