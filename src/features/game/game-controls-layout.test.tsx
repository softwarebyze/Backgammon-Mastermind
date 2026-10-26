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
  it('centers Swap under the dice in a slot that keeps its height when Swap or Confirm comes and goes', () => {
    const { rerender } = setup(controls([3, 1]));
    const tray = screen.getByTestId('game-dice-tray');
    expect(tray).toHaveStyle({ flexDirection: 'column', alignItems: 'center' });
    const slot = within(tray).getByTestId('swap-dice-slot');
    expect(slot).toHaveStyle({ height: 18, alignItems: 'center' });
    expect(within(slot).getByTestId('swap-dice-button')).toBeOnTheScreen();
    expect(screen.getByTestId('game-action-slot')).toHaveStyle({ height: 52 });

    rerender(controls([]));
    expect(screen.getByTestId('confirm-move-button')).toBeOnTheScreen();
    expect(screen.queryByTestId('swap-dice-button')).toBeNull();
    expect(screen.getByTestId('swap-dice-slot')).toHaveStyle({ height: 18 });
    expect(screen.getByTestId('game-action-slot')).toHaveStyle({ height: 52 });

    rerender(controls([1]));
    expect(screen.queryByTestId('confirm-move-button')).toBeNull();
    expect(screen.queryByTestId('swap-dice-button')).toBeNull();
    expect(screen.getByTestId('swap-dice-slot')).toHaveStyle({ height: 18 });
    expect(screen.getByTestId('game-action-slot')).toHaveStyle({ height: 52 });
  });

  it('stacks Swap under the dice in the narrow landscape rail too', () => {
    setup(controls([3, 1], true));
    const tray = screen.getByTestId('game-dice-tray');
    expect(tray).toHaveStyle({ flexDirection: 'column' });
    expect(within(within(tray).getByTestId('swap-dice-slot')).getByTestId('swap-dice-button')).toBeOnTheScreen();
  });
});
