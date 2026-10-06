import {
  computerAnticipationMs,
  computerMoveDelayMs,
  computerThinkDelayMs,
  OPENING_REVEAL_MS,
} from './computer-pace';

describe('computer pace', () => {
  it('lets the dice be read without the old slow-mode stare', () => {
    const roll = computerThinkDelayMs('rolling');
    expect(roll).toBeGreaterThan(350);
    expect(roll).toBeLessThan(800);
  });

  it('uses a short banner beat, shorter than the old fast-mode think', () => {
    expect(computerThinkDelayMs('moving')).toBeLessThan(140);
    expect(computerThinkDelayMs('moving')).toBeGreaterThan(0);
  });

  it('keeps the gap between computer checkers shorter than the old fast-mode gap plus think', () => {
    // Old fast mode stacked 140ms think + 180ms gap = 320ms of dead time.
    expect(computerAnticipationMs(3)).toBeLessThan(320);
    expect(computerMoveDelayMs(3)).toBeLessThan(180);
  });

  it('never moves the computer\'s first checker while the opening reveal is on screen', () => {
    expect(computerMoveDelayMs(0)).toBeGreaterThan(OPENING_REVEAL_MS);
    // Old slow mode added 400ms after the reveal. Stay close to the reveal.
    expect(computerMoveDelayMs(0) - OPENING_REVEAL_MS).toBeLessThan(200);
  });

  it('rolls the computer\'s opening die quickly so both dice land together', () => {
    expect(computerThinkDelayMs('opening-roll')).toBeLessThan(computerThinkDelayMs('rolling'));
    expect(computerThinkDelayMs('opening-roll')).toBeLessThan(600);
  });

  it('gives a no-move beat that can be read and is not the old 1600ms wait', () => {
    const noMove = computerThinkDelayMs('no-move');
    expect(noMove).toBeGreaterThan(400);
    expect(noMove).toBeLessThan(1000);
  });
});
