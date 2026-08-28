import { buildHorseshoePath, horseshoeMetrics } from './horseshoe-path';

describe('buildHorseshoePath', () => {
  it('returns a closed horseshoe with home direction along the bottom for white', () => {
    const path = buildHorseshoePath(320, 480, 'white');
    expect(path).toMatch(/^M /);
    expect(path).toContain('L ');
    expect(path).toContain('Q ');
    expect(path.split('L ').length).toBeGreaterThanOrEqual(2);
  });

  it('mirrors start/end for black with a full bottom-to-top path', () => {
    const white = buildHorseshoePath(100, 100, 'white');
    const black = buildHorseshoePath(100, 100, 'black');
    expect(white).not.toEqual(black);
    expect(black).toMatch(/^M /);
    expect(black).toContain('Q ');
    expect(black).toMatch(/L [\d.]+ [\d.]+$/);
  });

  it('insets the black lane so both directions can render without stacking', () => {
    const white = horseshoeMetrics(200, 200, 'white');
    const black = horseshoeMetrics(200, 200, 'black');
    expect(black.topY).toBeGreaterThan(white.topY);
    expect(black.botY).toBeLessThan(white.botY);
    expect(black.leftX).toBeGreaterThan(white.leftX);
    expect(black.curveX).toBeGreaterThan(white.curveX);
  });
});
