import { newPosition, validatePosition } from './position';
import { setPositionStack, stackDragCount, stackPressCount } from './set-stack';

it('builds and reduces a stack while conserving both checker pools', () => {
  const empty = newPosition(true);
  const full = setPositionStack(empty, 6, 'white', 15);
  expect(full.points[6]).toEqual({ player: 'white', count: 15 });
  expect(full.borneOff.white).toBe(0);
  expect(empty.points[6]!.count).toBe(0);
  const reduced = setPositionStack(full, 6, 'white', 2);
  expect(reduced.borneOff.white).toBe(13);
  expect(validatePosition(reduced)).toEqual(reduced);
});

it('paints the selected color and returns the replaced stack to its pool', () => {
  const white = setPositionStack(newPosition(true), 13, 'white', 5);
  const black = setPositionStack(white, 13, 'black', 3);
  expect(black.points[13]).toEqual({ player: 'black', count: 3 });
  expect(black.borneOff).toEqual({ white: 15, black: 12 });
  expect(white.points[13]!.count).toBe(5);
});

it('caps a stack at available checkers and does not erase an opponent when no paint is available', () => {
  const p = setPositionStack(newPosition(true), 13, 'white', 12);
  expect(setPositionStack(p, 6, 'white', 15).points[6]!.count).toBe(3);
  const standard = newPosition();
  expect(setPositionStack(standard, 1, 'white', 1)).toEqual(standard);
  expect(setPositionStack(standard, 1, 'white', 0).borneOff.black).toBe(2);
});

it('edits either bar and preserves unfinished dice and match inputs', () => {
  const p = newPosition(true);
  p.dice = [3, 0];
  p.context.matchLength = 2;
  p.context.scores.white = 3;
  const next = setPositionStack(p, 'black-bar', 'black', 15);
  expect(next.bar.black).toBe(15);
  expect(next.borneOff.black).toBe(0);
  expect(next.dice).toEqual([3, 0]);
  expect(next.context).toEqual(p.context);
  expect(setPositionStack(next, 'black-bar', 'black', 0).borneOff.black).toBe(15);
});

it('uses the same inward/outward gesture on both board halves, including zero and fifteen', () => {
  expect(stackDragCount(5, 2, true)).toBe(7);
  expect(stackDragCount(5, -2, false)).toBe(7);
  expect(stackDragCount(5, -9, true)).toBe(0);
  expect(stackDragCount(5, 9, false)).toBe(0);
  expect(stackDragCount(5, 30, true)).toBe(15);
});

it.each([0, 25, 1.5, Number.NaN])('ignores an invalid point %s', (point) => {
  const p = newPosition();
  expect(setPositionStack(p, point, 'white', 2)).toBe(p);
});

it('maps a press to the visible checker centres and clamps off-board distances', () => {
  expect(stackPressCount(0, 20)).toBe(1);
  expect(stackPressCount(10, 20)).toBe(1);
  expect(stackPressCount(28, 20)).toBe(2);
  expect(stackPressCount(46, 20)).toBe(3);
  expect(stackPressCount(82, 20)).toBe(5);
  expect(stackPressCount(1000, 20)).toBe(15);
  expect(stackPressCount(-40, 20)).toBe(1);
  expect(stackPressCount(Number.NaN, 20)).toBe(1);
  // Bar checkers have their own diameter, padding and gap.
  expect(stackPressCount(8.8 + 2 * 19.6, 17.6, 19.6)).toBe(3);
});
