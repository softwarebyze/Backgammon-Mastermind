import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { createInitialState } from '@/lib/game/constants';
import { cleanup, fireEvent, screen, setup } from '@/lib/test-utils';

import { GameScreenControls } from './game-screen-controls';

jest.mock('@/lib/haptics', () => ({
  hapticLight: jest.fn(),
  hapticSelection: jest.fn(),
}));

const mockPrefs = { ...DEFAULT_GAME_PREFERENCES, confirmMove: false };

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- mock must keep the real hook's export name
  useGamePreferences: () => ({ preferences: mockPrefs }),
}));

afterEach(() => {
  cleanup();
  Object.assign(mockPrefs, { ...DEFAULT_GAME_PREFERENCES, confirmMove: false });
});

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
      moveLogLength={0}
      onRoll={jest.fn()}
      onReset={jest.fn()}
    />,
  );
}

function awaitingConfirmState() {
  const state = createInitialState('vs-human');
  state.phase = 'moving';
  state.dice = [3, 5];
  state.remainingDice = [];
  return state;
}

describe('game screen controls', () => {
  it('does not render two moving strings while the computer is moving', () => {
    renderComputerControls('moving');

    expect(screen.queryAllByText(/moving/i)).toHaveLength(0);
    expect(screen.queryByText('Black is moving…')).toBeNull();
    expect(screen.queryByText('Tap to skip wait')).toBeNull();
    expect(screen.queryByTestId('skip-computer-button')).toBeNull();
  });

  it('does not render two rolling strings while the computer is rolling', () => {
    renderComputerControls('rolling');

    expect(screen.queryAllByText(/rolling/i)).toHaveLength(0);
    expect(screen.queryByText('Black is rolling…')).toBeNull();
    expect(screen.queryByText('Tap to skip wait')).toBeNull();
  });
});

describe('confirm move bar', () => {
  it('shows Confirm move and Undo when confirm is on and dice are spent', () => {
    mockPrefs.confirmMove = true;
    const state = awaitingConfirmState();
    const onConfirmMove = jest.fn();
    const onUndoMove = jest.fn();

    setup(
      <GameScreenControls
        state={state}
        liveDiceState={state}
        isHumanTurn
        isComputerTurn={false}
        moveLogLength={2}
        onRoll={jest.fn()}
        onReset={jest.fn()}
        onConfirmMove={onConfirmMove}
        onUndoMove={onUndoMove}
        canUndoMove
      />,
    );

    expect(screen.getByTestId('confirm-move-button')).toBeOnTheScreen();
    expect(screen.getByTestId('undo-move-button')).toBeOnTheScreen();
    fireEvent.press(screen.getByTestId('confirm-move-button'));
    expect(onConfirmMove).toHaveBeenCalledTimes(1);
    fireEvent.press(screen.getByTestId('undo-move-button'));
    expect(onUndoMove).toHaveBeenCalledTimes(1);
  });

  it('shows the bar after a blocked roll when confirm is on', () => {
    mockPrefs.confirmMove = true;
    const state = createInitialState('vs-human');
    state.phase = 'no-move';
    state.dice = [6, 6];
    state.remainingDice = [6, 6, 6, 6];

    setup(
      <GameScreenControls
        state={state}
        liveDiceState={state}
        isHumanTurn
        isComputerTurn={false}
        moveLogLength={0}
        onRoll={jest.fn()}
        onReset={jest.fn()}
        onConfirmMove={jest.fn()}
        onUndoMove={jest.fn()}
        canUndoMove={false}
      />,
    );

    expect(screen.getByTestId('confirm-move-button')).toBeOnTheScreen();
    expect(screen.queryByText('No legal moves…')).toBeNull();
  });

  it('does not render the confirm bar when confirm is off', () => {
    mockPrefs.confirmMove = false;
    const state = awaitingConfirmState();

    setup(
      <GameScreenControls
        state={state}
        liveDiceState={state}
        isHumanTurn
        isComputerTurn={false}
        moveLogLength={2}
        onRoll={jest.fn()}
        onReset={jest.fn()}
        onConfirmMove={jest.fn()}
        onUndoMove={jest.fn()}
        canUndoMove
      />,
    );

    expect(screen.queryByTestId('confirm-move-button')).toBeNull();
    expect(screen.queryByTestId('undo-move-button')).toBeNull();
  });

  it('never shows the confirm bar on a computer turn', () => {
    mockPrefs.confirmMove = true;
    const state = createInitialState('vs-computer');
    state.currentPlayer = 'black';
    state.phase = 'moving';
    state.dice = [3, 5];
    state.remainingDice = [];

    setup(
      <GameScreenControls
        state={state}
        liveDiceState={state}
        isHumanTurn={false}
        isComputerTurn
        moveLogLength={2}
        onRoll={jest.fn()}
        onReset={jest.fn()}
        onConfirmMove={jest.fn()}
        onUndoMove={jest.fn()}
        canUndoMove
      />,
    );

    expect(screen.queryByTestId('confirm-move-button')).toBeNull();
  });
});
