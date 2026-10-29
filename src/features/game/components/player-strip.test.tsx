import type { GameState } from '@/lib/game';
import { createInitialState } from '@/lib/game/constants';
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
    expect(screen.getByText('game.turn.your_turn')).toBeTruthy();
  });

  it('uses color names in pass-and-play and keeps "<Color>\'s turn" in the accessible label', () => {
    const state = moving('vs-human', 'black');
    render(<PlayerStrip state={state} player="black" />);
    expect(screen.getByLabelText('game.review.player_black. game.turn.black_turn')).toBeTruthy();
  });

  it('only the side to move shows a status', () => {
    const state = moving('vs-computer', 'black');
    expect(playerStripStatus(state, 'white', null)).toBeNull();
    expect(playerStripStatus(state, 'black', null)).toBe('game.turn.black_is_moving');
    expect(playerStripStatus(state, 'black', 'Who goes first?')).toBe('Who goes first?');
  });

  it('shows each side\'s pip count and borne-off checkers accessibly', () => {
    const state = moving('vs-computer', 'white');
    state.borneOff.white = 3;
    render(<PlayerStrip state={state} player="white" />);
    expect(screen.getByTestId('pip-count-white').props.accessibilityLabel)
      .toBe('game.status.pips_a11y {"player":"game.players.you","pips":167,"off":3}');
    expect(screen.getByText('3 game.status.off_short')).toBeTruthy();
  });

  it('puts the strategy chip on the human side and reveals the tip on tap', () => {
    const state = moving('vs-computer', 'white');
    render(
      <>
        <PlayerStrip state={state} player="black" />
        <PlayerStrip state={state} player="white" />
      </>,
    );
    expect(screen.getAllByTestId('strategy-line')).toHaveLength(1);
    expect(screen.getByText('game.strategy.label.developing')).toBeTruthy();

    expect(screen.queryByText('game.strategy.tip.developing')).toBeNull();
    fireEvent.press(screen.getByTestId('strategy-line'));
    expect(screen.getByText('game.strategy.tip.developing')).toBeTruthy();
    fireEvent.press(screen.getByTestId('strategy-explanation-close'));
    expect(screen.getByTestId('strategy-mark')).toBeTruthy();
  });

  it('crowns the winner at game over and drops the strategy chip', () => {
    const state: GameState = { ...createInitialState('vs-computer'), phase: 'game-over', winner: 'white' };
    render(
      <>
        <PlayerStrip state={state} player="black" />
        <PlayerStrip state={state} player="white" />
      </>,
    );
    expect(screen.getByText('game.status.you_win')).toBeTruthy();
    expect(screen.queryByTestId('player-status-black')).toBeNull();
    expect(screen.queryByTestId('strategy-line')).toBeNull();
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
});
