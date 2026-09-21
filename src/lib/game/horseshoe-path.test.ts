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

  it('uses the same quiet lane for whichever player is moving', () => {
    const white = horseshoeMetrics(200, 200, 'white');
    const black = horseshoeMetrics(200, 200, 'black');
    expect(black).toEqual(white);
  });

  it('keeps the guide compact inside the board', () => {
    const metrics = horseshoeMetrics(200, 200);
    expect(metrics.rightX - metrics.curveX).toBeLessThan(200 * 0.7);
    expect(metrics.botY - metrics.topY).toBeLessThan(200 * 0.5);
  });
});
