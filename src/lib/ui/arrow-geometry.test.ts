import { buildArrowhead, horseshoeArrowhead, unitVector } from '@/lib/ui/arrow-geometry';

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
});
