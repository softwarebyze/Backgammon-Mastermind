import { fitBoardToViewport } from '@/features/game/hooks/use-board-dimensions';

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
