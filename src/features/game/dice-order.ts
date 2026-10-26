import type { GameState, Move } from '@/lib/game';
import { getLegalMoves } from '@/lib/game';

/** Logical leading-to-trailing order. The tray renders this row in locale direction. */
export function orderedDice(dice: [number, number], reversed: boolean): [number, number] {
  return reversed ? [dice[1], dice[0]] : dice;
}

export function leadingUnspentDie(state: GameState, reversed: boolean): number | undefined {
  return orderedDice(state.dice, reversed).find(die => state.remainingDice.includes(die));
}

/** Prefer the displayed leading die, using only moves allowed by every game rule. */
export function diceOrderMove(state: GameState, from: number, reversed: boolean): Move | null {
  if (state.phase !== 'moving')
    return null;
  const die = leadingUnspentDie(state, reversed);
  const moves = getLegalMoves(state).filter(move => move.from === from);
  return moves.find(move => state.remainingDice[move.dieIndex] === die) ?? moves[0] ?? null;
}
