import { learnHomeHref } from './learn-home-href';

describe('learnHomeHref', () => {
  it('opens the hub even when the player is ready to play', () => {
    expect(learnHomeHref()).toBe('/learn');
  });
});
