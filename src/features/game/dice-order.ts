import type { GameState, Move } from '@/lib/game';
import { getLegalMoves } from '@/lib/game';

/** Logical leading-to-trailing order. The tray renders this row in locale direction. */
export function orderedDice(dice: [number, number], reversed: boolean): [number, number] {
  return reversed ? [dice[1], dice[0]] : dice;
}

export function leadingUnspentDie(state: GameState, reversed: boolean): number | undefined {
  return orderedDice(state.dice, reversed).find(die => state.remainingDice.includes(die));
}

/** Legal moves already enforce maximum dice, higher die, bar priority and bear-off. */
export function diceOrderMove(state: GameState, from: number, reversed: boolean): Move | null {
  if (state.phase !== 'moving')
    return null;
  const die = leadingUnspentDie(state, reversed);
  return getLegalMoves(state).find(move => move.from === from
    && state.remainingDice[move.dieIndex] === die) ?? null;
}
