import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';
import { POINT_CONTROLS_WIDTH, positionControlAnchor } from './position-control-anchor';

it.each([288, 380, 700])('keeps every point toolbar on-screen at board width %i', (width) => {
  const d = fitBoardToViewport(width, 470);
  for (let point = 1; point <= 24; point++) {
    const anchor = positionControlAnchor(point, d);
    expect(anchor.top).toBe(point >= 13);
    expect(anchor.left).toBeGreaterThanOrEqual(0);
    expect(anchor.left + POINT_CONTROLS_WIDTH).toBeLessThanOrEqual(d.boardOuterWidth);
  }
  expect(positionControlAnchor('white-bar', d).top).toBe(false);
  expect(positionControlAnchor('black-bar', d).top).toBe(true);
});

it('tracks the physical board order and allows for the centre bar', () => {
  const d = fitBoardToViewport(700, 470);
  expect(positionControlAnchor(15, d).left).toBeLessThan(positionControlAnchor(16, d).left);
  expect(positionControlAnchor(18, d).left).toBeLessThan(positionControlAnchor(19, d).left);
  expect(positionControlAnchor(10, d).left).toBeLessThan(positionControlAnchor(9, d).left);
  expect(positionControlAnchor(6, d).left).toBeLessThan(positionControlAnchor(5, d).left);
});
