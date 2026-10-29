import { fireEvent, render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
import { StyleSheet } from 'react-native';
import { requestReplaceActiveGame } from '@/features/game/request-new-game';
import { useGame } from '@/features/game/use-game';
import { createInitialState } from '@/lib/game/constants';
import { newPosition } from '@/lib/positions/position';
import { setRawString } from '@/lib/storage';
import { PositionDetails } from './position-details';
import { PositionScreen } from './position-screen';

jest.mock('expo-clipboard', () => ({ setStringAsync: jest.fn(() => Promise.resolve(true)) }));
jest.mock('expo-router', () => ({ useLocalSearchParams: jest.fn(() => ({})), router: { replace: jest.fn() } }));
jest.mock('@/features/game/use-game', () => ({ useGame: jest.fn() }));
jest.mock('@/features/game/request-new-game', () => ({ requestReplaceActiveGame: jest.fn() }));
jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key }));
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
  fireEvent.press(screen.getByTestId('position-remove'));
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

it('edits visible die faces without a keyboard or invalid half roll', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-die-0'));
  fireEvent.press(screen.getByTestId('position-dice-value-3'));
  expect(screen.getByTestId('position-die-0').props.accessibilityLabel).toBe('positions.die_one: 3');
  expect(screen.getByTestId('position-die-1').props.accessibilityLabel).toBe('positions.die_two: 1');
  expect(screen.getByTestId('position-play')).toBeEnabled();
  fireEvent.press(screen.getByTestId('position-die-1'));
  fireEvent.press(screen.getByTestId('position-dice-value-2'));
  fireEvent.press(screen.getByTestId('test-board-point'));
  fireEvent.press(screen.getByTestId('position-remove'));
  expect(screen.getByTestId('test-board-point')).toHaveTextContent('4');
  fireEvent.press(screen.getByTestId('position-play'));
  fireEvent.press(screen.getByTestId('position-start'));
  jest.mocked(requestReplaceActiveGame).mock.calls[0]![0].onReplace();
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ dice: [3, 2] }));
});

it('preserves imported action context when the selected turn is pressed', () => {
  const p = newPosition();
  p.context.doubleAction = 'D';
  p.context.turnOwner = 'black';
  p.context.resignation = 2;
  const change = jest.fn();
  render(<PositionDetails position={p} onChange={change} editing="turn" onEdit={jest.fn()} />);
  fireEvent.press(screen.getByTestId('position-turn'));
  fireEvent.press(screen.getByTestId('position-turn-white'));
  expect(change).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('position-turn-black'));
  expect(change).toHaveBeenCalledWith(expect.objectContaining({ currentPlayer: 'black', context: expect.objectContaining({ doubleAction: '', resignation: 0, turnOwner: 'black' }) }));
});

it('clears the saved-position name input after a successful save', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-saved-toggle'));
  fireEvent.changeText(screen.getByTestId('position-save-name'), 'My board');
  fireEvent.press(screen.getByTestId('position-save'));
  expect(screen.getByTestId('position-save-name').props.value).toBe('');
  expect(screen.getByRole('button', { name: 'My board' })).toBeTruthy();
});

it('shows a disabled, explained copy-from-game action when there is no active game', () => {
  jest.mocked(useGame).mockReturnValue({ state: null, startFromPosition: start } as unknown as ReturnType<typeof useGame>);
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-exchange-toggle'));
  expect(screen.getByTestId('position-current').props.accessibilityState.disabled).toBe(true);
  expect(screen.getByText('positions.no_active_game')).toBeTruthy();
  expect(screen.getByRole('button', { name: 'positions.copy_from_game' })).toBeTruthy();
});

it('shows a visible Crawford badge on the cube dock and turns Crawford off from the cube editor', () => {
  const p = newPosition();
  p.context = { ...p.context, matchLength: 7, crawford: true };
  const change = jest.fn();
  const { rerender } = render(<PositionDetails position={p} onChange={change} editing={null} onEdit={jest.fn()} />);
  expect(screen.getByTestId('position-crawford-badge')).toBeTruthy();
  expect(screen.getByText('positions.crawford')).toBeTruthy();
  rerender(<PositionDetails position={p} onChange={change} editing="cube" onEdit={jest.fn()} />);
  fireEvent.press(screen.getByTestId('position-crawford-off'));
  expect(change).toHaveBeenCalledWith(expect.objectContaining({ context: expect.objectContaining({ crawford: false }) }));
});

it('floats detail editors over the tools below instead of pushing them in flow', () => {
  render(<PositionScreen />);
  fireEvent.press(screen.getByTestId('position-cube'));
  const overlay = screen.getByTestId('position-detail-overlay');
  expect((StyleSheet.flatten(overlay.props.style) as { position?: string }).position).toBe('absolute');
  // The tools row underneath never leaves the tree or moves in flow.
  expect(screen.getByTestId('position-play')).toBeTruthy();
  expect(screen.getByTestId('position-saved-toggle')).toBeTruthy();
  fireEvent.press(screen.getByTestId('position-detail-done'));
  expect(screen.queryByTestId('position-detail-overlay')).toBeNull();
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
  fireEvent.press(screen.getByTestId('position-remove'));
  expect(screen.getByTestId('position-exchange-toggle').props.accessibilityState.selected).toBe(true);
  expect(screen.getByTestId('position-import-input').props.value).toBe('a position I am still pasting');
  expect(screen.queryByTestId('position-export-output')).toBeNull();
  expect(start).not.toHaveBeenCalled();
});

it('keeps object summaries visible and opens only the chosen detail editor', () => {
  render(<PositionScreen />);
  expect(screen.getByTestId('position-object-dock')).toBeTruthy();
  expect(screen.getByTestId('position-score-toggle')).toBeTruthy();
  expect(screen.queryByTestId('position-match-length')).toBeNull();
  expect(screen.queryByTestId('position-cube-higher')).toBeNull();
  expect(screen.queryByTestId('position-start')).toBeNull();
  fireEvent.press(screen.getByTestId('position-score-toggle'));
  fireEvent.changeText(screen.getByTestId('position-match-length'), '7');
  fireEvent.changeText(screen.getByTestId('position-score-white'), '3');
  fireEvent.press(screen.getByTestId('position-cube'));
  expect(screen.queryByTestId('position-match-length')).toBeNull();
  expect(screen.getByTestId('position-cube-higher')).toBeTruthy();
  fireEvent.press(screen.getByTestId('position-detail-done'));
  expect(screen.queryByTestId('position-detail-panel')).toBeNull();
  expect(screen.getByTestId('position-score-toggle').props.accessibilityLabel).toContain('3 – 0');
  fireEvent.press(screen.getByTestId('position-score-toggle'));
  expect(screen.getByTestId('position-match-length').props.value).toBe('7');
  expect(screen.getByTestId('position-score-white').props.value).toBe('3');
  expect(start).not.toHaveBeenCalled();
});
