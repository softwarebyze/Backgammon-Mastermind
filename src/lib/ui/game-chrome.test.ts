import {
  DESKTOP_MIN_WIDTH,
  GAME_CHROME_MAX_WIDTH,
  gameStageMaxWidth,
  isDesktopLayout,
  isLandscapeLayout,
  landscapeChromeColumnWidth,
  MAX_BOARD_WIDTH,
  PAGE_STAGE_MAX_WIDTH,
  SETTINGS_MAX_WIDTH,
} from '@/lib/ui/game-chrome';

describe('game chrome layout', () => {
  it('keeps phone-like chrome narrower than the board stage', () => {
    expect(GAME_CHROME_MAX_WIDTH).toBeLessThan(MAX_BOARD_WIDTH);
    expect(MAX_BOARD_WIDTH).toBe(720);
    expect(SETTINGS_MAX_WIDTH).toBeGreaterThan(GAME_CHROME_MAX_WIDTH);
    expect(PAGE_STAGE_MAX_WIDTH).toBeGreaterThan(MAX_BOARD_WIDTH);
  });

  it('treats wider-than-tall windows as landscape', () => {
    expect(isLandscapeLayout(844, 390)).toBe(true);
    expect(isLandscapeLayout(1024, 768)).toBe(true);
    expect(isLandscapeLayout(390, 844)).toBe(false);
    expect(isLandscapeLayout(768, 1024)).toBe(false);
  });

  it('treats 1024+ as desktop / wide window', () => {
    expect(isDesktopLayout(DESKTOP_MIN_WIDTH)).toBe(true);
    expect(isDesktopLayout(1280)).toBe(true);
    expect(isDesktopLayout(1920)).toBe(true);
    expect(isDesktopLayout(1023)).toBe(false);
    expect(isDesktopLayout(390)).toBe(false);
  });

  it('sizes landscape chrome from width share, not a 360px vertical constant', () => {
    expect(landscapeChromeColumnWidth(844)).toBe(304);
    expect(landscapeChromeColumnWidth(667)).toBe(240);
    expect(landscapeChromeColumnWidth(500)).toBe(220);
  });

  it('caps desktop chrome so the rail stays beside the board', () => {
    expect(landscapeChromeColumnWidth(1440)).toBe(360);
    expect(landscapeChromeColumnWidth(1920)).toBe(360);
    expect(landscapeChromeColumnWidth(1024)).toBe(360);
  });

  it('leaves phone landscape unstaged and centers a desktop board+chrome row', () => {
    expect(gameStageMaxWidth(844)).toBeUndefined();
    expect(gameStageMaxWidth(1023)).toBeUndefined();
    expect(gameStageMaxWidth(1280)).toBe(MAX_BOARD_WIDTH + 16 + 360);
    expect(gameStageMaxWidth(1920)).toBe(MAX_BOARD_WIDTH + 16 + 360);
  });
});
