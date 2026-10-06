import { pickCandidateIndex, SAGE_LEVELS } from './sage-difficulty';

const CANDIDATES = [
  { equity: 0.3 },
  { equity: 0.29 },
  { equity: 0.25 },
  { equity: 0.15 },
  { equity: -0.2 },
];

function expectedLoss(temperature: number): number {
  const best = CANDIDATES[0].equity;
  const weights = CANDIDATES.map(c => (temperature > 0 ? Math.exp(-(best - c.equity) / temperature) : 0));
  if (temperature <= 0)
    return 0;
  const total = weights.reduce((a, w) => a + w, 0);
  return CANDIDATES.reduce((a, c, i) => a + (weights[i] / total) * (best - c.equity), 0);
}

describe('pickCandidateIndex', () => {
  it('plays the top candidate at temperature 0', () => {
    expect(pickCandidateIndex(CANDIDATES, 0, () => 0.999)).toBe(0);
  });

  it('plays the only candidate', () => {
    expect(pickCandidateIndex([{ equity: 1 }], 0.5, () => 0.999)).toBe(0);
  });

  it('maps the random draw across candidates by softmax weight', () => {
    expect(pickCandidateIndex(CANDIDATES, 0.1, () => 0)).toBe(0);
    expect(pickCandidateIndex(CANDIDATES, 0.1, () => 0.9999)).toBe(CANDIDATES.length - 1);
  });

  it('keeps big blunders rare at moderate temperature', () => {
    let seed = 7;
    const rng = () => {
      seed = (seed * 16807) % 2147483647;
      return seed / 2147483647;
    };
    let blunders = 0;
    for (let i = 0; i < 2000; i++) {
      if (pickCandidateIndex(CANDIDATES, 0.06, rng) === 4)
        blunders++;
    }
    expect(blunders).toBeLessThan(10);
  });

  it('orders the levels by expected equity loss', () => {
    const loss = (['beginner', 'intermediate', 'advanced'] as const)
      .map(level => expectedLoss(SAGE_LEVELS[level].temperature));
    expect(loss[0]).toBeGreaterThan(loss[1]);
    expect(loss[1]).toBeGreaterThan(loss[2]);
    expect(loss[2]).toBeGreaterThan(expectedLoss(SAGE_LEVELS.expert.temperature));
    expect(SAGE_LEVELS.expert).toEqual({ ply: 1, temperature: 0 });
  });
});
