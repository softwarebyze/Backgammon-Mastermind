import { fireEvent, render, screen } from '@testing-library/react-native';
import { DieFace } from '@/features/game/components/board/dice-display';
import { rollDice } from '@/lib/game/moves';
import { DiceScreen } from './dice-screen';

jest.mock('@/lib/game/moves', () => ({ rollDice: jest.fn() }));
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));
jest.mock('@/lib/ui/layout-metrics', () => ({
  useLayoutMetrics: () => ({ width: 390, insets: { bottom: 0 } }),
}));
jest.mock('@/components/ui', () => ({
  FocusAwareStatusBar: () => null,
  ScrollView: require('react-native').ScrollView,
  Text: require('react-native').Text,
}));
jest.mock('@/lib/i18n', () => ({
  translate: (key: string, values?: { count: number; first: number; second: number }) => {
    if (key === 'dice.result' && values)
      return `Roll ${values.count}: ${values.first} and ${values.second}`;
    return key;
  },
}));

beforeEach(() => jest.clearAllMocks());

it('waits for a deliberate tap and counts identical consecutive rolls', () => {
  jest.mocked(rollDice).mockReturnValue([3, 5]);
  render(<DiceScreen />);
  expect(rollDice).not.toHaveBeenCalled();
  expect(screen.getByText('dice.ready')).toBeTruthy();
  fireEvent.press(screen.getByTestId('standalone-roll-button'));
  expect(screen.getByText('Roll 1: 3 and 5')).toBeTruthy();
  fireEvent.press(screen.getByTestId('standalone-roll-button'));
  expect(screen.getByText('Roll 2: 3 and 5')).toBeTruthy();
  expect(rollDice).toHaveBeenCalledTimes(2);
});

it('renders exactly two physical dice even for doubles', () => {
  jest.mocked(rollDice).mockReturnValue([6, 6]);
  render(<DiceScreen />);
  fireEvent.press(screen.getByTestId('standalone-roll-button'));
  expect(screen.getByText('Roll 1: 6 and 6')).toBeTruthy();
  expect(screen.UNSAFE_getAllByType(DieFace)).toHaveLength(2);
});
