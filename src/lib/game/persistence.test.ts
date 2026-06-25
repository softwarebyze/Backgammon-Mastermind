import { getItem } from '@/lib/storage';

import { createInitialState } from './constants';
import { hasSavedGame, isResumableGame } from './persistence';

jest.mock('@/lib/storage', () => ({
  getItem: jest.fn(),
  setItem: jest.fn(),
  removeItem: jest.fn(),
}));

const mockedGetItem = getItem as jest.MockedFunction<typeof getItem>;

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
