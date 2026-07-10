import { buildHorseshoePath } from './horseshoe-path';

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
    // pad=4, topY=22, botY=78, leftX=12, rightX=82
    expect(black).toMatch(/^M 82 78 /);
    expect(black).toContain('Q 4 50 12 22');
    expect(black).toMatch(/L 82 22$/);
  });
});
