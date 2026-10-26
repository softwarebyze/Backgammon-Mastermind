import type { GameState } from '@/lib/game';
import { useCallback, useRef, useState } from 'react';
import { orderedDice } from './dice-order';

export function useDiceOrder(state: GameState | null) {
  const key = `${state?.mode}|${state?.phase}|${state?.currentPlayer}|${state?.dice.join(',')}`;
  const [order, setOrder] = useState({ key, reversed: false });
  // Reset on the transition itself: an old key can recur on a later roll.
  if (order.key !== key) {
    setOrder({ key, reversed: false });
  }
  const reversed = order.key === key && order.reversed;
  const reversedRef = useRef(reversed);
  reversedRef.current = reversed;
  const swapDice = useCallback(() => {
    // Publish synchronously so swap then tap before a render uses the shown order.
    reversedRef.current = !reversedRef.current;
    setOrder({ key, reversed: reversedRef.current });
  }, [key]);
  return { displayedDice: orderedDice(state?.dice ?? [0, 0], reversed), reversedRef, swapDice };
}
