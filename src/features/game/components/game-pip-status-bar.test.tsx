import { createInitialState } from '@/lib/game/constants';
import { cleanup, fireEvent, render, screen } from '@/lib/test-utils';

import { GamePipStatusBar } from './game-pip-status-bar';

jest.mock('@/lib/i18n', () => ({
  translate: (key: string) => key,
}));

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the real hook's export name
  useGamePreferences: () => ({
    preferences: {
      showMoveHints: false,
      showDirectionOverlay: false,
      showPointNumbers: false,
    },
  }),
}));

afterEach(cleanup);

describe('gamePipStatusBar', () => {
  it('shows the opening strategy and 167/167 pip counts', () => {
    const state = createInitialState('vs-computer');
    render(<GamePipStatusBar state={state} />);

    expect(screen.getByTestId('strategy-pill')).toBeTruthy();
    expect(screen.getByText('Developing')).toBeTruthy();
    // Both race pip counts render (opening position: 167 each).
    expect(screen.getAllByText('167')).toHaveLength(2);
  });

  it('tapping the strategy pill reveals the one-line tip', () => {
    const state = createInitialState('vs-computer');
    render(<GamePipStatusBar state={state} />);

    expect(screen.queryByText(/Build points/)).toBeNull();
    fireEvent.press(screen.getByTestId('strategy-pill'));
    expect(screen.getByText(/Build points/)).toBeTruthy();
  });

  it('labels the pip counts accessibly per player', () => {
    const state = createInitialState('vs-computer');
    render(<GamePipStatusBar state={state} />);

    expect(screen.getByLabelText('game.review.player_white pip count 167')).toBeTruthy();
    expect(screen.getByLabelText('game.review.player_black pip count 167')).toBeTruthy();
  });
});

describe('gamePipStatusBar game-over', () => {
  it('hides pip counts and centers the winner badge', () => {
    const state = {
      ...createInitialState('vs-computer'),
      phase: 'game-over' as const,
      winner: 'white' as const,
    };
    render(<GamePipStatusBar state={state} />);

    // No strategy pill, no pip counts at game over.
    expect(screen.queryByTestId('strategy-pill')).toBeNull();
    expect(screen.queryByText('167')).toBeNull();
    // Winner badge shows.
    expect(screen.getByText('game.status.you_win')).toBeTruthy();
  });
});
