import { within } from '@testing-library/react-native';
import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { createInitialState } from '@/lib/game/constants';
import { cleanup, fireEvent, screen, setup } from '@/lib/test-utils';

import { GameScreenControls } from './game-screen-controls';

jest.mock('./components/hint-button', () => ({ HintButton: () => null }));
jest.mock('@expo/vector-icons/Feather', () => () => null);

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

/* eslint-disable max-lines-per-function -- grouped confirm-bar scenarios */
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

  it('passes a held turn when confirm is turned off mid-hold', () => {
    mockPrefs.confirmMove = true;
    const state = awaitingConfirmState();
    const onConfirmMove = jest.fn();

    const view = setup(
      <GameScreenControls
        state={state}
        liveDiceState={state}
        isHumanTurn
        isComputerTurn={false}
        moveLogLength={2}
        onRoll={jest.fn()}
        onReset={jest.fn()}
        onConfirmMove={onConfirmMove}
        onUndoMove={jest.fn()}
        canUndoMove
      />,
    );

    expect(screen.getByTestId('confirm-move-button')).toBeOnTheScreen();
    mockPrefs.confirmMove = false;
    view.rerender(
      <GameScreenControls
        state={state}
        liveDiceState={state}
        isHumanTurn
        isComputerTurn={false}
        moveLogLength={2}
        onRoll={jest.fn()}
        onReset={jest.fn()}
        onConfirmMove={onConfirmMove}
        onUndoMove={jest.fn()}
        canUndoMove
      />,
    );
    expect(onConfirmMove).toHaveBeenCalledTimes(1);
    expect(screen.queryByTestId('confirm-move-button')).toBeNull();
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

describe('dice order swap control', () => {
  function swapHarness(dice: [number, number], remainingDice: number[], extra: { isHumanTurn?: boolean } = {}) {
    mockPrefs.moveInDiceOrder = true;
    const state = { ...awaitingConfirmState(), dice, remainingDice };
    const onSwapDice = jest.fn();
    setup(<GameScreenControls state={state} liveDiceState={state} displayedDice={[dice[1], dice[0]]} onSwapDice={onSwapDice} isHumanTurn={extra.isHumanTurn ?? true} isComputerTurn={!(extra.isHumanTurn ?? true)} moveLogLength={0} onRoll={jest.fn()} onReset={jest.fn()} />);
    return onSwapDice;
  }

  it('makes the dice and the Swap label under them one labelled button', () => {
    const onSwapDice = swapHarness([3, 1], [3, 1]);
    const dice = screen.getByRole('button', { name: 'Dice: 1, then 3' });
    expect(within(dice).getByTestId('swap-dice-button')).toBeOnTheScreen();
    expect(within(dice).getByTestId('dice-display')).toBeOnTheScreen();
    expect(screen.getAllByRole('button').filter(button => within(button).queryByTestId('swap-dice-button'))).toEqual([dice]);
    fireEvent.press(screen.getByTestId('swap-dice-button'));
    expect(onSwapDice).toHaveBeenCalledTimes(1);
    expect(dice).toHaveProp('accessibilityHint', 'Swaps which die is played first.');
    expect(dice).toHaveProp('focusable', true);
    fireEvent.press(dice);
    expect(onSwapDice).toHaveBeenCalledTimes(2);
  });

  it.each([
    { name: 'doubles', dice: [2, 2] as [number, number], remainingDice: [2, 2, 2, 2] },
    { name: 'one die left', dice: [3, 1] as [number, number], remainingDice: [1] },
  ])('hides Swap and makes the dice inert on $name', ({ dice, remainingDice }) => {
    const onSwapDice = swapHarness(dice, remainingDice);
    expect(screen.queryByTestId('swap-dice-button')).toBeNull();
    expect(screen.getByTestId('swap-dice-slot')).toBeOnTheScreen();
    expect(screen.queryByRole('button', { name: /^Dice:/ })).toBeNull();
    const target = screen.getByTestId('dice-swap-target');
    expect(target).toHaveProp('pointerEvents', 'none');
    fireEvent.press(target);
    expect(onSwapDice).not.toHaveBeenCalled();
  });

  it('keeps the dice inert on the computer\'s turn', () => {
    swapHarness([3, 1], [3, 1], { isHumanTurn: false });
    expect(screen.queryByTestId('swap-dice-button')).toBeNull();
    expect(screen.getByTestId('dice-swap-target')).toHaveProp('pointerEvents', 'none');
  });

  it('keeps swap and its reserved slot absent with the default preference', () => {
    const state = { ...awaitingConfirmState(), remainingDice: [3, 5] };
    setup(<GameScreenControls state={state} liveDiceState={state} isHumanTurn isComputerTurn={false} moveLogLength={0} onRoll={jest.fn()} onReset={jest.fn()} />);
    expect(screen.queryByTestId('swap-dice-button')).toBeNull();
    expect(screen.queryByTestId('swap-dice-slot')).toBeNull();
    expect(screen.getByTestId('dice-swap-target')).toHaveProp('pointerEvents', 'none');
  });
});
