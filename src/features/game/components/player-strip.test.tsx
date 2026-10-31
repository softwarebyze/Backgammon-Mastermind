import type { GameState } from '@/lib/game';
import { createInitialState } from '@/lib/game/constants';
import { createMatch } from '@/lib/game/match';
import { cleanup, fireEvent, render, screen } from '@/lib/test-utils';

import { PlayerStrip } from './player-strip';
import { playerStripStatus } from './player-strip-copy';
import { StrategyMark } from './strategy-icon';

jest.mock('@/lib/i18n', () => ({
  getIsRTL: () => false,
  getLayoutIsRTL: () => false,
  translate: (key: string, params?: Record<string, unknown>) =>
    params ? `${key} ${JSON.stringify(params)}` : key,
}));

afterEach(cleanup);

function moving(mode: GameState['mode'], player: 'white' | 'black'): GameState {
  return { ...createInitialState(mode), phase: 'moving', currentPlayer: player, dice: [3, 1], remainingDice: [3, 1] };
}

/** Both midpoints brought home: each side has a plan, so the chips show. */
function pastOpening(mode: GameState['mode'], player: 'white' | 'black'): GameState {
  const state = moving(mode, player);
  const points = state.points.map(point => ({ ...point }));
  points[13] = { player: null, count: 0 };
  points[3] = { player: 'white', count: 5 };
  points[12] = { player: null, count: 0 };
  points[22] = { player: 'black', count: 5 };
  return { ...state, points };
}

describe('player strip', () => {
  it('names the sides "You" and "Computer" against the computer', () => {
    const state = moving('vs-computer', 'white');
    render(
      <>
        <PlayerStrip state={state} player="black" />
        <PlayerStrip state={state} player="white" />
      </>,
    );
    expect(screen.getByText('game.players.computer')).toBeTruthy();
    expect(screen.getByText('game.players.you')).toBeTruthy();
    expect(screen.getByText('game.players.status_your_turn')).toBeTruthy();
  });

  it('uses color names in pass-and-play, with the name in the accessible label only once', () => {
    const state = moving('vs-human', 'black');
    render(<PlayerStrip state={state} player="black" />);
    expect(screen.getByLabelText('game.review.player_black. game.players.status_your_turn')).toBeTruthy();
  });

  it('only the side to move shows a status, and it never repeats the name', () => {
    const state = moving('vs-computer', 'black');
    expect(playerStripStatus(state, 'white', null)).toBeNull();
    expect(playerStripStatus(state, 'black', null)).toBe('game.players.status_moving');
    expect(playerStripStatus({ ...state, phase: 'rolling' }, 'black', null)).toBe('game.players.status_rolling');
    expect(playerStripStatus(state, 'black', 'Who goes first?')).toBe('Who goes first?');
  });

  it('shows a double on the doubler\'s strip and asks the human to take or pass', () => {
    const state: GameState = { ...createInitialState('vs-computer'), phase: 'rolling', currentPlayer: 'black', match: { ...createMatch(7), pendingOffer: 'black' } };
    expect(playerStripStatus(state, 'black', null)).toBe('game.players.status_doubles {"value":2}');
    expect(playerStripStatus(state, 'white', null)).toBe('game.players.status_take_or_pass');
    const byYou: GameState = { ...state, currentPlayer: 'white', match: { ...state.match!, pendingOffer: 'white' } };
    expect(playerStripStatus(byYou, 'black', null)).toBeNull();
  });

  it('shows each side\'s pip count and borne-off checkers accessibly', () => {
    const state = moving('vs-computer', 'white');
    state.borneOff.white = 3;
    render(<PlayerStrip state={state} player="white" />);
    expect(screen.getByTestId('pip-count-white').props.accessibilityLabel)
      .toBe('game.status.pips_a11y {"player":"game.players.you","pips":167,"off":3}');
    expect(screen.getByText('3 game.status.off_short')).toBeTruthy();
  });

  it('shows no plan during the opening', () => {
    render(<PlayerStrip state={moving('vs-computer', 'white')} player="white" />);
    expect(screen.queryByTestId('strategy-line-white')).toBeNull();
  });

  it('shows each side its own plan, the computer included, and reveals the tip on tap', () => {
    const state = pastOpening('vs-computer', 'white');
    render(
      <>
        <PlayerStrip state={state} player="black" />
        <PlayerStrip state={state} player="white" />
      </>,
    );
    expect(screen.getByTestId('strategy-line-black')).toBeTruthy();
    expect(screen.getByTestId('strategy-line-white')).toBeTruthy();

    fireEvent.press(screen.getByTestId('strategy-line-white'));
    expect(screen.getByTestId('strategy-explanation')).toBeTruthy();
    fireEvent.press(screen.getByTestId('strategy-explanation-close'));
    expect(screen.getByTestId('strategy-mark-white')).toBeTruthy();
  });

  it('names the computer plan without talking to the player as you', () => {
    render(<PlayerStrip state={pastOpening('vs-computer', 'white')} player="black" />);
    fireEvent.press(screen.getByTestId('strategy-line-black'));
    expect(screen.getByText('game.strategy.computer_plan')).toBeTruthy();
    expect(screen.queryByText(/game\.strategy\.tip\./)).toBeNull();
  });

  it('crowns the winner at game over and drops the strategy chip', () => {
    const state: GameState = { ...createInitialState('vs-computer'), phase: 'game-over', winner: 'white' };
    render(
      <>
        <PlayerStrip state={state} player="black" />
        <PlayerStrip state={state} player="white" />
      </>,
    );
    expect(screen.getByText('game.players.status_won')).toBeTruthy();
    expect(screen.queryByTestId('player-status-black')).toBeNull();
    expect(screen.queryByTestId('strategy-line-white')).toBeNull();
    expect(screen.queryByTestId('strategy-line-black')).toBeNull();
  });
});

describe('strategy mark', () => {
  it('shows the plan emoji', () => {
    const { rerender } = render(<StrategyMark strategy="running" size={18} />);
    expect(screen.getByText('🏃')).toBeTruthy();
    rerender(<StrategyMark strategy="blitz" size={18} />);
    expect(screen.getByText('⚔️')).toBeTruthy();
    rerender(<StrategyMark strategy="priming" size={18} />);
    expect(screen.getByText('🧱')).toBeTruthy();
    rerender(<StrategyMark strategy="holding" size={18} />);
    expect(screen.getByText('⚓')).toBeTruthy();
    rerender(<StrategyMark strategy="backgame" size={18} />);
    expect(screen.getByText('🕸️')).toBeTruthy();
  });

  it('gives the landscape side rail\'s room to the name: mark alone when narrow, no plan when tight', () => {
    const state = pastOpening('vs-computer', 'white');
    const layout = (width: number) => ({ nativeEvent: { layout: { width, height: 52, x: 0, y: 0 } } });
    render(<PlayerStrip state={state} player="white" />);
    fireEvent(screen.getByTestId('player-strip-white'), 'layout', layout(300));
    expect(screen.getByTestId('strategy-mark-white')).toBeTruthy();
    fireEvent(screen.getByTestId('player-strip-white'), 'layout', layout(200));
    expect(screen.queryByTestId('strategy-line-white')).toBeNull();
    expect(screen.getByText('game.players.you')).toBeTruthy();
  });
});
