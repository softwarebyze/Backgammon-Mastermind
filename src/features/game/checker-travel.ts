import { BAR_POINT, BEAR_OFF } from '@/lib/game/constants';

export type MovePace = 'human' | 'computer';

/**
 * Human hops stay snappy. Computer slides are slower so a move can be read,
 * but still well under the old non-fast 720ms.
 * A 1-pip step uses the minimum; a 12-pip run uses the maximum.
 */
export const HUMAN_TRAVEL_MIN_MS = 260;
export const HUMAN_TRAVEL_MAX_MS = 400;
export const COMPUTER_TRAVEL_MIN_MS = 400;
export const COMPUTER_TRAVEL_MAX_MS = 620;

/**
 * Cubic-bezier control points. y1 is 0 so the checker starts from rest
 * (a short anticipation) instead of launching at full speed the way
 * ease-out did. The long second half is the settle.
 */
export const CHECKER_TRAVEL_EASE = { x1: 0.42, y1: 0, x2: 0.2, y2: 1 } as const;

const PIP_MIN = 1;
const PIP_MAX = 12;

/** How far a slide reads, in pips. Bar entry and bear-off are short hops. */
export function travelPips(from: number, to: number): number {
  if (from === to) {
    return PIP_MIN;
  }
  if (from === BAR_POINT) {
    if (to >= 19 && to <= 24) {
      return 25 - to;
    }
    if (to >= 1 && to <= 6) {
      return to;
    }
    return 6;
  }
  if (to === BAR_POINT) {
    return 5;
  }
  if (to === BEAR_OFF || from === BEAR_OFF) {
    return 3;
  }
  return Math.min(PIP_MAX, Math.max(PIP_MIN, Math.abs(to - from)));
}

export function checkerTravelDurationMs(opts: {
  from: number;
  to: number;
  pace?: MovePace;
}): number {
  const pace = opts.pace ?? 'human';
  const pips = travelPips(opts.from, opts.to);
  const span = Math.min(1, Math.max(0, (pips - PIP_MIN) / (PIP_MAX - PIP_MIN)));
  const min = pace === 'computer' ? COMPUTER_TRAVEL_MIN_MS : HUMAN_TRAVEL_MIN_MS;
  const max = pace === 'computer' ? COMPUTER_TRAVEL_MAX_MS : HUMAN_TRAVEL_MAX_MS;
  return Math.round(min + (max - min) * span);
}
