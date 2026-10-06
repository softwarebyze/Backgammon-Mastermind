import type { GameState } from '@/lib/game';

import { createInitialState } from '@/lib/game/constants';
import { renderHook } from '@/lib/test-utils';

import { useGameCompletedCapture } from './use-game-completed-capture';

const mockCapture = jest.fn();

jest.mock('posthog-react-native', () => ({
  usePostHog: function postHogApi() {
    return { capture: mockCapture };
  },
}));

function movingState(): GameState {
  const s = createInitialState('vs-computer');
  s.phase = 'moving';
  return s;
}

function overState(): GameState {
  return { ...movingState(), phase: 'game-over', winner: 'white' };
}

beforeEach(() => mockCapture.mockClear());

describe('useGameCompletedCapture', () => {
  it('captures once when a move ends the game, with the final move count', () => {
    const before = movingState();
    const after = overState();
    const { result, rerender } = renderHook(
      (p: { state: GameState; count: number }) => useGameCompletedCapture(p.state, p.count),
      { initialProps: { state: before, count: 100 } },
    );

    result.current(before, after);
    rerender({ state: after, count: 101 });
    rerender({ state: after, count: 101 });

    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture).toHaveBeenCalledWith('game_completed', {
      mode: 'vs-computer',
      winner: 'white',
      move_count: 101,
    });
  });

  it('does not capture when a finished game is resumed for review', () => {
    renderHook(() => useGameCompletedCapture(overState(), 120));
    expect(mockCapture).not.toHaveBeenCalled();
  });

  it('does not capture again when undo then redo returns to game-over', () => {
    const before = movingState();
    const after = overState();
    const { result, rerender } = renderHook(
      (p: { state: GameState; count: number }) => useGameCompletedCapture(p.state, p.count),
      { initialProps: { state: before, count: 100 } },
    );
    result.current(before, after);
    rerender({ state: after, count: 101 });
    rerender({ state: before, count: 100 });
    rerender({ state: after, count: 101 });

    expect(mockCapture).toHaveBeenCalledTimes(1);
  });

  it('captures again for the next game', () => {
    const before = movingState();
    const after = overState();
    const { result, rerender } = renderHook(
      (p: { state: GameState; count: number }) => useGameCompletedCapture(p.state, p.count),
      { initialProps: { state: before, count: 100 } },
    );
    result.current(before, after);
    rerender({ state: after, count: 101 });
    rerender({ state: before, count: 0 });
    result.current(before, after);
    rerender({ state: after, count: 90 });

    expect(mockCapture).toHaveBeenCalledTimes(2);
  });
});
