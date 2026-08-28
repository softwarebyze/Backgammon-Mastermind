import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';
import {
  fitBoardToViewport,
  learnCaptionMaxHeight,
  leftoverBoardHeight,
  MIN_LEARN_BOARD_SLOT_HEIGHT,
  MIN_LEARN_CAPTION_HEIGHT,
  resolveBoardViewport,
} from '@/features/game/hooks/use-board-dimensions';
import { MAX_BOARD_WIDTH } from '@/lib/ui/game-chrome';

describe('fitBoardToViewport', () => {
  it('shrinks width when height is constrained', () => {
    const roomy = fitBoardToViewport(720, 2000);
    const tight = fitBoardToViewport(720, 280);
    expect(tight.boardOuterWidth).toBeLessThan(roomy.boardOuterWidth);
    expect(tight.boardOuterHeight).toBeLessThanOrEqual(280);
  });

  it('accounts for extra height (point-number rails) when fitting', () => {
    const withoutRails = fitBoardToViewport(720, 400, 0);
    const withRails = fitBoardToViewport(720, 400, 36);
    expect(withRails.boardOuterWidth).toBeLessThanOrEqual(withoutRails.boardOuterWidth);
    expect(withRails.boardOuterHeight + 36).toBeLessThanOrEqual(400);
  });

  it('keeps max width when height allows', () => {
    const dims = fitBoardToViewport(500, 2000);
    expect(dims.boardOuterWidth).toBe(500);
  });
});

describe('resolveBoardViewport', () => {
  const phone = { screenWidth: 390, screenHeight: 844, platform: 'web' as const };

  it('uses measured leftover height instead of the chrome constant', () => {
    const fallback = resolveBoardViewport({ ...phone, showPointNumbers: true });
    const slotted = resolveBoardViewport({
      ...phone,
      slotWidth: 390,
      slotHeight: 280,
      showPointNumbers: true,
    });
    expect(slotted.boardOuterHeight + POINT_NUMBER_RAIL * 2).toBeLessThanOrEqual(280);
    expect(slotted.boardOuterHeight).toBeLessThan(fallback.boardOuterHeight);
  });

  it('falls back to window minus chrome when the slot is empty', () => {
    const unset = resolveBoardViewport({ ...phone });
    const zero = resolveBoardViewport({
      ...phone,
      slotWidth: 0,
      slotHeight: 0,
    });
    expect(zero.boardOuterWidth).toBe(unset.boardOuterWidth);
    expect(zero.boardOuterHeight).toBe(unset.boardOuterHeight);
  });

  it('keeps the 720 cap on a wide desktop viewport with a tall slot', () => {
    const dims = resolveBoardViewport({
      screenWidth: 1440,
      screenHeight: 900,
      platform: 'web',
      slotWidth: 720,
      slotHeight: 700,
      showPointNumbers: true,
    });
    expect(dims.boardOuterWidth).toBe(MAX_BOARD_WIDTH);
    expect(dims.boardOuterHeight + POINT_NUMBER_RAIL * 2).toBeLessThanOrEqual(700);
  });

  it('ignores extraChrome when a slot is measured', () => {
    const withExtra = resolveBoardViewport({
      ...phone,
      slotWidth: 390,
      slotHeight: 300,
      extraChrome: 80,
      showPointNumbers: false,
    });
    const without = resolveBoardViewport({
      ...phone,
      slotWidth: 390,
      slotHeight: 300,
      extraChrome: 0,
      showPointNumbers: false,
    });
    expect(withExtra.boardOuterHeight).toBe(without.boardOuterHeight);
  });

  it('still applies extraChrome on the unmeasured Learn fallback path', () => {
    const game = resolveBoardViewport({ ...phone, extraChrome: 0, showPointNumbers: false });
    const learn = resolveBoardViewport({ ...phone, extraChrome: 80, showPointNumbers: false });
    expect(learn.boardOuterHeight).toBeLessThanOrEqual(game.boardOuterHeight);
  });

  it('fits a phone-landscape leftover slot (wide and short)', () => {
    const dims = resolveBoardViewport({
      screenWidth: 844,
      screenHeight: 390,
      platform: 'web',
      slotWidth: 540,
      slotHeight: 334,
      showPointNumbers: true,
    });
    expect(dims.boardOuterHeight + POINT_NUMBER_RAIL * 2).toBeLessThanOrEqual(334);
    expect(dims.boardOuterWidth).toBeLessThanOrEqual(540);
    expect(dims.boardOuterWidth).toBeGreaterThan(200);
  });

  it('keeps Point 1–24 inside the Learn leftover floor with point-number rails', () => {
    const dims = resolveBoardViewport({
      screenWidth: 390,
      screenHeight: 640,
      platform: 'web',
      slotWidth: 390,
      slotHeight: MIN_LEARN_BOARD_SLOT_HEIGHT,
      showPointNumbers: true,
    });
    expect(dims.boardOuterHeight + POINT_NUMBER_RAIL * 2).toBeLessThanOrEqual(
      MIN_LEARN_BOARD_SLOT_HEIGHT,
    );
    expect(dims.boardOuterWidth).toBeGreaterThan(200);
  });
});

describe('leftoverBoardHeight', () => {
  it('subtracts measured chrome instead of a magic pixel constant', () => {
    const leftover = leftoverBoardHeight({
      screenHeight: 844,
      headerHeight: 56,
      topChromeHeight: 120,
      controlsHeight: 96,
      bottomInset: 0,
    });
    // 844 - 56 - 120 - 68 - 96 - 0 = 504
    expect(leftover).toBe(504);
  });

  it('grows smaller when font-driven chrome gets taller', () => {
    const normal = leftoverBoardHeight({
      screenHeight: 844,
      headerHeight: 56,
      topChromeHeight: 90,
      controlsHeight: 80,
      bottomInset: 0,
    });
    const largeText = leftoverBoardHeight({
      screenHeight: 844,
      headerHeight: 72,
      topChromeHeight: 160,
      controlsHeight: 140,
      bottomInset: 0,
    });
    expect(largeText).toBeLessThan(normal);
    expect(largeText).toBeGreaterThanOrEqual(120);
  });

  it('ignores stacked chrome when the board sits beside dice/review', () => {
    const stacked = leftoverBoardHeight({
      screenHeight: 390,
      headerHeight: 56,
      topChromeHeight: 80,
      controlsHeight: 96,
      bottomInset: 0,
    });
    const sideBySide = leftoverBoardHeight({
      screenHeight: 390,
      headerHeight: 56,
      topChromeHeight: 80,
      controlsHeight: 96,
      bottomInset: 0,
      sideBySide: true,
    });
    expect(stacked).toBe(120);
    expect(sideBySide).toBe(334);
  });

  it('keeps side-by-side leftover independent of dice and review height', () => {
    const shortChrome = leftoverBoardHeight({
      screenHeight: 390,
      headerHeight: 56,
      topChromeHeight: 40,
      controlsHeight: 40,
      bottomInset: 0,
      sideBySide: true,
    });
    const tallChrome = leftoverBoardHeight({
      screenHeight: 390,
      headerHeight: 56,
      topChromeHeight: 200,
      controlsHeight: 180,
      bottomInset: 0,
      sideBySide: true,
    });
    expect(shortChrome).toBe(tallChrome);
    expect(tallChrome).toBe(334);
  });

  it('does not subtract the vs-computer review strip when Learn passes 0', () => {
    const game = leftoverBoardHeight({
      screenHeight: 844,
      headerHeight: 56,
      topChromeHeight: 140,
      controlsHeight: 72,
      bottomInset: 0,
    });
    const learn = leftoverBoardHeight({
      screenHeight: 844,
      headerHeight: 56,
      topChromeHeight: 140,
      reviewHeight: 0,
      controlsHeight: 72,
      bottomInset: 0,
      minHeight: MIN_LEARN_BOARD_SLOT_HEIGHT,
    });
    expect(learn).toBe(game + 68);
    expect(learn).toBeGreaterThanOrEqual(MIN_LEARN_BOARD_SLOT_HEIGHT);
  });
});

describe('learnCaptionMaxHeight', () => {
  it('keeps a 220px board slot on iPhone-width when coach copy is tall', () => {
    const captionMax = learnCaptionMaxHeight({
      screenHeight: 844,
      headerHeight: 56,
      footerHeight: 72,
      bottomInset: 34,
    });
    const boardLeftover = 844 - 56 - captionMax - 72 - 34;
    expect(boardLeftover).toBe(MIN_LEARN_BOARD_SLOT_HEIGHT);
    expect(captionMax).toBeGreaterThan(MIN_LEARN_CAPTION_HEIGHT);
  });

  it('scrolls coach copy instead of shrinking the board on a short large-text viewport', () => {
    const captionMax = learnCaptionMaxHeight({
      screenHeight: 640,
      headerHeight: 72,
      footerHeight: 160,
      bottomInset: 0,
    });
    const boardLeftover = 640 - 72 - captionMax - 160;
    expect(boardLeftover).toBe(MIN_LEARN_BOARD_SLOT_HEIGHT);
    expect(captionMax).toBeGreaterThanOrEqual(MIN_LEARN_CAPTION_HEIGHT);
  });

  it('never hides coach copy completely', () => {
    const captionMax = learnCaptionMaxHeight({
      screenHeight: 400,
      headerHeight: 72,
      footerHeight: 180,
      bottomInset: 34,
    });
    expect(captionMax).toBe(MIN_LEARN_CAPTION_HEIGHT);
  });
});
