/**
 * One computer pace. The fast/slow toggle is gone.
 *
 * Fast mode (the old default) waited, then the checker launched: 140ms think
 * + 180ms gap, then a 280ms ease-out. Slow mode waited 600ms + 1100ms, then
 * slid for 720ms. This pace keeps the wait shorter than fast mode and spends
 * the time in the slide instead (see checker-travel.ts).
 *
 * Opening roll: after both dice land, the tray holds the white-vs-black reveal
 * (winner emphasized) before the dice recolor to the winner. The computer's
 * first move waits for this — no moving while the reveal is still on screen.
 */
export const OPENING_REVEAL_MS = 1100;
/** Tied opening dice sit for this long before they clear and re-roll. */
export const OPENING_TIE_MS = 900;

/** Beat between the human's opening die and the computer's, so both land together. */
const OPENING_AI_ROLL_DELAY_MS = 300;
/** Just after the reveal ends. Old fast mode used +100ms, slow mode +400ms. */
const OPENING_FIRST_MOVE_GRACE_MS = OPENING_REVEAL_MS + 80;

/** Was 350ms fast / 1400ms slow. Long enough to read the dice, not a stare. */
const COMPUTER_ROLL_DELAY_MS = 480;
/** Was 400ms fast / 1600ms slow. */
const COMPUTER_NO_MOVE_DELAY_MS = 640;
/**
 * Gap after the think beat, before the checker leaves. Was 180ms fast / 1100ms slow.
 * Together with the think beat this is the anticipation, and it stays shorter
 * than the slide.
 */
const COMPUTER_MOVE_DELAY_MS = 120;
/** Banner beat ("Black is moving…") before the move is chosen. Was 140 / 600. */
const COMPUTER_MOVING_THINK_MS = 80;

export function computerThinkDelayMs(phase: string): number {
  if (phase === 'opening-roll') {
    return OPENING_AI_ROLL_DELAY_MS;
  }
  if (phase === 'rolling') {
    return COMPUTER_ROLL_DELAY_MS;
  }
  if (phase === 'no-move') {
    return COMPUTER_NO_MOVE_DELAY_MS;
  }
  if (phase === 'moving') {
    return COMPUTER_MOVING_THINK_MS;
  }
  return 0;
}

export function computerMoveDelayMs(moveCount: number): number {
  if (moveCount === 0) {
    return OPENING_FIRST_MOVE_GRACE_MS;
  }
  return COMPUTER_MOVE_DELAY_MS;
}

/** Think beat plus the pre-slide gap. This is the pause before a checker moves. */
export function computerAnticipationMs(moveCount: number): number {
  return computerThinkDelayMs('moving') + computerMoveDelayMs(moveCount);
}
