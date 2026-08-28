import {
  COMPUTER_CHECKER_MOVE_DURATION_MS,
  computerCheckerMoveDurationMs,
  computerMoveDelayMs,
  computerThinkDelayMs,
  FAST_COMPUTER_CHECKER_MOVE_DURATION_MS,
  FAST_COMPUTER_MOVE_DELAY_MS,
  FAST_OPENING_CEREMONY_GRACE_MS,
  OPENING_CEREMONY_GRACE_MS,
} from './computer-pace';

describe('computer pace', () => {
  it('gives the human time to see a normal computer roll', () => {
    expect(computerThinkDelayMs('rolling', false)).toBeGreaterThanOrEqual(1200);
    expect(computerThinkDelayMs('opening-roll', false)).toBeGreaterThanOrEqual(1200);
  });

  it('gives the human a moving beat before the first checker slides', () => {
    expect(computerThinkDelayMs('moving', false)).toBeGreaterThanOrEqual(500);
    expect(computerThinkDelayMs('moving', true)).toBeLessThan(computerThinkDelayMs('moving', false));
  });

  it('slides computer checkers slower than a skipped wait would imply', () => {
    expect(computerCheckerMoveDurationMs(false)).toBe(COMPUTER_CHECKER_MOVE_DURATION_MS);
    expect(computerCheckerMoveDurationMs(true)).toBe(FAST_COMPUTER_CHECKER_MOVE_DURATION_MS);
    expect(computerCheckerMoveDurationMs(false)).toBeGreaterThan(computerCheckerMoveDurationMs(true));
  });

  it('shortens delays when fast computer is on', () => {
    expect(computerThinkDelayMs('rolling', true)).toBeLessThan(computerThinkDelayMs('rolling', false));
    expect(computerMoveDelayMs(3, true)).toBe(FAST_COMPUTER_MOVE_DELAY_MS);
  });

  it('keeps opening-ceremony grace on the computer\'s first move', () => {
    expect(computerMoveDelayMs(0, false)).toBe(OPENING_CEREMONY_GRACE_MS);
    expect(computerMoveDelayMs(0, true)).toBe(FAST_OPENING_CEREMONY_GRACE_MS);
  });
});
