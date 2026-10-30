import type { GameState, Move } from '@/lib/game';
import { act, renderHook } from '@testing-library/react-native';
import { useState } from 'react';
import { displayBarCountDuringAnimation, displayCommittedCount, displayPointDuringAnimation } from '@/features/game/move-animation';
import { useAnimatedMoves } from '@/features/game/use-animated-moves';
import { createInitialState, getLegalMoves } from '@/lib/game';

let mockConfirmMove = true;
jest.mock('@/lib/game-preferences/confirm-move', () => ({ shouldDeferTurnEnd: () => mockConfirmMove }));

function position(white: Record<number, number>, black: Record<number, number>, dice: [number, number]): GameState {
  const state = createInitialState('vs-human');
  for (let i = 1; i <= 24; i++) {
    state.points[i] = { player: null, count: 0 };
  }
  for (const [p, count] of Object.entries(white)) {
    state.points[Number(p)] = { player: 'white', count };
  }
  for (const [p, count] of Object.entries(black)) {
    state.points[Number(p)] = { player: 'black', count };
  }
  return { ...state, phase: 'moving', currentPlayer: 'white', dice, remainingDice: [...dice], borneOff: { white: 15 - Object.values(white).reduce((a, b) => a + b, 0), black: 15 - Object.values(black).reduce((a, b) => a + b, 0) } };
}

function mount(initial: GameState) {
  const applied = jest.fn();
  const view = renderHook(() => {
    const [state, setState] = useState<GameState | null>(initial);
    const animation = useAnimatedMoves(state, setState, { onMoveApplied: applied });
    return { state: state!, animation };
  });
  const move = (from: number, to: number) => {
    const legal = getLegalMoves(view.result.current.state).find(m => m.from === from && m.to === to);
    expect(legal).toBeDefined();
    act(() => view.result.current.animation.doMove(legal as Move, { concurrent: true }));
  };
  return { ...view, move, applied };
}

beforeEach(() => {
  mockConfirmMove = true;
});

it('hits while another checker is flying and keeps the captured bar checker hidden until landing', () => {
  const { result, move, applied } = mount(position({ 6: 1, 4: 1 }, { 5: 1, 24: 14 }, [1, 2]));
  move(6, 5);
  move(4, 2);
  const frame = result.current.animation.moveAnimation!;
  expect(frame.parallel).toHaveLength(2);
  expect(result.current.state.bar.black).toBe(1);
  expect(displayBarCountDuringAnimation('black', 1, frame)).toBe(0);
  expect(displayPointDuringAnimation(5, result.current.state.points[5], frame).count).toBe(0);
  act(() => frame.parallel![1]!.onFinish());
  act(() => frame.parallel![0]!.onFinish());
  expect(result.current.state.points[5]).toEqual({ player: 'white', count: 1 });
  expect(result.current.state.bar.black).toBe(1);
  expect(applied).toHaveBeenCalledTimes(2);
  // Duplicate platform callbacks never record a move twice.
  act(() => frame.parallel!.forEach(f => f.onFinish()));
  expect(applied).toHaveBeenCalledTimes(2);
});

it('animates two bar entries at once without duplicating bar checkers', () => {
  const initial = position({}, { 1: 15 }, [1, 2]);
  initial.bar.white = 2;
  initial.borneOff.white = 13;
  const { result, move } = mount(initial);
  move(0, 24);
  move(0, 23);
  const frame = result.current.animation.moveAnimation!;
  expect(frame.parallel).toHaveLength(2);
  expect(displayBarCountDuringAnimation('white', result.current.state.bar.white, frame)).toBe(0);
  expect(result.current.state.bar.white).toBe(0);
});

it('keeps borne-off tokens in their own flights until they land', () => {
  const { result, move } = mount(position({ 2: 1, 1: 1 }, { 24: 15 }, [2, 1]));
  move(2, 25);
  move(1, 25);
  const frame = result.current.animation.moveAnimation!;
  expect(frame.parallel).toHaveLength(2);
  expect(displayCommittedCount({ point: 25, player: 'white', count: result.current.state.borneOff.white }, frame)).toBe(13);
  act(() => frame.parallel!.forEach(f => f.onFinish()));
  expect(result.current.state.borneOff.white).toBe(15);
});

it('continues a checker already in flight after its first leg lands', () => {
  const { result, move } = mount(position({ 8: 1, 6: 14 }, { 24: 15 }, [3, 1]));
  move(8, 5);
  move(5, 4);
  const frames = result.current.animation.moveAnimation!.parallel!;
  expect(frames[1]!.waitFor).toBe(frames[0]!.id);
  expect(result.current.state.points[4].count).toBe(1);
  act(() => frames[0]!.onFinish());
  const next = result.current.animation.moveAnimation!.parallel!;
  expect(next).toHaveLength(1);
  expect(next[0]!.waitFor).toBeUndefined();
  act(() => next[0]!.onFinish());
  expect(result.current.animation.isAnimating).toBe(false);
});

it('hands off an automatic turn only after all checker flights finish', () => {
  mockConfirmMove = false;
  const { result, move } = mount(position({ 8: 1, 6: 14 }, { 24: 15 }, [3, 1]));
  move(8, 5);
  move(6, 5);
  const frames = result.current.animation.moveAnimation!.parallel!;
  expect(result.current.state.currentPlayer).toBe('white');
  act(() => frames[1]!.onFinish());
  expect(result.current.state.currentPlayer).toBe('white');
  act(() => frames[0]!.onFinish());
  expect(result.current.state.currentPlayer).toBe('black');
  expect(result.current.state.phase).toBe('rolling');
});
