import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { boardCubeLayout } from './board-cube-layout';

it.each([288, 398, 700])('keeps the cube on the bar at board width %i', (width) => {
  const d = fitBoardToViewport(width, 470, { extraHeight: 36 });
  const barLeft = d.boardFrameWidth + 6 * d.colWidth;
  for (const owner of [null, 'white', 'black'] as const) {
    const cube = boardCubeLayout(d, owner);
    const centre = cube.left + cube.size / 2;
    expect(centre).toBeGreaterThan(barLeft);
    expect(centre).toBeLessThan(barLeft + d.barWidth);
    expect(cube.top).toBeGreaterThan(0);
    expect(cube.top + cube.size).toBeLessThan(d.boardOuterHeight + 36);
  }
});

it('slides toward the owner: Black above the hinge, White below', () => {
  const d = fitBoardToViewport(398, 470, { extraHeight: 36 });
  const centred = boardCubeLayout(d, null).top;
  expect(boardCubeLayout(d, 'black').top).toBeLessThan(centred);
  expect(boardCubeLayout(d, 'white').top).toBeGreaterThan(centred);
});
