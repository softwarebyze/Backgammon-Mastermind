import { within } from '@testing-library/react-native';
import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { createInitialState } from '@/lib/game/constants';
import { cleanup, screen, setup } from '@/lib/test-utils';

import { GameScreenControls } from './game-screen-controls';

jest.mock('./components/hint-button', () => ({ HintButton: () => null }));
jest.mock('@expo/vector-icons/Feather', () => () => null);
const mockPrefs = { ...DEFAULT_GAME_PREFERENCES, moveInDiceOrder: true, confirmMove: true };
jest.mock('@/lib/game-preferences/use-game-preferences', () => ({
  // eslint-disable-next-line react/no-unnecessary-use-prefix -- real hook export
  useGamePreferences: () => ({ preferences: mockPrefs }),
}));
afterEach(cleanup);

function controls(remainingDice: number[], compact = false) {
  const state = { ...createInitialState('vs-human'), phase: 'moving' as const, dice: [3, 1] as [number, number], remainingDice };
  return (
    <GameScreenControls
      state={state}
      liveDiceState={state}
      isHumanTurn
      isComputerTurn={false}
      moveLogLength={2 - remainingDice.length}
      onRoll={jest.fn()}
      onReset={jest.fn()}
      onConfirmMove={jest.fn()}
      onUndoMove={jest.fn()}
      canUndoMove
      compact={compact}
    />
  );
}

describe('dice-order controls composition', () => {
  it('shares the portrait dice row rather than taking board height when Confirm is hidden', () => {
    const { rerender } = setup(controls([3, 1]));
    const tray = screen.getByTestId('game-dice-tray');
    expect(tray).toHaveStyle({ flexDirection: 'row', alignItems: 'center' });
    expect(within(tray).getByTestId('dice-display')).toBeOnTheScreen();
    expect(within(tray).getByTestId('swap-dice-button')).toBeOnTheScreen();
    expect(screen.getByTestId('game-action-slot')).toHaveStyle({ height: 52 });

    rerender(controls([]));
    expect(screen.getByTestId('confirm-move-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('swap-dice-button')).toBeNull();
    expect(screen.getByTestId('game-dice-tray')).toHaveStyle({ flexDirection: 'row' });
    expect(screen.getByTestId('game-action-slot')).toHaveStyle({ height: 52 });

    rerender(controls([1]));
    expect(screen.queryByTestId('confirm-move-button')).toBeNull();
    expect(within(screen.getByTestId('game-dice-tray')).getByTestId('swap-dice-button')).toBeDisabled();
    expect(screen.getByTestId('game-action-slot')).toHaveStyle({ height: 52 });
  });

  it('stacks the tray in the narrow landscape rail, which scrolls beside the board', () => {
    setup(controls([3, 1], true));
    expect(screen.getByTestId('game-dice-tray')).toHaveStyle({ flexDirection: 'column' });
    expect(within(screen.getByTestId('game-dice-tray')).getByTestId('swap-dice-button')).toBeOnTheScreen();
  });
});
