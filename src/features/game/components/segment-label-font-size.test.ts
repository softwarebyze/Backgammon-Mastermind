import { segmentLabelFontSize } from './segment-label-font-size';

/** Stub: 0.62em average advance, close to Inter semibold Latin. */
const measure = (word: string, size: number) => word.length * size * 0.62;

describe('segmentLabelFontSize', () => {
  it('keeps the base size when every word fits, even if the full label is wider (it can wrap)', () => {
    // "Computer" at 15px is 8 * 15 * 0.62 = 74.4px; the full phrase is wider.
    expect(segmentLabelFontSize({ label: 'Gegen Computer', innerWidth: 80, measure })).toBe(15);
    expect(segmentLabelFontSize({ label: 'Medium', innerWidth: 80, measure })).toBe(15);
  });

  it('shrinks when a single word is wider than the segment, so it is not broken mid-word', () => {
    // "Medium" at 15px is 6 * 15 * 0.62 = 55.8px
    const size = segmentLabelFontSize({ label: 'Medium', innerWidth: 50, measure });
    expect(size).toBeLessThan(15);
    expect(size).toBeGreaterThan(15 * 0.4);
    expect(measure('Medium', size)).toBeLessThanOrEqual(50);
  });

  it('shrinks when a word overflows by only 1px, so it is not ellipsized', () => {
    // QA: iPhone SE landscape 667×375, "Medium" scrollWidth 59, clientWidth 58, font stayed 15.
    const px = (_word: string, size: number) => 59 * (size / 15);
    const size = segmentLabelFontSize({ label: 'Medium', innerWidth: 58, measure: px });
    expect(size).toBeLessThan(15);
    expect(px('Medium', size)).toBeLessThanOrEqual(58);
  });

  it('shrinks below 0.55 when a word still does not fit at that floor', () => {
    // QA: Russian "Сложный" at 150% zoom is 39.36px at 8.25px in a ~35px tile.
    const px = (_word: string, size: number) => 39.36 * (size / 8.25);
    const size = segmentLabelFontSize({ label: 'Сложный', innerWidth: 35, measure: px });
    expect(size).toBeLessThan(15 * 0.55);
    expect(size).toBeGreaterThanOrEqual(15 * 0.4);
    expect(px('Сложный', size)).toBeLessThanOrEqual(35);
  });

  it('does not shrink past the minimum scale', () => {
    expect(segmentLabelFontSize({ label: 'Medium', innerWidth: 8, measure })).toBe(15 * 0.4);
  });
});
