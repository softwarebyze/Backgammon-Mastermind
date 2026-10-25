import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { GameState } from '@/lib/game';
import { getCheckerAnchor } from '@/features/game/board-point-layout';
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
jest.mock('posthog-react-native', () => ({ usePostHog: jest.fn(() => ({ capture: jest.fn() })) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning' },
}));

function useOrderedGame(concurrentMoves = true) {
  const game = useGameProviderValue(true);
  const order = useDiceOrder(game.state);
  const input = useBoardPlayInput({ state: game.state, actions: game, isAnimating: game.isAnimating && (!game.moveAnimation?.committed || !!game.moveAnimation.inputBlocked), concurrentMoves, isHumanTurn: true, moveInDiceOrder: true, diceOrderReversed: order.reversedRef });
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

// Board-local geometry exercises the actual drag hit testing, not a mocked resolver.
const dims: BoardDimensions = {
  boardWidth: 666,
  boardHeight: 332,
  boardFrameWidth: 4,
  boardOuterWidth: 674,
  boardOuterHeight: 340,
  colWidth: 50,
  checkerSize: 32,
  pointHeight: 160,
  barWidth: 28,
  bearOffWidth: 38,
  middleHeight: 12,
};

function setup(position = createPositionState({ useStandardSetup: true, dice: [3, 1], mode: 'vs-human' }), reversed = false, concurrentMoves = true) {
  const view = renderHook(() => useOrderedGame(concurrentMoves));
  act(() => view.result.current.game.startFromPosition(position));
  act(() => view.result.current.input.setBoardDimensions(dims));
  if (reversed) {
    act(() => view.result.current.order.swapDice());
  }
  return view;
}

function settle(result: { current: OrderedGame }) {
  let attempts = 0;
  while (result.current.game.moveAnimation && attempts++ < 10) {
    const animation = result.current.game.moveAnimation;
    act(() => (animation.parallel ?? [animation]).forEach(frame => frame.onFinish()));
  }
  expect(result.current.game.moveAnimation).toBeNull();
}

function startDrag(result: { current: OrderedGame }, from: number) {
  const anchor = getCheckerAnchor({ pointIndex: from, dims, player: 'white' });
  act(() => result.current.input.handleDragAttempt(from));
  // Dice-order touch-down must not make the checker tap spend a die.
  expect(result.current.game.state?.selectedPoint).toBeNull();
  act(() => result.current.input.handleDragStart(from, anchor.x, anchor.y));
}

function boardSnapshot(state: GameState | null) {
  return state && { points: state.points, bar: state.bar, borneOff: state.borneOff, dice: state.dice, remainingDice: state.remainingDice, currentPlayer: state.currentPlayer, phase: state.phase };
}

describe.each([false, true])('dice-order real drag input, swapped=%s', (reversed) => {
  it.each([
    { to: 5, remaining: [1], die: 3 },
    { to: 7, remaining: [3], die: 1 },
  ])('drags using die $die regardless of the leading displayed die', ({ to, remaining }) => {
    const { result } = setup(undefined, reversed);
    startDrag(result, 8);
    expect(result.current.input.dragFrom).toBe(8);
    expect(result.current.game.state?.selectedPoint).toBe(8);
    expect(result.current.game.state?.legalMovesForSelected.map(move => move.to).sort()).toEqual([5, 7]);
    const target = getCheckerAnchor({ pointIndex: to, dims });
    act(() => result.current.input.handleDragMove(target.x, target.y));
    expect(result.current.input.previewTarget).toBe(to);
    expect(result.current.game.state?.remainingDice).toEqual([3, 1]);
    act(() => result.current.input.handleDragEnd(target.x, target.y));
    expect(result.current.input.dragFrom).toBeNull();
    expect(result.current.input.previewTarget).toBeNull();
    settle(result);
    expect(result.current.game.state?.points[8].count).toBe(2);
    expect(result.current.game.state?.points[to]).toEqual({ player: 'white', count: 1 });
    expect(result.current.game.state?.remainingDice).toEqual(remaining);
    expect(result.current.game.moveLog).toMatchObject([{ from: 8, to, after: { remainingDice: remaining } }]);
    expect(result.current.order.displayedDice).toEqual(reversed ? [1, 3] : [3, 1]);
    act(() => result.current.game.doUndo());
    settle(result);
    expect(result.current.game.state?.points[8].count).toBe(3);
    expect(result.current.game.state?.points[to].count).toBe(0);
    expect(result.current.game.state?.remainingDice).toEqual([3, 1]);
    act(() => result.current.game.doRedo());
    settle(result);
    expect(result.current.game.state?.remainingDice).toEqual(remaining);
    expect(result.current.game.state?.points[to].count).toBe(1);
  });

  it('previews and plays a compound drop through both dice', () => {
    const { result } = setup(undefined, reversed);
    startDrag(result, 8);
    const target = getCheckerAnchor({ pointIndex: 4, dims });
    act(() => result.current.input.handleDragMove(target.x, target.y));
    expect(result.current.input.previewTarget).toBe(4);
    act(() => result.current.input.handleDragEnd(target.x, target.y));
    settle(result);
    expect(result.current.game.state?.points[8].count).toBe(2);
    expect(result.current.game.state?.points[4]).toEqual({ player: 'white', count: 1 });
    expect(result.current.game.state?.points[5].count).toBe(0);
    expect(result.current.game.state?.points[7].count).toBe(0);
    expect(result.current.game.state?.remainingDice).toEqual([]);
    // Display order affects taps, never the legal path chosen by a drag.
    expect(result.current.game.moveLog.map(move => [move.from, move.to, move.after?.remainingDice])).toEqual([[8, 5, [1]], [5, 4, []]]);
  });

  it.each(['outside', 'source', 'blocked'] as const)('rejects a drop on %s and clears all drag highlights without spending dice', (where) => {
    const { result } = setup(undefined, reversed);
    const before = boardSnapshot(result.current.game.state);
    startDrag(result, 8);
    const legal = getCheckerAnchor({ pointIndex: 5, dims });
    act(() => result.current.input.handleDragMove(legal.x, legal.y));
    expect(result.current.input.previewTarget).toBe(5);
    const target = where === 'outside' ? { x: -500, y: -500 } : getCheckerAnchor({ pointIndex: where === 'blocked' ? 19 : 8, dims });
    act(() => result.current.input.handleDragMove(target.x, target.y));
    expect(result.current.input.previewTarget).toBeNull();
    act(() => result.current.input.handleDragEnd(target.x, target.y));
    expect(boardSnapshot(result.current.game.state)).toEqual(before);
    expect(result.current.game.state?.selectedPoint).toBeNull();
    expect(result.current.game.state?.legalMovesForSelected).toEqual([]);
    expect(result.current.input.dragFrom).toBeNull();
    expect(result.current.input.previewTarget).toBeNull();
    expect(result.current.game.moveLog).toEqual([]);
    expect(result.current.game.canUndo).toBe(false);
    expect(result.current.game.moveAnimation).toBeNull();
  });
});

it.each([false, true])('enforces bar priority and hits only a blot with swapped=%s', (reversed) => {
  const position = createPositionState({
    mode: 'vs-human',
    dice: [3, 1],
    bar: { white: 1 },
    placements: [
      { point: 8, player: 'white', count: 14 },
      { point: 24, player: 'black', count: 2 },
      { point: 22, player: 'black', count: 1 },
      { point: 19, player: 'black', count: 12 },
    ],
  });
  const { result } = setup(position, reversed);
  const before = boardSnapshot(result.current.game.state);
  act(() => result.current.input.handlePointPress(8));
  act(() => result.current.input.handleDragStart(8, 0, 0));
  expect(result.current.input.dragFrom).toBeNull();
  expect(boardSnapshot(result.current.game.state)).toEqual(before);
  if (reversed) {
    act(() => result.current.input.handleBarPress());
    expect(result.current.input.inputNudge).toBe('dice-order');
    expect(boardSnapshot(result.current.game.state)).toEqual(before);
  }
  startDrag(result, 0);
  expect(result.current.game.state?.legalMovesForSelected).toMatchObject([{ from: 0, to: 22, die: 3 }]);
  const target = getCheckerAnchor({ pointIndex: 22, dims });
  act(() => result.current.input.handleDragMove(target.x, target.y));
  expect(result.current.input.previewTarget).toBe(22);
  act(() => result.current.input.handleDragEnd(target.x, target.y));
  settle(result);
  expect(result.current.game.state?.bar).toEqual({ white: 0, black: 1 });
  expect(result.current.game.state?.points[22]).toEqual({ player: 'white', count: 1 });
  expect(result.current.game.state?.points[24]).toEqual({ player: 'black', count: 2 });
  expect(result.current.game.state?.remainingDice).toEqual([1]);
});

it.each([[false, false], [false, true], [true, false], [true, true]])('allows exact/farthest oversize bear-off and rejects a nearer checker, swapped=%s, concurrent=%s', (reversed, concurrent) => {
  const position = createPositionState({ mode: 'vs-human', dice: [4, 6], placements: [
    { point: 4, player: 'white', count: 2 },
    { point: 2, player: 'white', count: 13 },
    { point: 19, player: 'black', count: 15 },
  ] });
  const { result } = setup(position, reversed, concurrent);
  const before = boardSnapshot(result.current.game.state);
  act(() => result.current.input.handlePointPress(2));
  expect(result.current.input.inputNudge).toBe('dice-order');
  expect(boardSnapshot(result.current.game.state)).toEqual(before);
  expect(result.current.order.displayedDice).toEqual(reversed ? [6, 4] : [4, 6]);
  act(() => result.current.input.handlePointPress(4));
  settle(result);
  expect(result.current.game.state?.borneOff.white).toBe(1);
  expect(result.current.game.state?.points[4].count).toBe(1);
  expect(result.current.game.state?.remainingDice).toEqual([reversed ? 4 : 6]);
  expect(result.current.game.moveLog).toMatchObject([{ from: 4, to: 25, after: { remainingDice: [reversed ? 4 : 6] } }]);
});

it.each([false, true])('refuses the displayed lower die when maximum-use/higher-die requires the other die (higher-only=%s)', (higherOnly) => {
  const position = createPositionState({ mode: 'vs-human', dice: [1, 2], bar: { white: 1 }, placements: [
    { point: 6, player: 'white', count: 14 },
    { point: 22, player: 'black', count: 2 },
    { point: 4, player: 'black', count: 2 },
    ...(higherOnly ? [{ point: 5, player: 'black' as const, count: 2 }] : []),
    { point: 19, player: 'black', count: higherOnly ? 9 : 11 },
  ] });
  const { result } = setup(position);
  const before = boardSnapshot(result.current.game.state);
  act(() => result.current.input.handleBarPress());
  expect(result.current.input.inputNudge).toBe('dice-order');
  expect(boardSnapshot(result.current.game.state)).toEqual(before);
  expect(result.current.game.moveLog).toEqual([]);
  expect(result.current.game.moveAnimation).toBeNull();
  act(() => {
    result.current.order.swapDice();
    result.current.input.handleBarPress();
  });
  settle(result);
  expect(result.current.input.inputNudge).toBeNull();
  expect(result.current.game.state?.bar.white).toBe(0);
  expect(result.current.game.state?.points[23]).toEqual({ player: 'white', count: 1 });
  expect(result.current.game.moveLog).toMatchObject([{ from: 0, to: 23, after: { remainingDice: [1] } }]);
  expect(result.current.game.state?.remainingDice).toEqual([1]);
});

it('drags a compound move through the legal intermediate when the other path is blocked', () => {
  const { result } = setup(createPositionState({ mode: 'vs-human', dice: [3, 1], placements: [
    { point: 8, player: 'white', count: 15 },
    { point: 5, player: 'black', count: 2 },
    { point: 19, player: 'black', count: 13 },
  ] }), true);
  startDrag(result, 8);
  const target = getCheckerAnchor({ pointIndex: 4, dims });
  act(() => result.current.input.handleDragMove(target.x, target.y));
  expect(result.current.input.previewTarget).toBe(4);
  act(() => result.current.input.handleDragEnd(target.x, target.y));
  settle(result);
  expect(result.current.game.moveLog.map(move => [move.from, move.to])).toEqual([[8, 7], [7, 4]]);
  expect(result.current.game.state?.points[5]).toEqual({ player: 'black', count: 2 });
  expect(result.current.game.state?.points[4]).toEqual({ player: 'white', count: 1 });
  expect(result.current.game.state?.remainingDice).toEqual([]);
});
