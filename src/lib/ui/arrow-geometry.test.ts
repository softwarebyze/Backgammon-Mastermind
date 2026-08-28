import { buildArrowhead, HORSESHOE_ARROW, horseshoeArrowhead, unitVector } from '@/lib/ui/arrow-geometry';

describe('arrow-geometry', () => {
  it('unitVector points from source to target', () => {
    const u = unitVector({ x: 0, y: 0 }, { x: 3, y: 4 });
    expect(u.x).toBeCloseTo(0.6);
    expect(u.y).toBeCloseTo(0.8);
  });

  it('buildArrowhead places base behind tip along direction', () => {
    const { lineEnd, polygonPoints } = buildArrowhead({ x: 100, y: 50 }, { x: 1, y: 0 }, {
      length: 12,
      halfWidth: 6,
    });
    expect(lineEnd.x).toBeCloseTo(88);
    expect(lineEnd.y).toBeCloseTo(50);
    expect(polygonPoints).toContain('100,50');
  });

  it('horseshoeArrowhead matches white path endpoint', () => {
    const { polygonPoints } = horseshoeArrowhead(320, 400, 'white');
    expect(polygonPoints.split(' ').length).toBeGreaterThanOrEqual(3);
  });

  it('black horseshoe arrowhead is large enough to read as a point', () => {
    expect(HORSESHOE_ARROW.black.length).toBeGreaterThanOrEqual(16);
    expect(HORSESHOE_ARROW.black.halfWidth).toBeGreaterThanOrEqual(8);
    const { lineEnd, polygonPoints } = horseshoeArrowhead(320, 400, 'black');
    const xs = polygonPoints.split(' ').map(p => Number(p.split(',')[0]));
    expect(Math.max(...xs) - Math.min(...xs)).toBeCloseTo(HORSESHOE_ARROW.black.length);
    expect(lineEnd.x).toBeCloseTo(Math.max(...xs) - HORSESHOE_ARROW.black.length);
  });
});
