import { shouldCelebrateWin } from '@/features/game/win-celebration';

describe('shouldCelebrateWin', () => {
  it('fires on transition into game-over for human win vs computer', () => {
    expect(
      shouldCelebrateWin({
        prevPhase: 'moving',
        nextPhase: 'game-over',
        mode: 'vs-computer',
        winner: 'white',
        isReviewing: false,
      }),
    ).toBe(true);
  });

  it('skips computer wins', () => {
    expect(
      shouldCelebrateWin({
        prevPhase: 'moving',
        nextPhase: 'game-over',
        mode: 'vs-computer',
        winner: 'black',
        isReviewing: false,
      }),
    ).toBe(false);
  });

  it('celebrates either color in hot-seat', () => {
    expect(
      shouldCelebrateWin({
        prevPhase: 'moving',
        nextPhase: 'game-over',
        mode: 'vs-human',
        winner: 'black',
        isReviewing: false,
      }),
    ).toBe(true);
  });

  it('skips review scrubbing and non-transitions', () => {
    expect(
      shouldCelebrateWin({
        prevPhase: 'moving',
        nextPhase: 'game-over',
        mode: 'vs-human',
        winner: 'white',
        isReviewing: true,
      }),
    ).toBe(false);
    expect(
      shouldCelebrateWin({
        prevPhase: 'game-over',
        nextPhase: 'game-over',
        mode: 'vs-human',
        winner: 'white',
        isReviewing: false,
      }),
    ).toBe(false);
  });
});
