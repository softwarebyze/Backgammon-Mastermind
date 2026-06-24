import { getItem } from '@/lib/storage';
import { createInitialState } from './constants';

import { isResumableGame, loadRestorableGame } from './persistence';

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
