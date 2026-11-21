import type { GameStats } from '@/lib/game/stats';
import { emptyStats, recordResult } from '@/lib/game/stats';
import { cleanup, render, screen } from '@/lib/test-utils';
import { HomeStatsLink } from './home-stats-link';
import { StatsScreen } from './stats-screen';

let mockStats: GameStats = emptyStats();
jest.mock('./use-game-stats', () => ({
  useGameStats: jest.fn(() => mockStats),
}));
jest.mock('expo-router', () => ({ router: { push: jest.fn() }, useIsFocused: () => false }));
jest.mock('react-native-safe-area-context', () => ({
  useSafeAreaInsets: () => ({ top: 0, right: 0, bottom: 0, left: 0 }),
}));

afterEach(() => {
  cleanup();
  mockStats = emptyStats();
});

function withGames(): GameStats {
  let stats = emptyStats();
  for (const winner of ['white', 'black', 'white', 'white'] as const) {
    stats = recordResult(stats, { at: 1, mode: 'vs-computer', winner, kind: 'single', moves: 40 });
  }
  return recordResult(stats, { at: 2, mode: 'vs-human', winner: 'black', kind: 'gammon', moves: 50 });
}

describe('stats screen', () => {
  it('shows an empty state before the first finished game', () => {
    render(<StatsScreen />);
    expect(screen.getByTestId('stats-empty')).toBeTruthy();
  });

  it('shows the record against the computer, the streak and recent games', () => {
    mockStats = withGames();
    render(<StatsScreen />);
    expect(screen.getByLabelText('Played: 4')).toBeTruthy();
    expect(screen.getByLabelText('Won: 3')).toBeTruthy();
    expect(screen.getByLabelText('Win rate: 75%')).toBeTruthy();
    expect(screen.getByText('Win streak: 2')).toBeTruthy();
    expect(screen.getByTestId('stats-share-streak')).toBeTruthy();
    expect(screen.getByTestId('stats-pass-and-play')).toBeTruthy();
    expect(screen.getByText('Black won')).toBeTruthy();
  });
});

describe('home stats link', () => {
  it('stays hidden until a game is finished', () => {
    render(<HomeStatsLink />);
    expect(screen.queryByTestId('home-stats-link')).toBeNull();
  });

  it('summarizes the record against the computer', () => {
    mockStats = withGames();
    render(<HomeStatsLink />);
    expect(screen.getByText('Won 3 of 4')).toBeTruthy();
  });

  it('reads the win streak to screen readers, not just the badge', () => {
    mockStats = withGames();
    render(<HomeStatsLink />);
    expect(screen.getByTestId('home-stats-link').props.accessibilityLabel).toContain('Win streak: 2');
  });
});
