import { fireEvent, render, screen } from '@testing-library/react-native';
import { useLocalSearchParams } from 'expo-router';
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
jest.mock('@/lib/ui/layout-metrics', () => ({ useLayoutMetrics: () => ({ insets: { top: 0, bottom: 0, left: 0, right: 0 } }), contentEdgePadding: () => ({}) }));
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
  jest.mocked(requestReplaceActiveGame).mock.calls[0]![0].onReplace();
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ dice: [3, 2] }));
});

it('preserves imported action context when the selected turn is pressed', () => {
  const p = newPosition();
  p.context.doubleAction = 'D';
  p.context.turnOwner = 'black';
  p.context.resignation = 2;
  const change = jest.fn();
  render(<PositionDetails position={p} onChange={change} />);
  fireEvent.press(screen.getByTestId('position-turn-white'));
  expect(change).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('position-turn-black'));
  expect(change).toHaveBeenCalledWith(expect.objectContaining({ currentPlayer: 'black', context: expect.objectContaining({ doubleAction: '', resignation: 0, turnOwner: 'black' }) }));
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
  fireEvent.press(screen.getByRole('button', { name: 'positions.computer' }));
  fireEvent.press(screen.getByTestId('position-play'));
  jest.mocked(requestReplaceActiveGame).mock.calls[0]![0].onReplace();
  expect(start).toHaveBeenCalledWith(expect.objectContaining({ mode: 'vs-computer' }));
});
