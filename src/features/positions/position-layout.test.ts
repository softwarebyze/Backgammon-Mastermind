import { crawfordPossible, nextMatchLength } from './match-length';
import { positionLayout } from './position-layout';

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

it('allows a Crawford game only with exactly one side at match point', () => {
  expect(crawfordPossible({ matchLength: 0, scores: { white: 0, black: 0 } })).toBe(false);
  expect(crawfordPossible({ matchLength: 5, scores: { white: 0, black: 0 } })).toBe(false);
  expect(crawfordPossible({ matchLength: 5, scores: { white: 4, black: 2 } })).toBe(true);
  expect(crawfordPossible({ matchLength: 5, scores: { white: 1, black: 4 } })).toBe(true);
  expect(crawfordPossible({ matchLength: 5, scores: { white: 4, black: 4 } })).toBe(false);
  // A 1-point match starts at double match point.
  expect(crawfordPossible({ matchLength: 1, scores: { white: 0, black: 0 } })).toBe(false);
});

it('stacks the controls under the board on phones', () => {
  const layout = positionLayout(390, 844, 0);
  expect(layout.side).toBe(false);
  expect(layout.boardWidth).toBe(358);
});

it('puts the controls beside the board in wide or short windows', () => {
  const zoomedIn = positionLayout(720, 450, 0);
  expect(zoomedIn.side).toBe(true);
  expect(zoomedIn.boardWidth).toBe(720 - 32 - zoomedIn.panelWidth - 24);
  // Zoomed out, the board grows with the window instead of staying small.
  expect(positionLayout(2880, 1800, 0).boardHeight).toBeGreaterThan(1200);
});

it('gives a landscape phone board the full height, with the strips in the panel', () => {
  const layout = positionLayout(844, 390, 0);
  expect(layout.side).toBe(true);
  expect(layout.panelWidth).toBe(280);
  // Header and page padding only: no strips, toolbar or scoreboard above or below.
  expect(layout.boardHeight).toBe(390 - 108);
});

it('scrolls on small phones instead of shrinking the board to a sliver', () => {
  const layout = positionLayout(320, 640, 0);
  expect(layout.side).toBe(false);
  expect(layout.boardHeight).toBeGreaterThanOrEqual(layout.boardWidth * 0.75);
});

it.each([180, 220, 260])('never makes the board wider than a %ipx window allows', (width) => {
  expect(positionLayout(width, width * 2, 0).boardWidth).toBeLessThanOrEqual(width - 32);
});
