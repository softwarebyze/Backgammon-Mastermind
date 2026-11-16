import type { GameState } from '@/lib/game';
import { act, renderHook } from '@testing-library/react-native';
import { useMemo, useState } from 'react';
import { useAnimatedMoves } from '@/features/game/use-animated-moves';
import { useBoardPlayInput } from '@/features/game/use-board-play-input';
import { useDiceOrder } from '@/features/game/use-dice-order';
import { useGameProviderValue } from '@/features/game/use-game-provider-value';
import { useGameSelectPoint } from '@/features/game/use-game-select-point';
import { createInitialState, createPositionState, getLegalMoves } from '@/lib/game';

jest.mock('posthog-react-native', () => ({ usePostHog: jest.fn(() => ({ capture: jest.fn() })) }));
jest.mock('expo-haptics', () => ({
  impactAsync: jest.fn(() => Promise.resolve()),
  selectionAsync: jest.fn(() => Promise.resolve()),
  notificationAsync: jest.fn(() => Promise.resolve()),
  ImpactFeedbackStyle: { Light: 'light' },
  NotificationFeedbackType: { Warning: 'warning' },
}));
jest.mock('@/lib/game-preferences/storage', () => {
  const actual = jest.requireActual('@/lib/game-preferences/storage');
  const { DEFAULT_GAME_PREFERENCES } = jest.requireActual('@/lib/game-preferences/types');
  return { ...actual, loadGamePreferences: () => ({ ...DEFAULT_GAME_PREFERENCES, confirmMove: true, autoRoll: false, autoMoveWhenForced: false, moveInDiceOrder: true }) };
});

function useLiveBoard(dice: [number, number] = [3, 1], moveInDiceOrder = false) {
  const [state, setState] = useState<GameState | null>(() => {
    const initial: GameState = {
      ...createInitialState('vs-human'),
      currentPlayer: 'white',
      phase: 'moving',
      dice,
      remainingDice: dice[0] === dice[1] ? [dice[0], dice[0], dice[0], dice[0]] : [...dice],
      selectedPoint: 8,
    };
    return { ...initial, legalMovesForSelected: getLegalMoves(initial).filter(m => m.from === 8) };
  });
  const animation = useAnimatedMoves(state, setState);
  const selectPoint = useGameSelectPoint(setState, animation.isAnimating && !animation.moveAnimation?.committed);
  const actions = useMemo(() => ({
    selectPoint,
    doMove: animation.doMove,
    doMoveSequence: animation.doMoveSequence,
    getMoveState: animation.getMoveState,
  }), [selectPoint, animation.doMove, animation.doMoveSequence, animation.getMoveState]);
  const order = useDiceOrder(state);
  const input = useBoardPlayInput({ moveInDiceOrder, diceOrderReversed: order.reversedRef, state, actions, isAnimating: animation.isAnimating && !animation.moveAnimation?.committed, concurrentMoves: true, isHumanTurn: true });
  return { state, animation, input, order };
}

it('starts both checker flights before either lands, including pre-render taps', () => {
  const { result } = renderHook(() => useLiveBoard());
  act(() => {
    result.current.input.handlePointPress(5);
    result.current.input.handlePointPress(6);
  });
  const flights = result.current.animation.moveAnimation!.parallel!;
  expect(flights).toHaveLength(2);
  expect(flights).toMatchObject([{ from: 8, to: 5 }, { from: 6, to: 5 }]);
  expect(result.current.state?.remainingDice).toEqual([]);
  // Landing in reverse order cannot overwrite newer moves or restore spent dice.
  act(() => flights[1]!.onFinish());
  expect(result.current.animation.moveAnimation?.parallel).toHaveLength(2);
  act(() => flights[0]!.onFinish());
  expect(result.current.animation.isAnimating).toBe(false);
  expect(result.current.state?.points[6].count).toBe(4);
  expect(result.current.state?.points[5].count).toBe(2);
  expect(result.current.state?.remainingDice).toEqual([]);
});

it('highlights a newly selected checker while an earlier checker is moving', () => {
  const { result } = renderHook(() => useLiveBoard([2, 2]));
  act(() => result.current.input.handlePointPress(6)); // 8→6
  act(() => result.current.input.handlePointPress(13));
  expect(result.current.state?.selectedPoint).toBe(13);
  expect(result.current.animation.isAnimating).toBe(true);
  expect(result.current.state?.legalMovesForSelected.length).toBeGreaterThan(0);
});

it('keeps separate identities for repeated moves from the same stack', () => {
  const { result } = renderHook(() => useLiveBoard([2, 2]));
  act(() => {
    result.current.input.handlePointPress(6); // 8→6
    result.current.input.handlePointPress(8);
    result.current.input.handlePointPress(6); // 8→6 again
  });
  const flights = result.current.animation.moveAnimation!.parallel!;
  expect(flights).toHaveLength(2);
  expect(new Set(flights.map(frame => frame.id)).size).toBe(2);
  expect(result.current.state?.points[8].count).toBe(1);
  expect(result.current.state?.remainingDice).toHaveLength(2);
  act(() => result.current.animation.resetAnimation());
  act(() => flights.forEach(frame => frame.onFinish()));
  expect(result.current.animation.isAnimating).toBe(false);
  expect(result.current.state?.remainingDice).toHaveLength(2);
});

it('dice order spends both dice in overlapping flights before React renders', () => {
  const { result } = renderHook(() => useLiveBoard([3, 1], true));
  act(() => {
    result.current.input.handlePointPress(8);
    result.current.input.handlePointPress(6);
  });
  const flights = result.current.animation.moveAnimation!.parallel!;
  expect(flights).toMatchObject([{ from: 8, to: 5 }, { from: 6, to: 5 }]);
  expect(result.current.state?.remainingDice).toEqual([]);
  act(() => flights[1]!.onFinish());
  act(() => flights[0]!.onFinish());
  expect(result.current.state?.points[5].count).toBe(2);
  expect(result.current.state?.remainingDice).toEqual([]);
});

it('swap then rapid taps consumes the swapped die first without a render between events', () => {
  const { result } = renderHook(() => useLiveBoard([3, 1], true));
  act(() => {
    result.current.order.swapDice();
    result.current.input.handlePointPress(8);
    result.current.input.handlePointPress(13);
  });
  expect(result.current.animation.moveAnimation!.parallel!).toMatchObject([{ from: 8, to: 7 }, { from: 13, to: 10 }]);
  expect(result.current.state?.remainingDice).toEqual([]);
});

/** The live screen allows input during committed flights, unlike legacy sequences. */
function useLiveProviderBoard() {
  const game = useGameProviderValue(true);
  const order = useDiceOrder(game.state);
  const input = useBoardPlayInput({
    state: game.state,
    actions: game,
    isAnimating: game.isAnimating && (!game.moveAnimation?.committed || !!game.moveAnimation.inputBlocked),
    concurrentMoves: true,
    isHumanTurn: true,
    moveInDiceOrder: true,
    diceOrderReversed: order.reversedRef,
  });
  return { game, input, order };
}

function position(state: GameState | null) {
  expect(state).not.toBeNull();
  const { points, bar, borneOff, dice, remainingDice, currentPlayer, phase } = state!;
  return { points, bar, borneOff, dice, remainingDice, currentPlayer, phase };
}

it.each([false, true])('provider rapid taps and batched Undo/Redo preserve the latest history (swapped=%s)', (swapped) => {
  const { result } = renderHook(useLiveProviderBoard);
  act(() => result.current.game.startFromPosition(createPositionState({ useStandardSetup: true, dice: [3, 1], mode: 'vs-human' })));
  const initial = position(result.current.game.state);
  // Capture handlers from one render, as native pointer events can do.
  const handlers = result.current;
  act(() => {
    if (swapped)
      handlers.order.swapDice();
    handlers.input.handlePointPress(8);
    handlers.input.handlePointPress(6);
  });
  const played = position(result.current.game.state);
  const playedLog = result.current.game.moveLog;
  const flights = result.current.game.moveAnimation!.parallel!;
  expect(flights).toHaveLength(2);
  expect(played.remainingDice).toEqual([]);
  expect(playedLog).toMatchObject(swapped
    ? [{ from: 8, to: 7 }, { from: 6, to: 3 }]
    : [{ from: 8, to: 5 }, { from: 6, to: 5 }]);
  expect(playedLog.map(entry => entry.after?.remainingDice)).toEqual([swapped ? [3] : [1], []]);
  expect(result.current.game.canUndo).toBe(true);

  // Neither undo can rely on the previous undo having rendered or landed.
  const history = result.current.game;
  act(() => {
    history.doUndo();
    history.doUndo();
  });
  expect(position(result.current.game.state)).toEqual(initial);
  expect(result.current.game.moveLog).toEqual([]);
  expect(result.current.game.canUndo).toBe(false);
  expect(result.current.game.canRedo).toBe(true);
  const undoneFlights = result.current.game.moveAnimation!.parallel!;

  const redo = result.current.game.doRedo;
  act(() => {
    redo();
    redo();
  });
  expect(position(result.current.game.state)).toEqual(played);
  expect(result.current.game.moveLog).toEqual(playedLog);
  expect(result.current.game.canUndo).toBe(true);
  expect(result.current.game.canRedo).toBe(false);
  expect(result.current.order.displayedDice).toEqual(swapped ? [1, 3] : [3, 1]);

  // Old parent arrivals, including repeated callbacks, cannot restore an old ply.
  const finalFlights = result.current.game.moveAnimation!.parallel!;
  act(() => {
    [...flights, ...undoneFlights, ...finalFlights].forEach(frame => frame.onFinish());
    flights.forEach(frame => frame.onFinish());
  });
  expect(position(result.current.game.state)).toEqual(played);
  expect(result.current.game.moveLog).toEqual(playedLog);
  expect(result.current.game.isAnimating).toBe(false);
});

it('provider input after Undo replaces the redo branch while older checker flights finish', () => {
  const { result } = renderHook(useLiveProviderBoard);
  act(() => result.current.game.startFromPosition(createPositionState({ useStandardSetup: true, dice: [3, 1], mode: 'vs-human' })));
  act(() => {
    result.current.input.handlePointPress(8);
    result.current.input.handlePointPress(6);
  });
  const oldFlights = result.current.game.moveAnimation!.parallel!;
  act(() => result.current.game.doUndo());
  expect(result.current.game.state?.remainingDice).toEqual([1]);
  expect(result.current.game.moveLog).toMatchObject([{ from: 8, to: 5 }]);
  expect(result.current.game.canRedo).toBe(true);

  // Spend the restored die on a different checker before Undo's flight lands.
  act(() => result.current.input.handlePointPress(8));
  const alternate = position(result.current.game.state);
  expect(alternate.remainingDice).toEqual([]);
  expect(alternate.points[5].count).toBe(1);
  expect(alternate.points[7].count).toBe(1);
  expect(alternate.points[8].count).toBe(1);
  expect(alternate.points[6].count).toBe(5);
  expect(alternate.points[13].count).toBe(5);
  expect(result.current.game.moveLog).toMatchObject([{ from: 8, to: 5 }, { from: 8, to: 7 }]);
  expect(result.current.game.canRedo).toBe(false);
  act(() => result.current.game.doRedo());
  expect(position(result.current.game.state)).toEqual(alternate);

  const latestFlights = result.current.game.moveAnimation!.parallel!;
  act(() => {
    oldFlights.forEach(frame => frame.onFinish());
    latestFlights.forEach(frame => frame.onFinish());
  });
  expect(position(result.current.game.state)).toEqual(alternate);
  expect(result.current.game.moveLog).toHaveLength(2);
  expect(result.current.game.canRedo).toBe(false);
  expect(result.current.game.isAnimating).toBe(false);
});

it('provider Undo/Redo sees moves from the same event batch before the parent rerenders', () => {
  const { result } = renderHook(useLiveProviderBoard);
  act(() => result.current.game.startFromPosition(createPositionState({ useStandardSetup: true, dice: [3, 1], mode: 'vs-human' })));
  const initial = position(result.current.game.state);
  const { input, game } = result.current;
  let played: ReturnType<typeof position>;
  act(() => {
    input.handlePointPress(8);
    input.handlePointPress(6);
    played = position(game.getMoveState!());
    game.doUndo();
    expect(game.getMoveState!()?.remainingDice).toEqual([1]);
    game.doUndo();
    expect(position(game.getMoveState!())).toEqual(initial);
    game.doRedo();
    expect(game.getMoveState!()?.remainingDice).toEqual([1]);
    game.doRedo();
  });
  expect(position(result.current.game.state)).toEqual(played!);
  expect(result.current.game.state?.remainingDice).toEqual([]);
  expect(result.current.game.moveLog).toMatchObject([{ from: 8, to: 5 }, { from: 6, to: 5 }]);
  expect(result.current.game.canUndo).toBe(true);
  expect(result.current.game.canRedo).toBe(false);
  const flights = result.current.game.moveAnimation!.parallel!;
  act(() => flights.forEach(frame => frame.onFinish()));
  expect(position(result.current.game.state)).toEqual(played!);
  expect(result.current.game.isAnimating).toBe(false);
});
