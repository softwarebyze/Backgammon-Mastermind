import type { GameState } from '@/lib/game';
import { createMatchGame } from '@/lib/game/match';
import { renderHook } from '@/lib/test-utils';
import { useWinCelebration } from './use-win-celebration';

function finished(state: GameState, final: boolean): GameState {
  return { ...state, phase: 'game-over', winner: 'white', match: { ...state.match!, winner: final ? 'white' : null } };
}

it('only emits a burst for the final match game through the real hook', () => {
  const moving = { ...createMatchGame(3), phase: 'moving' as const };
  const view = renderHook(({ state, reviewing }: { state: GameState; reviewing: boolean }) => useWinCelebration(state, reviewing), {
    initialProps: { state: moving as GameState, reviewing: false },
  });
  view.rerender({ state: finished(moving, false), reviewing: false });
  expect(view.result.current).toBe(0);
  view.rerender({ state: moving, reviewing: false });
  view.rerender({ state: finished(moving, true), reviewing: false });
  expect(view.result.current).toBe(1);
  view.rerender({ state: finished(moving, true), reviewing: false });
  expect(view.result.current).toBe(1);
  view.rerender({ state: moving, reviewing: false });
  expect(view.result.current).toBe(0);
});

it('preserves standalone wins and skips a result loaded directly or reached in review', () => {
  const moving = { ...createMatchGame(3), phase: 'moving' as const, match: undefined };
  const over = { ...moving, phase: 'game-over' as const, winner: 'white' as const };
  const view = renderHook(({ state, reviewing }: { state: GameState; reviewing: boolean }) => useWinCelebration(state, reviewing), {
    initialProps: { state: over as GameState, reviewing: false },
  });
  expect(view.result.current).toBe(0);
  view.rerender({ state: moving, reviewing: false });
  view.rerender({ state: over, reviewing: true });
  expect(view.result.current).toBe(0);
  view.rerender({ state: moving, reviewing: false });
  view.rerender({ state: over, reviewing: false });
  expect(view.result.current).toBe(1);
});

it('never replays a previous standalone burst on an intermediate match win or computer loss', () => {
  const match = { ...createMatchGame(3), phase: 'moving' as const };
  const standalone = { ...match, match: undefined };
  const view = renderHook(({ state, reviewing }: { state: GameState; reviewing: boolean }) => useWinCelebration(state, reviewing), {
    initialProps: { state: standalone as GameState, reviewing: false },
  });
  view.rerender({ state: { ...standalone, phase: 'game-over', winner: 'white' }, reviewing: false });
  expect(view.result.current).toBe(1);
  view.rerender({ state: match, reviewing: false });
  view.rerender({ state: finished(match, false), reviewing: false });
  expect(view.result.current).toBe(0);
  view.rerender({ state: match, reviewing: false });
  view.rerender({ state: finished(match, true), reviewing: false });
  expect(view.result.current).toBe(2);
  view.rerender({ state: finished(match, true), reviewing: true });
  expect(view.result.current).toBe(0);
  view.rerender({ state: finished(match, true), reviewing: false });
  expect(view.result.current).toBe(0);
  view.rerender({ state: match, reviewing: false });
  view.rerender({ state: { ...finished(match, true), mode: 'vs-computer', winner: 'black', match: { ...match.match!, winner: 'black' } }, reviewing: false });
  expect(view.result.current).toBe(0);
});
