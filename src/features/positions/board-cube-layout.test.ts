import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { boardCubeLayout, cubeSlotOffset, nextCubeExponent, snapCubeSlot, stepCubeSlot } from './board-cube-layout';

it.each([288, 398, 700])('keeps the cube in the bear-off tray at board width %i', (width) => {
  const d = fitBoardToViewport(width, 470, { extraHeight: 36 });
  const trayLeft = d.boardFrameWidth + 12 * d.colWidth + d.barWidth;
  const cube = boardCubeLayout(d);
  expect(cube.left).toBeGreaterThanOrEqual(trayLeft);
  expect(cube.left + cube.size).toBeLessThanOrEqual(trayLeft + d.bearOffWidth);
  for (const slot of ['black', null, 'white'] as const) {
    const top = cube.top + cubeSlotOffset(slot, cube.travel);
    expect(top).toBeGreaterThan(0);
    expect(top + cube.size).toBeLessThan(d.boardOuterHeight + 36);
  }
});

it('sends Black up and White down from the centre', () => {
  expect(cubeSlotOffset('black', 60)).toBe(-60);
  expect(cubeSlotOffset(null, 60)).toBe(0);
  expect(cubeSlotOffset('white', 60)).toBe(60);
});

it('snaps a vertical drag to the nearest slot', () => {
  expect(snapCubeSlot(-31, 60)).toBe('black');
  expect(snapCubeSlot(-29, 60)).toBeNull();
  expect(snapCubeSlot(29, 60)).toBeNull();
  expect(snapCubeSlot(31, 60)).toBe('white');
  expect(snapCubeSlot(-500, 60)).toBe('black');
});

it('steps one slot at a time and stops at the ends', () => {
  expect(stepCubeSlot('white', -1)).toBeNull();
  expect(stepCubeSlot(null, -1)).toBe('black');
  expect(stepCubeSlot('black', -1)).toBeUndefined();
  expect(stepCubeSlot('black', 1)).toBeNull();
  expect(stepCubeSlot('white', 1)).toBeUndefined();
});

it('doubles on each tap and wraps the top value back to 1', () => {
  expect(nextCubeExponent(0, 6)).toBe(1);
  expect(nextCubeExponent(5, 6)).toBe(6);
  expect(nextCubeExponent(6, 6)).toBe(0);
  expect(nextCubeExponent(4, 3)).toBe(0);
});

it.each([180, 220, 300])('keeps the cube inside the tray on a %ipx board', (width) => {
  const d = fitBoardToViewport(width, 400, { extraHeight: 36, checkerCap: 64 });
  const { size, left } = boardCubeLayout(d);
  const trayLeft = d.boardFrameWidth + 12 * d.colWidth + d.barWidth;
  expect(left).toBeGreaterThanOrEqual(trayLeft);
  expect(left + size).toBeLessThanOrEqual(trayLeft + d.bearOffWidth);
});
