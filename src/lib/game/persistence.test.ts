import type { GameState } from './types';
import { getItem, setItem } from '@/lib/storage';

import { createInitialPoints, createInitialState } from './constants';
import { applyDiceRoll, applyMove, findMoveSequence } from './moves';
import {
  canContinueSavedGame,
  hasSavedGame,
  isResumableGame,
  loadRestorableGame,
  saveActiveGame,
} from './persistence';

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedGetItem = getItem as jest.MockedFunction<typeof getItem>;
const mockedSetItem = setItem as jest.MockedFunction<typeof setItem>;

const memoryStore: Record<string, unknown> = {};

function syncStorageMock() {
  mockedSetItem.mockImplementation(async (key, value) => {
    memoryStore[key] = value;
  });
  mockedGetItem.mockImplementation(key => (memoryStore[key] as ReturnType<typeof getItem>) ?? null);
}

describe('isResumableGame', () => {
  it('returns false for null', () => {
    expect(isResumableGame(null)).toBe(false);
  });

  it('returns true for an in-progress game', () => {
    expect(isResumableGame(createInitialState('vs-computer'))).toBe(true);
  });

  it('returns false for a finished game (TestFlight #1: resume button must hide)', () => {
    const finished = {
      ...createInitialState('vs-computer'),
      phase: 'game-over' as const,
      winner: 'white' as const,
    };
    expect(isResumableGame(finished)).toBe(false);
  });
});

describe('hasSavedGame', () => {
  beforeEach(() => {
    mockedGetItem.mockReset();
  });

  it('returns false when MMKV only has a finished game (TestFlight #1)', () => {
    mockedGetItem.mockReturnValue({
      ...createInitialState('vs-computer'),
      phase: 'game-over',
      winner: 'white',
    });
    expect(hasSavedGame()).toBe(false);
  });
});

describe('loadRestorableGame', () => {
  beforeEach(() => {
    mockedGetItem.mockReset();
  });

  it('returns in-progress save for cold launch (TestFlight #5)', () => {
    const saved = createInitialState('vs-computer');
    mockedGetItem.mockReturnValue(saved);
    expect(loadRestorableGame()).toEqual(saved);
  });

  it('returns null when only a finished save exists', () => {
    mockedGetItem.mockReturnValue({
      ...createInitialState('vs-computer'),
      phase: 'game-over',
      winner: 'white',
    });
    expect(loadRestorableGame()).toBeNull();
  });
});

describe('canContinueSavedGame', () => {
  beforeEach(() => {
    mockedGetItem.mockReset();
  });

  it('true when live context holds a rolled game (TestFlight #9: back nav)', () => {
    const rolled = applyDiceRoll(createInitialState('vs-computer'), [3, 5]);
    mockedGetItem.mockReturnValue(null);
    expect(canContinueSavedGame(rolled)).toBe(true);
  });

  it('true when MMKV has save but context is null', () => {
    const saved = createInitialState('vs-computer');
    mockedGetItem.mockReturnValue(saved);
    expect(canContinueSavedGame(null)).toBe(true);
  });
});

describe('saveActiveGame round-trip', () => {
  beforeEach(() => {
    Object.keys(memoryStore).forEach(key => delete memoryStore[key]);
    syncStorageMock();
  });

  it('restores partial doubles turn after save and load (leave/resume)', () => {
    const points = createInitialPoints().map(() => ({ player: null as 'white' | 'black' | null, count: 0 }));
    points[24] = { player: 'white', count: 1 };
    points[23] = { player: 'white', count: 1 };
    points[22] = { player: 'white', count: 1 };

    let state: GameState = {
      ...createInitialState('vs-computer'),
      phase: 'moving',
      currentPlayer: 'white',
      dice: [1, 1],
      remainingDice: [1, 1, 1, 1],
      points,
      bar: { white: 0, black: 0 },
      borneOff: { white: 0, black: 0 },
    };

    for (let i = 0; i < 3; i++) {
      const move = findMoveSequence(state, 24 - i, 23 - i)!;
      state = applyMove(state, move[0]);
    }

    saveActiveGame(state);
    const loaded = loadRestorableGame();
    expect(loaded?.remainingDice).toEqual([1]);
    expect(loaded?.currentPlayer).toBe('white');
    expect(loaded?.phase).toBe('moving');
  });
});
