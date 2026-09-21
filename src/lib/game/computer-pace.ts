/**
 * Opening roll: after both dice land, the tray holds the white-vs-black reveal
 * (winner emphasized) before the dice recolor to the winner. The computer's
 * first move waits for this — no moving while the reveal is still on screen.
 */
export const OPENING_REVEAL_MS = 1100;
/** Tied opening dice sit for this long before they clear and re-roll. */
export const OPENING_TIE_MS = 900;
/** Beat between the human's opening die and the computer's, so both land together. */
const OPENING_AI_ROLL_DELAY_MS = 450;
const FAST_OPENING_AI_ROLL_DELAY_MS = 250;
const OPENING_FIRST_MOVE_GRACE_MS = OPENING_REVEAL_MS + 400;
export const FAST_OPENING_FIRST_MOVE_GRACE_MS = OPENING_REVEAL_MS + 100;

const COMPUTER_ROLL_DELAY_MS = 1400;
const COMPUTER_NO_MOVE_DELAY_MS = 1600;
const COMPUTER_MOVE_DELAY_MS = 1100;
/** Beat so the banner can paint "Black is moving…" before the first slide (was 0). */
const COMPUTER_MOVING_THINK_MS = 600;
export const COMPUTER_CHECKER_MOVE_DURATION_MS = 720;

const FAST_COMPUTER_ROLL_DELAY_MS = 350;
const FAST_COMPUTER_NO_MOVE_DELAY_MS = 400;
export const FAST_COMPUTER_MOVE_DELAY_MS = 180;
const FAST_COMPUTER_MOVING_THINK_MS = 140;
export const FAST_COMPUTER_CHECKER_MOVE_DURATION_MS = 280;

export function computerThinkDelayMs(
  phase: string,
  fast: boolean,
): number {
  if (phase === 'opening-roll') {
    return fast ? FAST_OPENING_AI_ROLL_DELAY_MS : OPENING_AI_ROLL_DELAY_MS;
  }
  if (phase === 'rolling') {
    return fast ? FAST_COMPUTER_ROLL_DELAY_MS : COMPUTER_ROLL_DELAY_MS;
  }
  if (phase === 'no-move') {
    return fast ? FAST_COMPUTER_NO_MOVE_DELAY_MS : COMPUTER_NO_MOVE_DELAY_MS;
  }
  if (phase === 'moving') {
    return fast ? FAST_COMPUTER_MOVING_THINK_MS : COMPUTER_MOVING_THINK_MS;
  }
  return 0;
}

export function computerMoveDelayMs(moveCount: number, fast: boolean): number {
  if (moveCount === 0) {
    return fast ? FAST_OPENING_FIRST_MOVE_GRACE_MS : OPENING_FIRST_MOVE_GRACE_MS;
  }
  return fast ? FAST_COMPUTER_MOVE_DELAY_MS : COMPUTER_MOVE_DELAY_MS;
}

export function computerCheckerMoveDurationMs(fast: boolean): number {
  return fast ? FAST_COMPUTER_CHECKER_MOVE_DURATION_MS : COMPUTER_CHECKER_MOVE_DURATION_MS;
}
