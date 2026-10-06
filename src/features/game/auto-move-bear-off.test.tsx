import { act, renderHook } from '@testing-library/react-native';
import { useGameProviderValue } from '@/features/game/use-game-provider-value';
import { DEFAULT_GAME_PREFERENCES } from '@/lib/game-preferences/types';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { createPositionState } from '@/lib/game/create-position';
import { loadPersistedGame } from '@/lib/game/persistence';

jest.mock('@/lib/game-preferences/use-game-preferences', () => ({ useGamePreferences: jest.fn() }));
jest.mock('@/lib/game-sfx/play-game-sfx', () => ({ playGameSfx: jest.fn(), playGameSfxSequence: jest.fn() }));
jest.mock('@/lib/game/persistence', () => ({
  ...jest.requireActual('@/lib/game/persistence'),
  loadPersistedGame: jest.fn(),
  saveActiveGame: jest.fn(),
}));

beforeEach(() => {
  jest.useFakeTimers();
  jest.mocked(useGamePreferences).mockReturnValue({
    preferences: { ...DEFAULT_GAME_PREFERENCES, autoMoveWhenForced: true, autoRoll: false },
  } as ReturnType<typeof useGamePreferences>);
});

afterEach(() => {
  jest.clearAllTimers();
  jest.useRealTimers();
});

const rolls: Array<[number, number]> = [[6, 5], [5, 6], [6, 4], [5, 5], [6, 6], [4, 3], [2, 1]];

function playOut(state: ReturnType<typeof createPositionState>) {
  jest.mocked(loadPersistedGame).mockReturnValue(state);
  const { result } = renderHook(() => useGameProviderValue(true));
  for (let i = 0; i < 20; i++) {
    act(() => {
      jest.advanceTimersByTime(300);
    });
  }
  return result.current;
}

describe('auto-move when forced while bearing off', () => {
  it.each(rolls)('bears off the last checker on the 1 point after a %i-%i roll', (a, b) => {
    const game = playOut(createPositionState({
      placements: [{ point: 1, player: 'white', count: 1 }, { point: 24, player: 'black', count: 2 }],
      borneOff: { white: 14, black: 13 },
      dice: [a, b],
      mode: 'vs-computer',
    }));
    expect(game.state?.phase).toBe('game-over');
    expect(game.state?.winner).toBe('white');
    expect(game.isAnimating).toBe(false);
  });

  it('bears off two checkers on a high roll when both plays reach the same board', () => {
    const game = playOut(createPositionState({
      placements: [{ point: 1, player: 'white', count: 1 }, { point: 2, player: 'white', count: 1 }],
      borneOff: { white: 13, black: 15 },
      dice: [6, 5],
      mode: 'vs-computer',
    }));
    expect(game.state?.winner).toBe('white');
  });

  it('leaves a real choice to the player', () => {
    const game = playOut(createPositionState({
      placements: [{ point: 1, player: 'white', count: 1 }, { point: 6, player: 'white', count: 1 }],
      borneOff: { white: 13, black: 15 },
      dice: [6, 5],
      mode: 'vs-computer',
    }));
    expect(game.state?.phase).toBe('moving');
  });
});
