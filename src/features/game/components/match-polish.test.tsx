import { useReducedMotion, withTiming } from 'react-native-reanimated';
import { GameScreenControls } from '@/features/game/game-screen-controls';
import { GameToolbar } from '@/features/game/game-toolbar';
import { createMatchGame } from '@/lib/game/match';
import { cleanup, fireEvent, screen, setup } from '@/lib/test-utils';
import { MatchControls } from './match-controls';
import { MatchCube } from './match-cube';
import { PlayerStrip } from './player-strip';
import { WinConfettiOverlay } from './win-confetti-overlay';

const mockAction = jest.fn();
const mockContext = { matchAction: mockAction, isAnimating: false, canRedo: false };
jest.mock('@/features/game/use-game', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock preserves public hook name
  useGame: () => mockContext,
}));
afterEach(() => {
  cleanup();
  jest.clearAllMocks();
  jest.mocked(useReducedMotion).mockReturnValue(false);
  mockContext.isAnimating = false;
});

function controls(pendingOffer: 'white' | 'black' | null, currentPlayer: 'white' | 'black') {
  const state = createMatchGame(3, 'vs-computer');
  state.phase = 'rolling';
  state.currentPlayer = currentPlayer;
  state.match!.pendingOffer = pendingOffer;
  setup(<MatchControls state={state} onRoll={jest.fn()} onReset={jest.fn()} isHumanTurn={currentPlayer === 'white'} isComputerTurn={currentPlayer === 'black'} />);
}

it.each([['black', null], ['white', 'white']] as const)('hides human actions on %s turn with %s pending', (player, pending) => {
  controls(pending, player);
  expect(screen.queryByTestId('roll-dice-button')).toBeNull();
  expect(screen.queryByTestId('match-double')).toBeNull();
  expect(screen.queryByTestId('match-accept')).toBeNull();
  expect(screen.queryByTestId('match-drop')).toBeNull();
});

it('offers accept/drop for the human answering Black, without a roll button', () => {
  controls('black', 'black');
  expect(screen.queryByTestId('roll-dice-button')).toBeNull();
  fireEvent.press(screen.getByTestId('match-accept'));
  expect(mockAction).toHaveBeenCalledWith('accept');
  fireEvent.press(screen.getByTestId('match-drop'));
  expect(mockAction).toHaveBeenCalledWith('drop');
});

it('blocks cube decisions during animation', () => {
  mockContext.isAnimating = true;
  controls('black', 'black');
  expect(screen.getByTestId('match-accept')).toBeDisabled();
  fireEvent.press(screen.getByTestId('match-accept'));
  expect(mockAction).not.toHaveBeenCalled();
});

it('names the match in the toolbar and reads out the score', () => {
  const state = createMatchGame(3);
  state.match!.score = { white: 2, black: 0 };
  const noop = jest.fn();
  const view = setup(<GameToolbar canUndo={false} canRedo={false} onUndo={noop} onRedo={noop} onOptions={noop} onReset={noop} onHome={noop} match={state.match} />);
  expect(screen.getByTestId('match-score')).toHaveTextContent('Match to 3 · Game 1');
  expect(screen.getByTestId('match-score')).toHaveProp('accessibilityLabel', 'Match to 3 · Game 1. White 2  –  Black 0');
  view.rerender(<GameToolbar canUndo={false} canRedo={false} onUndo={noop} onRedo={noop} onOptions={noop} onReset={noop} onHome={noop} match={{ ...state.match!, crawford: true }} />);
  expect(screen.getByTestId('match-score')).toHaveTextContent('Crawford game · no doubling');
  view.rerender(<GameToolbar canUndo={false} canRedo={false} onUndo={noop} onRedo={noop} onOptions={noop} onReset={noop} onHome={noop} />);
  expect(screen.queryByTestId('match-score')).toBeNull();
});

it('draws the cube for each owner and a pending offer', () => {
  const state = createMatchGame(3);
  const view = setup(<MatchCube cube={state.match!.cube} />);
  expect(screen.getByText('64')).toBeOnTheScreen();
  view.rerender(<MatchCube cube={state.match!.cube} />);
  expect(screen.getByText('64')).toBeOnTheScreen();
  view.rerender(<MatchCube cube={state.match!.cube} pendingOffer="white" />);
  expect(screen.getByTestId('match-cube-pending-white')).toBeOnTheScreen();
  expect(screen.getByText('2')).toBeOnTheScreen();
  expect(screen.getByTestId('match-cube')).toHaveProp('accessibilityLabel', 'White doubles to 2. Black: take or pass? Passing gives up 1.');
  view.rerender(<MatchCube cube={{ value: 2, owner: 'black' }} />);
  expect(screen.getByTestId('match-cube-owner-black')).toBeOnTheScreen();
  expect(screen.getByTestId('match-cube')).toHaveProp('accessibilityLabel', 'Cube 2 · Black');
});

it('suppresses confetti with Reduced Motion', () => {
  jest.mocked(useReducedMotion).mockReturnValue(true);
  setup(<WinConfettiOverlay burstKey={1} />);
  expect(withTiming).not.toHaveBeenCalled();
  expect(screen.queryByTestId('win-confetti')).toBeNull();
});

it('reserves the same compact controls footprint across every match phase', () => {
  const state = createMatchGame(3);
  const render = (phase: typeof state.phase, pendingOffer: 'white' | null = null) => (
    <GameScreenControls
      state={{ ...state, phase, match: { ...state.match!, pendingOffer } }}
      liveDiceState={state}
      isHumanTurn
      isComputerTurn={false}
      moveLogLength={0}
      onRoll={jest.fn()}
      onReset={jest.fn()}
    />
  );
  const view = setup(render('opening-roll'));
  for (const phase of ['opening-roll', 'rolling', 'moving', 'no-move', 'game-over'] as const) {
    view.rerender(render(phase));
    expect(screen.getByTestId('game-controls')).toHaveStyle({ paddingTop: 4, paddingBottom: 4 });
    expect(screen.getByTestId('game-action-slot')).toHaveStyle({ height: 52 });
    expect(screen.getByTestId('game-dice-tray')).toHaveStyle({ minHeight: 44, marginBottom: 4 });
    expect(screen.getByTestId('game-action-caption')).toHaveStyle({ height: 32, marginTop: 4 });
  }
  view.rerender(render('rolling', 'white'));
  expect(screen.getByTestId('game-action-slot')).toHaveStyle({ height: 52 });
  expect(screen.getByTestId('game-action-caption')).toHaveStyle({ height: 32 });
  expect(screen.getByTestId('game-action-caption')).toHaveTextContent(/White doubles to 2/);
  expect(screen.queryByText(/hints and tutor are off/)).toBeNull();
});

it.each(['white', 'black'] as const)('shows the %s match score in the player strip', (player) => {
  const state = createMatchGame(5);
  state.match!.score = { white: 2, black: 1 };
  setup(<PlayerStrip state={state} player={player} />);
  const score = screen.getByTestId(`match-score-${player}`);
  expect(score).toHaveTextContent(`${state.match!.score[player]}to 5`);
  expect(score).toHaveProp('accessibilityLabel', `${state.match!.score[player]} of 5 points`);
});

it('shows the match result under the board once a game is won', () => {
  const state = createMatchGame(3);
  const won = { ...state, phase: 'game-over' as const, winner: 'white' as const, match: { ...state.match!, score: { white: 3, black: 0 }, winner: 'white' as const, result: { winner: 'white' as const, points: 1, kind: 'single' as const } } };
  setup(<GameScreenControls state={won} liveDiceState={won} isHumanTurn isComputerTurn={false} moveLogLength={4} onRoll={jest.fn()} onReset={jest.fn()} />);
  expect(screen.getByTestId('game-action-caption')).toHaveTextContent('White wins the match · +1');
});
