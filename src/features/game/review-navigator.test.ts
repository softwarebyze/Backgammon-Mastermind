import { planReviewNavigation, reviewScrubberPly } from '@/features/game/review-navigator';

describe('review-navigator', () => {
  it('jumps adjacent plies instantly (consistent scrubbing)', () => {
    expect(planReviewNavigation(1, 2, 5)).toEqual({ mode: 'jump', ply: 2 });
  });

  it('plans instant jump for multi-ply jumps', () => {
    expect(planReviewNavigation(4, 1, 6)).toEqual({ mode: 'jump', ply: 1 });
  });

  it('jumps forward to the live ply', () => {
    expect(planReviewNavigation(1, 2, 2)).toEqual({ mode: 'jump', ply: 2 });
  });

  it('noops when already parked at the target ply', () => {
    expect(planReviewNavigation(2, 2, 2)).toEqual({ mode: 'noop' });
  });

  it('goes past live only when target exceeds the head', () => {
    expect(planReviewNavigation(2, 3, 2)).toEqual({ mode: 'live' });
  });

  it('scrubber ply stays at board position during forward anim', () => {
    expect(reviewScrubberPly(0, 2, 'forward')).toBe(1);
  });

  it('scrubber ply stays at board position during backward anim', () => {
    expect(reviewScrubberPly(3, 1, 'backward')).toBe(2);
  });
});
