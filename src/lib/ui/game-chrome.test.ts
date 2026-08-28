import {
  GAME_CHROME_MAX_WIDTH,
  isLandscapeLayout,
  landscapeChromeColumnWidth,
  MAX_BOARD_WIDTH,
} from '@/lib/ui/game-chrome';

describe('game chrome layout', () => {
  it('keeps phone-like chrome narrower than the board stage', () => {
    expect(GAME_CHROME_MAX_WIDTH).toBeLessThan(MAX_BOARD_WIDTH);
    expect(MAX_BOARD_WIDTH).toBe(720);
  });

  it('treats wider-than-tall windows as landscape', () => {
    expect(isLandscapeLayout(844, 390)).toBe(true);
    expect(isLandscapeLayout(1024, 768)).toBe(true);
    expect(isLandscapeLayout(390, 844)).toBe(false);
    expect(isLandscapeLayout(768, 1024)).toBe(false);
  });

  it('sizes landscape chrome from width share, not a 360px vertical constant', () => {
    expect(landscapeChromeColumnWidth(844)).toBe(304);
    expect(landscapeChromeColumnWidth(667)).toBe(240);
    expect(landscapeChromeColumnWidth(1440)).toBe(GAME_CHROME_MAX_WIDTH);
    expect(landscapeChromeColumnWidth(500)).toBe(220);
  });
});
