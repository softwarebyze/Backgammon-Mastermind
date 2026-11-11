import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { useLearnProgress } from '@/features/learn/use-learn-progress';
import { LESSON_IDS } from '@/lib/learn/curriculum';

import { LearnHubScreen } from './learn-hub-screen';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('posthog-react-native', () => ({ usePostHog: jest.fn().mockReturnValue({ capture: jest.fn() }) }));
jest.mock('@/components/ui', () => ({ FocusAwareStatusBar: () => null }));
jest.mock('@/features/game/use-game', () => ({ useGame: jest.fn().mockReturnValue({ state: null, startGame: jest.fn() }) }));
jest.mock('@/features/learn/use-learn-progress', () => ({ useLearnProgress: jest.fn() }));
jest.mock('@/lib/ui/layout-metrics', () => ({
  ...jest.requireActual('@/lib/ui/layout-metrics'),
  useLayoutMetrics: jest.fn().mockReturnValue({ insets: { left: 0, right: 0, bottom: 0 }, landscape: false }),
}));
jest.mock('@expo/vector-icons/Feather', () => 'Feather');
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn(), hapticSelection: jest.fn() }));

function withProgress(completedLessons: string[], quizPassed = false) {
  jest.mocked(useLearnProgress).mockReturnValue({
    progress: { completedLessons, quizPassed, hasStarted: completedLessons.length > 0 },
    startLearning: jest.fn(),
  } as unknown as ReturnType<typeof useLearnProgress>);
}

beforeEach(() => jest.clearAllMocks());

it('starts a newcomer on the first lesson', () => {
  withProgress([]);
  render(<LearnHubScreen />);
  expect(screen.getByText('Start here')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Goal & board' })).toBeTruthy();
  expect(screen.getByText('0 of 10 lessons done')).toBeTruthy();
  fireEvent.press(screen.getByRole('button', { name: 'Start lesson' }));
  expect(router.push).toHaveBeenCalledWith('/learn/goal-board');
});

it('sends a returning learner to the first lesson not done yet, even after skipping ahead', () => {
  withProgress(['goal-board', 'direction-setup', 'strategies']);
  render(<LearnHubScreen />);
  expect(screen.getByText('Next lesson')).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Moving with dice' })).toBeTruthy();
  expect(screen.getByRole('progressbar').props.accessibilityValue).toEqual({ min: 0, max: 100, now: 30 });
  fireEvent.press(screen.getByTestId('learn-next-action'));
  expect(router.push).toHaveBeenCalledWith('/learn/moving-dice');
});

it('groups every lesson into its chapter and opens any of them', () => {
  withProgress([]);
  render(<LearnHubScreen />);
  expect(screen.getByRole('header', { name: 'The basics' })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Playing well' })).toBeTruthy();
  expect(screen.getByRole('header', { name: 'Going further' })).toBeTruthy();
  for (const id of LESSON_IDS)
    expect(screen.getByTestId(`learn-lesson-${id}`)).toBeTruthy();
  fireEvent.press(screen.getByTestId('learn-lesson-match-play'));
  expect(router.push).toHaveBeenCalledWith('/learn/match-play');
});

it('offers the quick check once every lesson is done, then the first game', () => {
  withProgress([...LESSON_IDS]);
  const view = render(<LearnHubScreen />);
  fireEvent.press(screen.getByRole('button', { name: 'Quick check' }));
  expect(router.push).toHaveBeenCalledWith('/learn/graduation');
  expect(screen.getByText('Skip to play')).toBeTruthy();
  view.unmount();
  withProgress([...LESSON_IDS], true);
  render(<LearnHubScreen />);
  expect(screen.getByRole('button', { name: 'Play your first game' })).toBeTruthy();
  expect(screen.queryByText('Skip to play')).toBeNull();
});
