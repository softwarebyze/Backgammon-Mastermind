import { act, fireEvent, render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { requestReplaceActiveGame } from '@/features/game/request-new-game';
import { useGame } from '@/features/game/use-game';
import { createInitialState } from '@/lib/game/constants';
import { newPosition } from '@/lib/positions/position';
import { setRawString } from '@/lib/storage';
import { PositionScreen } from './position-screen';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
const mockSetOptions = jest.fn();
jest.mock('expo-router', () => ({ useLocalSearchParams: jest.fn(() => ({})), useNavigation: jest.fn(() => ({ setOptions: mockSetOptions })), router: { replace: jest.fn() } }));

jest.mock('@/features/game/use-game', () => ({ useGame: jest.fn() }));
jest.mock('@/features/game/request-new-game', () => ({ requestReplaceActiveGame: jest.fn() }));
jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key, useLayoutIsRTL: jest.fn(() => false), getLanguage: () => 'en' }));
jest.mock('@/components/ui', () => ({ FocusAwareStatusBar: () => null }));
jest.mock('@/lib/ui/layout-metrics', () => ({ useLayoutMetrics: jest.fn(() => ({ insets: { top: 0, bottom: 0, left: 0, right: 0 } })), contentEdgePadding: () => ({}) }));
jest.mock('@/features/game/components/board/board-view', () => {
  const { Pressable, Text } = require('react-native');
  return ({
    BoardView: ({ state, onPointPress }: { state: { points: { count: number }[] }; onPointPress: (point: number) => void }) => <Pressable testID="test-board-point" onPress={() => onPointPress(6)}><Text>{state.points[6]!.count}</Text></Pressable>,
  });
});

const start = jest.fn();
beforeEach(() => {
  jest.clearAllMocks();
  setRawString('SAVED_POSITIONS_V1', '[]');
  jest.mocked(useLocalSearchParams).mockReturnValue({});
  jest.mocked(useGame).mockReturnValue({ state: createInitialState('vs-human'), startFromPosition: start } as unknown as ReturnType<typeof useGame>);
});

it('editing, saving and exporting a position never replaces the active game', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('test-board-point'));
  fireEvent.press(screen.getByTestId('position-saved-toggle'));
  fireEvent.press(screen.getByTestId('position-save'));
  fireEvent.press(screen.getByTestId('position-exchange-toggle'));
  fireEvent.press(screen.getByTestId('position-export-xgid'));
  expect(screen.getByTestId('position-export-output').props.value).toContain('XGID=');
  expect(start).not.toHaveBeenCalled();
  expect(requestReplaceActiveGame).not.toHaveBeenCalled();
});

it('opens a shared preview without replacing a game, then uses confirmation on Play', () => {
  const p = newPosition();
  p.dice = [6, 2];
  jest.mocked(useLocalSearchParams).mockReturnValue({ data: JSON.stringify(p) });
  render(<PositionScreen />);
  expect(screen.getByText('positions.shared_intro')).toBeTruthy();
  expect(start).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('position-play'));
  fireEvent.press(screen.getByTestId('position-start'));
  expect(requestReplaceActiveGame).toHaveBeenCalledWith(expect.objectContaining({ source: 'position', onReplace: expect.any(Function) }));
  expect(start).not.toHaveBeenCalled();
  jest.mocked(requestReplaceActiveGame).mock.calls[0]![0].onReplace();
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ dice: [6, 2], mode: 'vs-human' }));
});

it('shows invalid import errors without modifying or replacing the board', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-exchange-toggle'));
  fireEvent.press(screen.getByTestId('position-import-toggle'));
  fireEvent.changeText(screen.getByTestId('position-import-input'), '{bad json');
  fireEvent.press(screen.getByTestId('position-import-load'));
  expect(screen.getByText('positions.error_format')).toBeTruthy();
  expect(start).not.toHaveBeenCalled();
  expect(screen.getByTestId('test-board-point')).toHaveTextContent('5');
});

it('picks each die from all six faces in one tap, then offers the other blank die', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-die-0'));
  fireEvent.press(screen.getByTestId('position-die-option-3'));
  expect(screen.getByTestId('position-die-0').props.accessibilityLabel).toBe('positions.dice 1: 3');
  // A half roll cannot start, so the second die's picker opens straight away.
  expect(screen.getByTestId('position-play')).toBeDisabled();
  fireEvent.press(screen.getByTestId('position-die-option-2'));
  expect(screen.queryByTestId('position-die-picker')).toBeNull();
  expect(screen.getByTestId('position-play')).toBeEnabled();
  fireEvent.press(screen.getByTestId('position-play'));
  fireEvent.press(screen.getByTestId('position-start'));
  jest.mocked(requestReplaceActiveGame).mock.calls[0]![0].onReplace();
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ dice: [3, 2] }));
});

it('clears a die with Roll later and closes the picker from outside', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-die-0'));
  fireEvent.press(screen.getByTestId('position-die-picker-close'));
  expect(screen.queryByTestId('position-die-picker')).toBeNull();
  fireEvent.press(screen.getByTestId('position-die-0'));
  fireEvent.press(screen.getByTestId('position-die-option-5'));
  fireEvent.press(screen.getByTestId('position-die-option-5'));
  fireEvent.press(screen.getByTestId('position-die-0'));
  fireEvent.press(screen.getByTestId('position-die-option-0'));
  expect(screen.getByTestId('position-die-0').props.accessibilityLabel).toBe('positions.dice 1: positions.roll_later');
  expect(screen.queryByTestId('position-die-picker')).toBeNull();
});

it('gives a whitespace-only saved name the translated untitled label', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-saved-toggle'));
  fireEvent.changeText(screen.getByTestId('position-save-name'), '   ');
  fireEvent.press(screen.getByTestId('position-save'));
  expect(screen.getByRole('button', { name: 'positions.untitled' })).toBeTruthy();
});

it('keeps presets and dice visible while exchange and saved tools stay collapsed', () => {
  render(<PositionScreen />);
  expect(screen.getByTestId('position-standard')).toBeTruthy();
  expect(screen.getByTestId('position-empty')).toBeTruthy();
  expect(screen.getByTestId('position-die-0')).toBeTruthy();
  expect(screen.getByTestId('position-scoreboard')).toBeTruthy();
  expect(screen.queryByTestId('position-strip')).toBeNull();
  expect(screen.queryByTestId('position-save-name')).toBeNull();
  expect(screen.queryByTestId('position-fine-tune')).toBeNull();
  expect(screen.queryByTestId('position-setup-toggle')).toBeNull();
  fireEvent.press(screen.getByTestId('position-empty'));
  expect(screen.getByTestId('test-board-point')).toHaveTextContent('0');
  expect(screen.getByTestId('position-play')).toBeDisabled();
  fireEvent.press(screen.getByTestId('position-standard'));
  fireEvent.press(screen.getByTestId('position-play'));
  fireEvent.press(screen.getByRole('button', { name: 'positions.computer' }));
  fireEvent.press(screen.getByTestId('position-start'));
  jest.mocked(requestReplaceActiveGame).mock.calls[0]![0].onReplace();
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ mode: 'vs-computer' }));
});

it('retains an open import draft through board edits while clearing stale exports', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-exchange-toggle'));
  fireEvent.press(screen.getByTestId('position-import-toggle'));
  fireEvent.changeText(screen.getByTestId('position-import-input'), 'a position I am still pasting');
  fireEvent.press(screen.getByTestId('position-export-xgid'));
  expect(screen.getByTestId('position-export-output')).toBeTruthy();
  fireEvent.press(screen.getByTestId('test-board-point'));
  expect(screen.getByTestId('position-exchange-toggle').props.accessibilityState.selected).toBe(true);
  expect(screen.getByTestId('position-import-input').props.value).toBe('a position I am still pasting');
  expect(screen.queryByTestId('position-export-output')).toBeNull();
  expect(start).not.toHaveBeenCalled();
});

it('keeps the match score on a scoreboard with odd match lengths', () => {
  render(<PositionScreen />);
  // Money play has no score to keep.
  expect(screen.getByTestId('position-match-length')).toHaveProp('accessibilityLabel', 'positions.match_to: positions.money_short');
  expect(screen.queryByTestId('position-score-white')).toBeNull();
  for (let i = 0; i < 4; i++)
    fireEvent.press(screen.getByTestId('position-match-length-higher'));
  // Money → 1 → 3 → 5 → 7.
  expect(screen.getByTestId('position-match-length')).toHaveProp('accessibilityLabel', 'positions.match_to: 7');
  for (let i = 0; i < 9; i++)
    fireEvent.press(screen.getByTestId('position-score-white-higher'));
  // A score never reaches the match length.
  expect(screen.getByTestId('position-score-white')).toHaveProp('accessibilityLabel', 'positions.white_score: 6');
  expect(screen.getByTestId('position-score-black')).toHaveProp('accessibilityLabel', 'positions.black_score: 0');
  expect(start).not.toHaveBeenCalled();
});

it('offers Crawford only while exactly one player is a point from winning', () => {
  render(<PositionScreen />);
  for (let i = 0; i < 3; i++)
    fireEvent.press(screen.getByTestId('position-match-length-higher'));
  // One chip only, and 0-0 to 5 has no Crawford game.
  expect(screen.queryByTestId('position-crawford-rule')).toBeNull();
  expect(screen.queryByTestId('position-crawford')).toBeNull();
  for (let i = 0; i < 4; i++)
    fireEvent.press(screen.getByTestId('position-score-white-higher'));
  // Reaching match point starts the Crawford game; it can be switched to post-Crawford.
  expect(screen.getByTestId('position-crawford')).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
  fireEvent.press(screen.getByTestId('position-crawford'));
  expect(screen.getByTestId('position-crawford')).toHaveProp('accessibilityState', expect.objectContaining({ selected: false }));
  fireEvent.press(screen.getByTestId('position-crawford'));
  // Both at match point: double match point, never Crawford.
  for (let i = 0; i < 4; i++)
    fireEvent.press(screen.getByTestId('position-score-black-higher'));
  expect(screen.queryByTestId('position-crawford')).toBeNull();
  // Back to one side at match point: it is the Crawford game again.
  fireEvent.press(screen.getByTestId('position-score-black-lower'));
  expect(screen.getByTestId('position-crawford')).toHaveProp('accessibilityState', expect.objectContaining({ selected: true }));
});

it('puts a player on roll by tapping their strip', () => {
  render(<PositionScreen />);
  expect(screen.getByTestId('player-status-white')).toHaveTextContent('positions.on_roll');
  // The waiting side says how to give it the roll, apart from the "Place" colours.
  expect(screen.getByTestId('player-status-black')).toHaveTextContent('positions.tap_on_roll');
  expect(screen.getByText('positions.place')).toBeTruthy();
  fireEvent.press(screen.getByTestId('player-name-black'));
  expect(screen.getByTestId('player-status-black')).toHaveTextContent('positions.on_roll');
  expect(screen.getByTestId('player-status-white')).toHaveTextContent('positions.tap_on_roll');
});

/** The header's undo/redo element, as the navigator would render it. */
function headerActions() {
  const options = mockSetOptions.mock.lastCall![0] as { headerRight: () => React.ReactElement<{ canUndo: boolean; canRedo: boolean; onUndo: () => void; onRedo: () => void }> };
  return options.headerRight().props;
}

it('undoes and redoes board edits from the header', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-empty'));
  expect(screen.getByTestId('test-board-point')).toHaveTextContent('0');
  fireEvent.press(screen.getByTestId('test-board-point'));
  expect(screen.getByTestId('test-board-point')).toHaveTextContent('1');
  act(() => headerActions().onUndo());
  expect(screen.getByTestId('test-board-point')).toHaveTextContent('0');
  act(() => headerActions().onUndo());
  expect(screen.getByTestId('test-board-point')).toHaveTextContent('5');
  expect(headerActions().canUndo).toBe(false);
  act(() => headerActions().onRedo());
  expect(screen.getByTestId('test-board-point')).toHaveTextContent('0');
});

it('saves a named position with a note and shows when it was saved', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-saved-toggle'));
  fireEvent.changeText(screen.getByTestId('position-save-name'), 'Back game');
  fireEvent.changeText(screen.getByTestId('position-save-note'), 'Hold both anchors');
  fireEvent.press(screen.getByTestId('position-save'));
  expect(screen.getByText('Back game')).toBeTruthy();
  expect(screen.getByText('Hold both anchors')).toBeTruthy();
  expect(screen.getByTestId('position-save-name').props.value).toBe('');
});

it('no longer copies the live game into the editor', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-exchange-toggle'));
  expect(screen.queryByTestId('position-current')).toBeNull();
});
