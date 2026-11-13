import type { MoveLogEntry } from '@/lib/game/move-log';
import type { GameState } from '@/lib/game/types';
import { fireEvent, render, screen } from '@testing-library/react-native';
import { clearGameNotes, getGameNotes } from '@/features/game/game-notes-store';
import { createInitialState } from '@/lib/game/constants';
import { GameNotesSheet } from './game-notes-sheet';

jest.mock('@/lib/i18n', () => ({
  translate: (key: string, params?: Record<string, unknown>) => (params ? `${key} ${JSON.stringify(params)}` : key),
}));

const log: MoveLogEntry[] = [
  { ply: 1, player: 'white', dice: [3, 1], from: 8, to: 5 },
  { ply: 2, player: 'white', dice: [3, 1], from: 6, to: 5 },
];

function blackToPlay(): GameState {
  return { ...createInitialState('vs-human'), phase: 'moving', currentPlayer: 'black', dice: [6, 4], remainingDice: [6, 4] };
}

function renderSheet(overrides: Partial<React.ComponentProps<typeof GameNotesSheet>> = {}) {
  const props = {
    visible: true,
    onClose: jest.fn(),
    state: blackToPlay(),
    ply: 2,
    liveIndex: 2,
    moveLog: log,
    onShow: jest.fn(),
    ...overrides,
  };
  const view = render(<GameNotesSheet {...props} />);
  return { ...view, props };
}

beforeEach(() => {
  clearGameNotes();
});

it('pins a note to the board and dice on screen', () => {
  renderSheet();
  expect(screen.getByText(/game.notes.to_play .*"dice":"6-4"/)).toBeOnTheScreen();
  expect(screen.getByText('game.notes.empty')).toBeOnTheScreen();
  fireEvent.changeText(screen.getByTestId('game-notes-input'), '  Hit or build the 5-point? ');
  fireEvent.press(screen.getByTestId('game-notes-submit'));
  expect(getGameNotes()).toEqual([
    expect.objectContaining({
      ply: 2,
      turn: 2,
      text: 'Hit or build the 5-point?',
      position: expect.objectContaining({ currentPlayer: 'black', dice: [6, 4], phase: 'moving' }),
    }),
  ]);
  expect(screen.getByText('Hit or build the 5-point?')).toBeOnTheScreen();
  expect(screen.getByTestId('game-notes-input').props.value).toBe('');
});

it('does not add a blank note', () => {
  renderSheet();
  fireEvent.changeText(screen.getByTestId('game-notes-input'), '   ');
  fireEvent.press(screen.getByTestId('game-notes-submit'));
  expect(getGameNotes()).toEqual([]);
});

it('edits and deletes a note', () => {
  renderSheet();
  fireEvent.changeText(screen.getByTestId('game-notes-input'), 'first take');
  fireEvent.press(screen.getByTestId('game-notes-submit'));
  fireEvent.press(screen.getByTestId('game-note-edit'));
  expect(screen.getByTestId('game-notes-input').props.value).toBe('first take');
  fireEvent.changeText(screen.getByTestId('game-notes-input'), 'second take');
  fireEvent.press(screen.getByTestId('game-notes-submit'));
  expect(getGameNotes()).toEqual([expect.objectContaining({ text: 'second take', ply: 2 })]);
  fireEvent.press(screen.getByTestId('game-note-delete'));
  expect(getGameNotes()).toEqual([]);
});

it('shows an earlier note on the board and closes', () => {
  const { props, rerender } = renderSheet({ ply: 0, state: { ...blackToPlay(), currentPlayer: 'white', dice: [3, 1], remainingDice: [3, 1] } });
  fireEvent.changeText(screen.getByTestId('game-notes-input'), 'before the 3-1');
  fireEvent.press(screen.getByTestId('game-notes-submit'));
  // Back on the live board, the note sits at an earlier ply and can be shown.
  rerender(<GameNotesSheet {...props} ply={2} state={blackToPlay()} />);
  fireEvent.press(screen.getByTestId('game-note-show'));
  expect(props.onShow).toHaveBeenCalledWith(0);
  expect(props.onClose).toHaveBeenCalledTimes(1);
});

it('offers no Show for the position already on screen or for undone plies', () => {
  const { props, rerender } = renderSheet();
  fireEvent.changeText(screen.getByTestId('game-notes-input'), 'here');
  fireEvent.press(screen.getByTestId('game-notes-submit'));
  expect(screen.queryByTestId('game-note-show')).toBeNull();
  rerender(<GameNotesSheet {...props} ply={1} liveIndex={1} />);
  expect(screen.queryByTestId('game-note-show')).toBeNull();
});
