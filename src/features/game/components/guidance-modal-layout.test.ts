import { guidanceBoardWidth } from './guidance-modal-layout';

describe('guidanceBoardWidth', () => {
  // Screen minus scrim padding (2 x 24), card border (2 x 1.5) and gutter (2 x 22).
  it.each([
    [320, 225],
    [390, 295],
    [820, 333],
    [1280, 333],
  ])('fits the card content box at %ipx', (screenWidth, expected) => {
    expect(guidanceBoardWidth(screenWidth)).toBe(expected);
  });
});
