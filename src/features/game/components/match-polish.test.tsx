import { useReducedMotion, withTiming } from 'react-native-reanimated';
import { GameScreenControls } from '@/features/game/game-screen-controls';
import { createMatchGame } from '@/lib/game/match';
import { cleanup, fireEvent, screen, setup } from '@/lib/test-utils';
import { MatchControls } from './match-controls';
import { MatchCube } from './match-cube';
import { MatchScorecard } from './match-scorecard';
import { MatchStatusBar } from './match-status-bar';
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

it('renders compact scores and an accessible summary', () => {
  const state = createMatchGame(3);
  const view = setup(<MatchStatusBar state={state} />);
  expect(screen.getByTestId('match-score')).toHaveProp('accessibilityLabel', 'White 0  –  Black 0');
  expect(screen.getByTestId('match-score')).toHaveProp('accessible', true);
  expect(screen.getByTestId('match-score')).toHaveProp('accessibilityHint', 'White: 167 pips, 0 of 15 borne off. Black: 167 pips, 0 of 15 borne off');
  expect(screen.getByTestId('match-target')).toBeOnTheScreen();
  expect(screen.queryByTestId('match-cube')).toBeNull();
  expect(screen.queryByTestId('pip-count-white')).toBeNull();
  view.rerender(<MatchCube cube={state.match!.cube} />);
  expect(screen.getByText('64')).toBeOnTheScreen();
  view.rerender(<MatchCube cube={state.match!.cube} pendingOffer="white" />);
  expect(screen.getByTestId('match-cube-pending-white')).toBeOnTheScreen();
  expect(screen.getByText('2')).toBeOnTheScreen();
  expect(screen.getByTestId('match-cube')).toHaveProp('accessibilityLabel', 'White offers a double to 2. Black: accept or drop. Dropping concedes 1.');
  view.rerender(<MatchCube cube={{ value: 2, owner: 'black' }} />);
  expect(screen.getByTestId('match-cube-owner-black')).toBeOnTheScreen();
  expect(screen.getByTestId('match-cube')).toHaveProp('accessibilityLabel', 'Cube 2 · Black');
});

it('updates score without animation and suppresses confetti with Reduced Motion', () => {
  jest.mocked(useReducedMotion).mockReturnValue(true);
  const view = setup(<MatchScorecard player="white" score={0} active />);
  view.rerender(<MatchScorecard player="white" score={2} active />);
  expect(screen.getByTestId('match-score-white')).toHaveTextContent('2');
  expect(withTiming).not.toHaveBeenCalled();
  view.rerender(<WinConfettiOverlay burstKey={1} />);
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
  expect(screen.getByTestId('game-action-caption')).toHaveTextContent(/White offers a double/);
  expect(screen.queryByText(/hints and tutor are off/)).toBeNull();
});
