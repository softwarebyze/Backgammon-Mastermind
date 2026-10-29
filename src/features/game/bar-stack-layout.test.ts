import { createPositionState } from '@/lib/game/create-position';
import { barStackLayout, MAX_BAR_VISIBLE } from './bar-stack-layout';
import { getCheckerAnchor, resolveDropTarget } from './board-point-layout';
import { hitTestFatFinger, resolvePanOrigin } from './hit-test-board';
import { resolveBoardViewport } from './hooks/use-board-dimensions';

it.each([200, 320, 600])('keeps both stacks inside their own half at height %s', (height) => {
  const dims = resolveBoardViewport({ screenWidth: 390, screenHeight: height, platform: 'web', slotWidth: 390, slotHeight: height });
  const black = barStackLayout({ ...dims, player: 'black', count: 15 });
  const white = barStackLayout({ ...dims, player: 'white', count: 15 });
  expect(white.centers).toHaveLength(MAX_BAR_VISIBLE);
  expect(black.centers).toHaveLength(MAX_BAR_VISIBLE);
  for (const y of black.centers) {
    expect(y - black.size / 2).toBeGreaterThanOrEqual(0);
    expect(y + black.size / 2).toBeLessThan(dims.pointHeight);
  }
  for (const y of white.centers) {
    expect(y - white.size / 2).toBeGreaterThan(dims.pointHeight + dims.middleHeight);
    expect(y + white.size / 2).toBeLessThanOrEqual(dims.boardHeight);
  }
});

it.each(['white', 'black'] as const)('uses the visible front %s checker for touch, drag and animation anchors', (player) => {
  const dims = resolveBoardViewport({ screenWidth: 844, screenHeight: 390, platform: 'web', slotWidth: 532, slotHeight: 390 });
  for (const count of [1, 2, 4, 7, 15]) {
    const layout = barStackLayout({ ...dims, player, count });
    const anchor = getCheckerAnchor({ pointIndex: 0, dims, player, stackCount: count });
    expect(anchor.y).toBe(layout.centers[layout.centers.length - 1]);
    expect(Math.abs(anchor.y - dims.boardHeight / 2)).toBeLessThan(dims.checkerSize + dims.middleHeight);
    expect(resolveDropTarget(anchor.x, anchor.y, dims)).toBe(0);
    const state = createPositionState({ bar: { [player]: count }, currentPlayer: player, dice: [1, 2], mode: 'vs-human' });
    expect(hitTestFatFinger({ ...anchor, state, dims })).toBe(0);
    expect(resolvePanOrigin({ pointIndex: 0, state, dims })).toBe(0);
  }
});
