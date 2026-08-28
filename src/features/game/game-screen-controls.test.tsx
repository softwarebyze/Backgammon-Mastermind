import { createInitialState } from '@/lib/game/constants';
import { cleanup, screen, setup } from '@/lib/test-utils';

import { GameScreenControls } from './game-screen-controls';

jest.mock('@/lib/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSelection: jest.fn(),
}));

afterEach(cleanup);

function renderComputerControls(phase: 'rolling' | 'moving') {
  const state = createInitialState('vs-computer');
  state.phase = phase;
  state.currentPlayer = 'black';
  if (phase === 'moving') {
    state.dice = [2, 4];
    state.remainingDice = [2, 4];
  }
  return setup(
    <GameScreenControls
      state={state}
      liveDiceState={state}
      isHumanTurn={false}
      isComputerTurn
      onRoll={jest.fn()}
      onReset={jest.fn()}
      onSkipComputer={jest.fn()}
    />,
  );
}

describe('game screen controls', () => {
  it('does not render two moving strings while the computer is moving', () => {
    renderComputerControls('moving');

    expect(screen.queryAllByText(/moving/i)).toHaveLength(0);
    expect(screen.queryByText('Black is moving…')).toBeNull();
    expect(screen.getByTestId('skip-computer-button')).toBeTruthy();
    expect(screen.getByText('Tap to skip wait')).toBeTruthy();
  });

  it('does not render two rolling strings while the computer is rolling', () => {
    renderComputerControls('rolling');

    expect(screen.queryAllByText(/rolling/i)).toHaveLength(0);
    expect(screen.queryByText('Black is rolling…')).toBeNull();
    expect(screen.getByTestId('skip-computer-button')).toBeTruthy();
  });
});
