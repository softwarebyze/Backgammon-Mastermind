import { fireEvent, render, screen } from '@testing-library/react-native';
import { router } from 'expo-router';
import { usePostHog } from 'posthog-react-native';
import { Alert } from 'react-native';
import { useGame } from '@/features/game/use-game';

import { createMatchGame } from '@/lib/game/match';
import { hasQuarantinedSession } from '@/lib/game/persistence';

import { HomeScreen } from './home-screen';

jest.mock('expo-router', () => ({ router: { replace: jest.fn(), push: jest.fn() } }));
jest.mock('posthog-react-native', () => ({ usePostHog: jest.fn().mockReturnValue({ capture: jest.fn() }) }));
jest.mock('@/components/ui', () => ({ FocusAwareStatusBar: () => null }));
jest.mock('@/features/game/use-game', () => ({ useGame: jest.fn() }));
jest.mock('@/components/navigation/settings-header-button', () => ({ SettingsHeaderButton: () => null }));
jest.mock('@/lib/ui/layout-metrics', () => ({
  ...jest.requireActual('@/lib/ui/layout-metrics'),
  useLayoutMetrics: jest.fn().mockReturnValue({
    insets: { left: 0, right: 0, bottom: 0 },
    landscape: false,
  }),
}));
jest.mock('@expo/vector-icons/Feather', () => 'Feather');
jest.mock('@/lib/game/persistence', () => ({
  ...jest.requireActual('@/lib/game/persistence'),
  hasQuarantinedSession: jest.fn().mockReturnValue(false),
}));
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

it('offers one opponent choice and a clear default single-game start', () => {
  render(<HomeScreen />);
  expect(screen.getAllByRole('radio')).toHaveLength(4);
  expect(screen.getAllByText('vs Computer')).toHaveLength(1);
  expect(screen.getAllByText('2 Players')).toHaveLength(1);
  expect(screen.getByTestId('home-opponent-vs-computer').props.accessibilityState).toEqual({ checked: true });
  expect(screen.getByTestId('home-format-single').props.accessibilityState).toEqual({ checked: true });
  expect(screen.queryByTestId('home-match-length-3')).toBeNull();
  expect(useGame().startGame).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Start game' }));
  expect(useGame().startGame).toHaveBeenCalledWith('vs-computer');
  expect(router.replace).toHaveBeenCalledWith('/game');
});

it.each(['vs-human', 'vs-computer'] as const)('starts a %s single game only after Start', (mode) => {
  render(<HomeScreen />);
  fireEvent.press(screen.getByTestId(`home-opponent-${mode}`));
  fireEvent.press(screen.getByTestId('home-format-match'));
  fireEvent.press(screen.getByTestId('home-match-length-5'));
  fireEvent.press(screen.getByTestId('home-format-single'));
  expect(screen.queryByTestId('home-match-length-5')).toBeNull();
  expect(useGame().startGame).not.toHaveBeenCalled();
  expect(useGame().startFromPosition).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('home-start-game'));
  expect(useGame().startGame).toHaveBeenCalledWith(mode);
  expect(useGame().startFromPosition).not.toHaveBeenCalled();
});

it.each([
  ['vs-human', 3],
  ['vs-human', 5],
  ['vs-computer', 3],
  ['vs-computer', 5],
] as const)('starts a %s %s-point match only after Start', (mode, length) => {
  render(<HomeScreen />);
  fireEvent.press(screen.getByTestId(`home-opponent-${mode}`));
  fireEvent.press(screen.getByTestId('home-format-match'));
  expect(screen.getByTestId('home-match-length-3').props.accessibilityState).toEqual({ checked: true });
  fireEvent.press(screen.getByTestId(`home-match-length-${length}`));
  expect(useGame().startFromPosition).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: `Start ${length}-point match` }));
  expect(useGame().startFromPosition).toHaveBeenCalledWith(createMatchGame(length, mode));
  expect(useGame().startGame).not.toHaveBeenCalled();
  expect(router.replace).toHaveBeenCalledWith('/game');
  expect(usePostHog().capture).toHaveBeenCalledWith('game_started', expect.objectContaining({ mode, match_length: length }));
});

it('starts a match without the Crawford rule when it is switched off', () => {
  render(<HomeScreen />);
  fireEvent.press(screen.getByTestId('home-format-match'));
  expect(screen.getByTestId('home-crawford').props.value).toBe(true);
  fireEvent(screen.getByTestId('home-crawford'), 'valueChange', false);
  fireEvent.press(screen.getByRole('button', { name: 'Start 3-point match' }));
  expect(useGame().startFromPosition).toHaveBeenCalledWith(createMatchGame(3, 'vs-computer', false));
  expect(usePostHog().capture).toHaveBeenCalledWith('game_started', expect.objectContaining({ match_length: 3, crawford_rule: false }));
});

it('offers odd match lengths up to 11, without Crawford for a 1-point match', () => {
  render(<HomeScreen />);
  fireEvent.press(screen.getByTestId('home-format-match'));
  fireEvent.press(screen.getByTestId('home-match-length-7'));
  fireEvent.press(screen.getByRole('button', { name: 'Start 7-point match' }));
  expect(useGame().startFromPosition).toHaveBeenLastCalledWith(createMatchGame(7, 'vs-computer', true));
  fireEvent.press(screen.getByTestId('home-match-length-1'));
  expect(screen.queryByTestId('home-crawford')).toBeNull();
  expect(screen.queryByTestId('home-match-length-13')).toBeNull();
});

it('preserves opponent and length when changing formats', () => {
  render(<HomeScreen />);
  fireEvent.press(screen.getByTestId('home-opponent-vs-human'));
  fireEvent.press(screen.getByTestId('home-format-match'));
  fireEvent.press(screen.getByTestId('home-match-length-5'));
  fireEvent.press(screen.getByTestId('home-format-single'));
  fireEvent.press(screen.getByTestId('home-format-match'));
  expect(screen.getByTestId('home-opponent-vs-human').props.accessibilityState).toEqual({ checked: true });
  expect(screen.getByTestId('home-match-length-5').props.accessibilityState).toEqual({ checked: true });
});

it.each(['single', 'match'] as const)('cancels %s replacement without mutation or navigation, then confirms selected setup', (format) => {
  const state = createMatchGame(3);
  jest.mocked(useGame).mockReturnValue({ ...useGame(), state });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  render(<HomeScreen />);
  fireEvent.press(screen.getByTestId('home-opponent-vs-human'));
  fireEvent.press(screen.getByTestId(`home-format-${format}`));
  if (format === 'match')
    fireEvent.press(screen.getByTestId('home-match-length-5'));
  expect(alert).not.toHaveBeenCalled();
  fireEvent.press(screen.getByTestId('home-start-game'));
  let buttons = alert.mock.calls[0][2]!;
  buttons.find(button => button.style === 'cancel')?.onPress?.();
  expect(useGame().startGame).not.toHaveBeenCalled();
  expect(useGame().startFromPosition).not.toHaveBeenCalled();
  expect(router.replace).not.toHaveBeenCalled();
  expect(usePostHog().capture).not.toHaveBeenCalledWith('game_started', expect.anything());
  expect(screen.getByTestId('home-opponent-vs-human').props.accessibilityState).toEqual({ checked: true });
  fireEvent.press(screen.getByTestId('home-start-game'));
  buttons = alert.mock.calls[1][2]!;
  buttons.find(button => button.style === 'destructive')?.onPress?.();
  if (format === 'match')
    expect(useGame().startFromPosition).toHaveBeenCalledWith(createMatchGame(5, 'vs-human'));
  else
    expect(useGame().startGame).toHaveBeenCalledWith('vs-human');
  expect(router.replace).toHaveBeenCalledWith('/game');
  alert.mockRestore();
});

it('keeps Resume and Learn reachable without starting a new game', () => {
  jest.mocked(useGame).mockReturnValue({ ...useGame(), state: createMatchGame(3) });
  render(<HomeScreen />);
  fireEvent.press(screen.getByTestId('resume-game-button'));
  expect(router.replace).toHaveBeenCalledWith('/game');
  expect(useGame().startGame).not.toHaveBeenCalled();
  fireEvent.press(screen.getByRole('button', { name: 'Learn to play' }));
  expect(router.push).toHaveBeenCalled();
});

it('retains review of a completed game', () => {
  const state = { ...createMatchGame(3), phase: 'game-over' as const, match: undefined, winner: 'white' as const };
  jest.mocked(useGame).mockReturnValue({ ...useGame(), state });
  render(<HomeScreen />);
  expect(screen.queryByTestId('resume-game-button')).toBeNull();
  fireEvent.press(screen.getByTestId('review-last-game-button'));
  expect(router.replace).toHaveBeenCalledWith('/game');
  expect(useGame().startGame).not.toHaveBeenCalled();
});

it('retains dismissible saved-game recovery', () => {
  jest.mocked(hasQuarantinedSession).mockReturnValueOnce(true);
  render(<HomeScreen />);
  expect(screen.getByTestId('saved-game-recovery-banner')).toBeOnTheScreen();
  fireEvent.press(screen.getByTestId('saved-game-recovery-dismiss'));
  expect(screen.queryByTestId('saved-game-recovery-banner')).toBeNull();
  expect(screen.getByTestId('home-start-game')).toBeOnTheScreen();
});

it('continues the existing game from the replacement dialog without starting the setup', () => {
  jest.mocked(useGame).mockReturnValue({ ...useGame(), state: createMatchGame(3) });
  const alert = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
  render(<HomeScreen />);
  fireEvent.press(screen.getByTestId('home-start-game'));
  alert.mock.calls[0][2]?.find(button => button.text === 'Continue')?.onPress?.();
  expect(router.replace).toHaveBeenCalledWith('/game');
  expect(useGame().startGame).not.toHaveBeenCalled();
  expect(useGame().startFromPosition).not.toHaveBeenCalled();
  alert.mockRestore();
});
