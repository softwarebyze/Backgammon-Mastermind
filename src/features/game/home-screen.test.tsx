import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';

import { useGame } from '@/features/game/use-game';
import { createMatchGame } from '@/lib/game/match';

import { HomeScreen } from './home-screen';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('posthog-react-native', () => ({ usePostHog: () => ({ capture: jest.fn() }) }));
jest.mock('@/components/ui', () => ({ FocusAwareStatusBar: () => null }));
jest.mock('@/features/game/use-game', () => ({ useGame: jest.fn() }));
jest.mock('@/lib/ui/layout-metrics', () => ({
  ...jest.requireActual('@/lib/ui/layout-metrics'),
  useLayoutMetrics: () => ({ insets: { left: 0, right: 0, bottom: 0 }, landscape: false }),
}));
jest.mock('@expo/vector-icons/Feather', () => 'Feather');
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));

beforeEach(() => {
  jest.clearAllMocks();
  jest.mocked(useGame).mockReturnValue({
    state: null,
    startGame: jest.fn(),
    startFromPosition: jest.fn(),
    resumeGame: jest.fn(),
  } as unknown as ReturnType<typeof useGame>);
});

it('keeps single-game actions ahead of match options in the scrollable home menu', () => {
  render(<HomeScreen />);
  const names = screen.getAllByRole('button').map(button => button.props.accessibilityLabel);
  expect(names).toEqual([
    'Learn to play',
    'Play against the computer',
    'Play with two players locally',
    '3 points',
    '5 points',
  ]);
  expect(screen.getByTestId('home-screen')).toBeOnTheScreen();
});

it.each([3, 5] as const)('still starts a local %s-point match from home', (length) => {
  render(<HomeScreen />);
  fireEvent.press(screen.getByTestId(`start-match-${length}`));
  expect(useGame().startFromPosition).toHaveBeenCalledWith(createMatchGame(length));
  expect(router.replace).toHaveBeenCalledWith('/game');
});
