import { GAME_CHROME_MAX_WIDTH, MAX_BOARD_WIDTH } from '@/lib/ui/game-chrome';

describe('game chrome layout', () => {
  it('keeps phone-like chrome narrower than the board stage', () => {
    expect(GAME_CHROME_MAX_WIDTH).toBeLessThan(MAX_BOARD_WIDTH);
    expect(MAX_BOARD_WIDTH).toBe(720);
  });
});
