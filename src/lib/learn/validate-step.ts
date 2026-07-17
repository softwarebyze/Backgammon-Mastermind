import type { GameState } from '@/lib/game/types';

import { findMoveSequence, getLegalMoves } from '@/lib/game/moves';

export type AcceptedMove = {
  from: number;
  to: number;
};

export type ValidateStatus = 'correct' | 'illegal' | 'legalButWrong';

export type ValidateResult = {
  status: ValidateStatus;
};

export type TryMoveValidation = {
  state: GameState;
  accepted: readonly AcceptedMove[];
  from: number;
  to: number;
};

/** Identify steps: tap must match one of the accepted point indices (0 = bar). */
export function validateIdentify(
  acceptedPoints: readonly number[],
  tappedPoint: number,
): ValidateResult {
  if (acceptedPoints.includes(tappedPoint)) {
    return { status: 'correct' };
  }
  return { status: 'illegal' };
}

function isAcceptedMove(
  accepted: readonly AcceptedMove[],
  from: number,
  to: number,
): boolean {
  return accepted.some(move => move.from === from && move.to === to);
}

function isLegalDestination(state: GameState, from: number, to: number): boolean {
  if (getLegalMoves(state).some(move => move.from === from && move.to === to)) {
    return true;
  }
  const sequence = findMoveSequence(state, from, to);
  return sequence !== null && sequence.length > 0;
}

/**
 * Try-move steps: accepted curriculum moves are `correct`.
 * Other legal paths are `legalButWrong` (soft fail). Illegal landings are `illegal`.
 */
export function validateTryMove({
  state,
  accepted,
  from,
  to,
}: TryMoveValidation): ValidateResult {
  if (isAcceptedMove(accepted, from, to)) {
    return { status: 'correct' };
  }
  if (isLegalDestination(state, from, to)) {
    return { status: 'legalButWrong' };
  }
  return { status: 'illegal' };
}

/** Resolve the engine Move to apply for an accepted from→to (single die or compound). */
export function resolveAcceptedMove(
  state: GameState,
  from: number,
  to: number,
): ReturnType<typeof getLegalMoves>[number] | null {
  const direct = getLegalMoves(state).find(move => move.from === from && move.to === to);
  if (direct) {
    return direct;
  }
  const sequence = findMoveSequence(state, from, to);
  return sequence?.[0] ?? null;
}
