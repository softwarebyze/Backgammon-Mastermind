import { createPositionState } from '@/lib/game';
import { act, renderHook } from '@/lib/test-utils';
import { useBoardPlayInput } from './use-board-play-input';
import { useDiceOrder } from './use-dice-order';
import { useGameProviderValue } from './use-game-provider-value';

jest.mock('@/lib/game-preferences/storage', () => {
  const actual = jest.requireActual('@/lib/game-preferences/storage');
  const { DEFAULT_GAME_PREFERENCES } = jest.requireActual('@/lib/game-preferences/types');
  return { ...actual, loadGamePreferences: () => ({ ...DEFAULT_GAME_PREFERENCES, confirmMove: true, autoRoll: false, autoMoveWhenForced: false, moveInDiceOrder: true }) };
});
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning' },
}));

function useOrderedGame() {
  const game = useGameProviderValue(true);
  const order = useDiceOrder(game.state);
  const input = useBoardPlayInput({ state: game.state, actions: game, isAnimating: game.isAnimating, isHumanTurn: true, moveInDiceOrder: true, diceOrderReversed: order.reversedRef });
  return { game, order, input };
}

type OrderedGame = ReturnType<typeof useOrderedGame>;
function finish(result: { current: OrderedGame }) {
  act(() => result.current.game.moveAnimation?.onFinish());
}

it('plays swapped one-tap moves through real provider Undo/Redo and Confirm, then resets order', () => {
  const { result } = renderHook(useOrderedGame);
  act(() => result.current.game.startFromPosition(createPositionState({ useStandardSetup: true, dice: [3, 1], mode: 'vs-human' })));
  act(() => result.current.order.swapDice());
  act(() => result.current.input.handlePointPress(8));
  finish(result);
  expect(result.current.game.state?.points[7].count).toBe(1);
  expect(result.current.game.state?.remainingDice).toEqual([3]);
  act(() => result.current.game.doUndo());
  finish(result);
  expect(result.current.game.state?.remainingDice).toEqual([3, 1]);
  expect(result.current.order.displayedDice).toEqual([1, 3]);
  act(() => result.current.game.doRedo());
  finish(result);
  expect(result.current.game.state?.remainingDice).toEqual([3]);
  expect(result.current.order.displayedDice).toEqual([1, 3]);
  act(() => result.current.input.handlePointPress(13));
  finish(result);
  expect(result.current.game.state?.remainingDice).toEqual([]);
  expect(result.current.game.state?.currentPlayer).toBe('white');
  act(() => result.current.game.doPassTurn());
  expect(result.current.game.state?.currentPlayer).toBe('black');
  expect(result.current.order.reversedRef.current).toBe(false);
  act(() => result.current.game.resetGame());
  expect(result.current.game.state?.phase).toBe('opening-roll');
  expect(result.current.order.reversedRef.current).toBe(false);
});
