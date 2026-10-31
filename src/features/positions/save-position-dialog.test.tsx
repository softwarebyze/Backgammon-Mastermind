import { fireEvent, render, screen } from '@testing-library/react-native';
import { showMessage } from 'react-native-flash-message';
import { createInitialState } from '@/lib/game/constants';
import { loadSavedPositions } from '@/lib/positions/saved-positions';
import { setRawString } from '@/lib/storage';
import { SavePositionDialog } from './save-position-dialog';

jest.mock('react-native-flash-message', () => ({ showMessage: jest.fn() }));
jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key }));

beforeEach(() => {
  jest.clearAllMocks();
  setRawString('SAVED_POSITIONS_V1', '[]');
});

it('saves the live board with a name and note, marked as from a game, and closes', () => {
  const close = jest.fn();
  render(<SavePositionDialog state={createInitialState('vs-computer')} visible onClose={close} />);
  fireEvent.changeText(screen.getByTestId('save-position-name'), 'Opening');
  fireEvent.changeText(screen.getByTestId('save-position-note'), 'Split or build?');
  fireEvent.press(screen.getByTestId('save-position-confirm'));
  expect(loadSavedPositions()[0]).toMatchObject({ name: 'Opening', note: 'Split or build?', source: 'game', savedAt: expect.any(Number) });
  expect(showMessage).toHaveBeenCalledWith(expect.objectContaining({ message: 'positions.saved_notice' }));
  expect(close).toHaveBeenCalledTimes(1);
});

it('falls back to a default name and saves nothing on cancel', () => {
  const close = jest.fn();
  const { rerender } = render(<SavePositionDialog state={createInitialState('vs-human')} visible onClose={close} />);
  fireEvent.press(screen.getByTestId('save-position-cancel'));
  expect(loadSavedPositions()).toEqual([]);
  rerender(<SavePositionDialog state={createInitialState('vs-human')} visible onClose={close} />);
  fireEvent.press(screen.getByTestId('save-position-confirm'));
  expect(loadSavedPositions()[0]!.name).toBe('positions.game_snapshot');
});
