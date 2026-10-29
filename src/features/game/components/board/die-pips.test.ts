import { diePips } from './die-pips';

const SIZES = [24, 26, 28, 30, 33, 35, 36, 40, 44, 52, 60];

describe('die pips', () => {
  it.each(SIZES)('lays out every face in whole pixels, symmetric and inside the face (size %i)', (size) => {
    for (const border of [2, 3]) {
      const inner = size - border * 2;
      for (let value = 1; value <= 6; value++) {
        const pips = diePips(value, size, border);
        expect(pips).toHaveLength(value);
        for (const pip of pips) {
          expect(Number.isInteger(pip.left) && Number.isInteger(pip.top)).toBe(true);
          expect(pip.left).toBeGreaterThanOrEqual(1);
          expect(pip.left + pip.size).toBeLessThanOrEqual(inner - 1);
          // Mirror image across both axes is also a pip of this face.
          const mirrored = pips.some(p => p.left === inner - pip.size - pip.left && p.top === inner - pip.size - pip.top);
          expect(mirrored).toBe(true);
        }
      }
    }
  });

  it.each(SIZES)('keeps clear space between the pips of a 6 (size %i)', (size) => {
    const pips = diePips(6, size, 2);
    const column = pips.filter(p => p.left === pips[0]!.left).map(p => p.top).sort((a, b) => a - b);
    const pip = pips[0]!.size;
    const gaps = [column[1]! - column[0]! - pip, column[2]! - column[1]! - pip];
    expect(Math.min(...gaps)).toBeGreaterThanOrEqual(Math.max(1, Math.floor(size * 0.06)));
    // The two gaps in a column differ by at most a pixel.
    expect(Math.abs(gaps[0]! - gaps[1]!)).toBeLessThanOrEqual(1);
  });

  it('centres the 5 exactly between its corners', () => {
    for (const size of SIZES) {
      const [a, , centre, , d] = diePips(5, size, 2);
      expect(Math.abs((centre!.left - a!.left) - (d!.left - centre!.left))).toBeLessThanOrEqual(1);
    }
  });
});
