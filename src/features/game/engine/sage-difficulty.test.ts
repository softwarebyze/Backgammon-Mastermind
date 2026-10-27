import type { ComputerLevel } from './sage-difficulty';

import {
  COMPUTER_LEVELS,
  DEFAULT_COMPUTER_LEVEL,
  isComputerLevel,
  pickCandidateIndex,
  SAGE_LEVELS,
} from './sage-difficulty';

describe('computer levels', () => {
  it('has the existing default and three Sage levels', () => {
    expect(COMPUTER_LEVELS).toEqual(['classic', 'easy', 'medium', 'hard']);
    expect(DEFAULT_COMPUTER_LEVEL).toBe('classic');
  });

  it('uses 1-ply and weakens only by mixing in worse candidates', () => {
    expect(SAGE_LEVELS).toEqual({
      easy: { ply: 1, temperature: 0.2 },
      medium: { ply: 1, temperature: 0.06 },
      hard: { ply: 1, temperature: 0 },
    });
    expect(SAGE_LEVELS.easy.temperature).toBeGreaterThan(SAGE_LEVELS.medium.temperature);
    expect(SAGE_LEVELS.medium.temperature).toBeGreaterThan(SAGE_LEVELS.hard.temperature);
  });

  it('recognizes only persisted level ids', () => {
    for (const level of COMPUTER_LEVELS) {
      expect(isComputerLevel(level)).toBe(true);
    }
    expect(isComputerLevel('expert')).toBe(false);
    expect(isComputerLevel(null)).toBe(false);
  });
});

describe('pickCandidateIndex', () => {
  const candidates = [
    { equity: 0.4 },
    { equity: 0.35 },
    { equity: 0.1 },
  ];

  it('always takes the top move at temperature zero', () => {
    expect(pickCandidateIndex(candidates, 0, () => 0.99)).toBe(0);
  });

  it('never picks the best move when rng lands at the top of the range', () => {
    expect(pickCandidateIndex(candidates, 0.2, () => 0.99)).toBe(2);
  });

  it('can mix in a near-equal move without ever choosing a distant one', () => {
    expect(pickCandidateIndex(candidates, 0.2, () => 0.1)).toBe(0);
    expect(pickCandidateIndex(candidates, 0.2, () => 0.85)).toBe(1);
  });

  it('makes distinct choices at the same deterministic quantile', () => {
    expect(pickCandidateIndex(candidates, SAGE_LEVELS.easy.temperature, () => 0.6)).toBe(1);
    expect(pickCandidateIndex(candidates, SAGE_LEVELS.medium.temperature, () => 0.6)).toBe(0);
    expect(pickCandidateIndex(candidates, SAGE_LEVELS.hard.temperature, () => 0.6)).toBe(0);
    expect(pickCandidateIndex(candidates, SAGE_LEVELS.medium.temperature, () => 0.9)).toBe(1);
    expect(pickCandidateIndex(candidates, SAGE_LEVELS.hard.temperature, () => 0.9)).toBe(0);
  });

  it('returns the only candidate when there is nothing to mix', () => {
    expect(pickCandidateIndex([{ equity: 0.2 }], 0.2, () => 0.5)).toBe(0);
  });
});

// Compile-time check that the stored preference and the engine list agree.
const level: ComputerLevel = DEFAULT_COMPUTER_LEVEL;
void level;
