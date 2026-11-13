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
    expect(size).toBeGreaterThan(15 * 0.55);
    expect(measure('Medium', size)).toBeLessThanOrEqual(50 + 0.05);
  });

  it('does not shrink past the minimum scale', () => {
    expect(segmentLabelFontSize({ label: 'Medium', innerWidth: 8, measure })).toBe(15 * 0.55);
  });
});
