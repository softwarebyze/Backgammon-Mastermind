import { createInitialState } from './constants';
import { isResumableGame } from './persistence';

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
