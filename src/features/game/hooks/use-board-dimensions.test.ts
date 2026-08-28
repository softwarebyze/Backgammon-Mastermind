import { POINT_NUMBER_RAIL } from '@/features/game/board-point-layout';
import { fitBoardToViewport, resolveBoardViewport } from '@/features/game/hooks/use-board-dimensions';
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
});
