/** Opening ceremony overlay: 2400ms hold + 520ms fly in opening-roll-ceremony.tsx. */
export const OPENING_CEREMONY_GRACE_MS = 3200;

const COMPUTER_ROLL_DELAY_MS = 1400;
const COMPUTER_NO_MOVE_DELAY_MS = 1600;
const COMPUTER_MOVE_DELAY_MS = 1100;
/** Beat so "Black is moving…" paints before the first slide (was 0). */
const COMPUTER_MOVING_THINK_MS = 600;
export const COMPUTER_CHECKER_MOVE_DURATION_MS = 720;

const FAST_COMPUTER_ROLL_DELAY_MS = 350;
const FAST_COMPUTER_NO_MOVE_DELAY_MS = 400;
export const FAST_COMPUTER_MOVE_DELAY_MS = 180;
export const FAST_OPENING_CEREMONY_GRACE_MS = 800;
const FAST_COMPUTER_MOVING_THINK_MS = 140;
export const FAST_COMPUTER_CHECKER_MOVE_DURATION_MS = 280;

export function computerThinkDelayMs(
  phase: string,
  fast: boolean,
): number {
  if (phase === 'opening-roll' || phase === 'rolling') {
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
    return fast ? FAST_OPENING_CEREMONY_GRACE_MS : OPENING_CEREMONY_GRACE_MS;
  }
  return fast ? FAST_COMPUTER_MOVE_DELAY_MS : COMPUTER_MOVE_DELAY_MS;
}

export function computerCheckerMoveDurationMs(fast: boolean): number {
  return fast ? FAST_COMPUTER_CHECKER_MOVE_DURATION_MS : COMPUTER_CHECKER_MOVE_DURATION_MS;
}
