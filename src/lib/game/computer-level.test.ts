import { chooseAtLevel, COMPUTER_LEVELS, isComputerLevel } from './computer-level';

/** A repeatable uniform source, so the rates below never flake. */
function seeded(seed: number): () => number {
  let s = seed;
  return () => {
    s = (s * 1664525 + 1013904223) % 2 ** 32;
    return s / 2 ** 32;
  };
}

function errorRate(level: Parameters<typeof chooseAtLevel>[1], gap: number): number {
  const random = seeded(42);
  const options = [{ option: 'best', equity: 0 }, { option: 'worse', equity: -gap }];
  let errors = 0;
  const trials = 2000;
  for (let i = 0; i < trials; i++) {
    if (chooseAtLevel(options, level, random) !== 'best')
      errors++;
  }
  return errors / trials;
}

describe('chooseAtLevel', () => {
  it('always takes the best option at expert', () => {
    expect(errorRate('expert', 0.01)).toBe(0);
  });

  it('gets close choices wrong more often the weaker the level', () => {
    const rates = COMPUTER_LEVELS.map(level => errorRate(level, 0.1));
    expect(rates[0]).toBeGreaterThan(rates[1]);
    expect(rates[1]).toBeGreaterThan(rates[2]);
    expect(rates[2]).toBeGreaterThan(rates[3]);
    // Easy is beatable: it misses a clear 0.1 edge often.
    expect(rates[0]).toBeGreaterThan(0.3);
  });

  it('still sees a huge blunder even at easy', () => {
    expect(errorRate('easy', 1.5)).toBeLessThan(0.01);
  });

  it('knows its own levels', () => {
    expect(COMPUTER_LEVELS.every(isComputerLevel)).toBe(true);
    expect(isComputerLevel('grandmaster')).toBe(false);
  });
});
