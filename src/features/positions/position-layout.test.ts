import { nextMatchLength } from './match-length';
import { positionLayout, SIDE_PANEL_WIDTH } from './position-layout';

it('steps the match target through money and odd lengths', () => {
  const up: number[] = [0];
  while (up.length < 14) up.push(nextMatchLength(up.at(-1)!, 1));
  expect(up).toEqual([0, 1, 3, 5, 7, 9, 11, 13, 15, 17, 19, 21, 23, 25]);
  expect(nextMatchLength(1, -1)).toBe(0);
  expect(nextMatchLength(0, -1)).toBe(0);
  // Imported even lengths step to their odd neighbours.
  expect(nextMatchLength(4, 1)).toBe(5);
  expect(nextMatchLength(4, -1)).toBe(3);
});

it('stacks the controls under the board on phones', () => {
  const layout = positionLayout(390, 844, 0);
  expect(layout.side).toBe(false);
  expect(layout.boardWidth).toBe(358);
});

it('puts the controls beside the board in wide or short windows', () => {
  const zoomedIn = positionLayout(720, 450, 0);
  expect(zoomedIn.side).toBe(true);
  expect(zoomedIn.boardWidth).toBe(720 - 32 - SIDE_PANEL_WIDTH - 24);
  // Zoomed out, the board grows with the window instead of staying small.
  expect(positionLayout(2880, 1800, 0).boardHeight).toBeGreaterThan(1200);
});

it('scrolls on small phones instead of shrinking the board to a sliver', () => {
  const layout = positionLayout(320, 640, 0);
  expect(layout.side).toBe(false);
  expect(layout.boardHeight).toBeGreaterThanOrEqual(layout.boardWidth * 0.75);
});

it.each([180, 220, 260])('never makes the board wider than a %ipx window allows', (width) => {
  expect(positionLayout(width, width * 2, 0).boardWidth).toBeLessThanOrEqual(width - 32);
});
