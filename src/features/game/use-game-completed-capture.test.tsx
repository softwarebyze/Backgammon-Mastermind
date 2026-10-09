import type { GameState } from '@/lib/game';

import { settingProperties } from '@/lib/analytics/settings-analytics';
import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { createInitialState } from '@/lib/game/constants';
import { renderHook } from '@/lib/test-utils';

import { useGameCompletedCapture } from './use-game-completed-capture';

const mockCapture = jest.fn();
let mockPreferences = { ...DEFAULT_GAME_PREFERENCES };
jest.mock('@/lib/game-preferences/use-game-preferences', () => {
  function readMockPreferences() {
    return { preferences: mockPreferences };
  }
  return { useGamePreferences: readMockPreferences };
});

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

beforeEach(() => {
  mockCapture.mockClear();
  mockPreferences = { ...DEFAULT_GAME_PREFERENCES };
});

describe('useGameCompletedCapture', () => {
  it('captures preferences in force at completion from the provider', () => {
    const before = movingState();
    const after = overState();
    const { result, rerender } = renderHook(
      (p: { state: GameState; count: number }) => useGameCompletedCapture(p.state, p.count),
      { initialProps: { state: before, count: 100 } },
    );
    mockPreferences = { ...mockPreferences, autoRoll: false, tutorMode: true };
    result.current.noteMoveApplied(before, after);
    rerender({ state: after, count: 101 });
    expect(mockCapture).toHaveBeenCalledWith('game_completed', expect.objectContaining({
      pref_auto_roll: false,
      pref_tutor_mode: true,
    }));
  });

  it('captures once when a move ends the game, with the final move count', () => {
    const before = movingState();
    const after = overState();
    const { result, rerender } = renderHook(
      (p: { state: GameState; count: number }) => useGameCompletedCapture(p.state, p.count),
      { initialProps: { state: before, count: 100 } },
    );

    result.current.noteMoveApplied(before, after);
    rerender({ state: after, count: 101 });
    rerender({ state: after, count: 101 });

    expect(mockCapture).toHaveBeenCalledTimes(1);
    expect(mockCapture).toHaveBeenCalledWith('game_completed', {
      mode: 'vs-computer',
      winner: 'white',
      move_count: 101,
      ...settingProperties(DEFAULT_GAME_PREFERENCES),
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
    result.current.noteMoveApplied(before, after);
    rerender({ state: after, count: 101 });
    rerender({ state: before, count: 100 });
    rerender({ state: after, count: 101 });

    expect(mockCapture).toHaveBeenCalledTimes(1);
  });

  it('does not capture again when the player undoes out of game-over and wins again', () => {
    const before = movingState();
    const after = overState();
    const { result, rerender } = renderHook(
      (p: { state: GameState; count: number }) => useGameCompletedCapture(p.state, p.count),
      { initialProps: { state: before, count: 100 } },
    );
    result.current.noteMoveApplied(before, after);
    rerender({ state: after, count: 101 });
    rerender({ state: before, count: 100 });
    result.current.noteMoveApplied(before, after);
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
    result.current.noteMoveApplied(before, after);
    rerender({ state: after, count: 101 });
    rerender({ state: before, count: 0 });
    result.current.resetForNewGame();
    result.current.noteMoveApplied(before, after);
    rerender({ state: after, count: 90 });

    expect(mockCapture).toHaveBeenCalledTimes(2);
  });
});
