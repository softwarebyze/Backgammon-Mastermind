import type { OpeningReveal } from '@/lib/game/opening-display';
import type { GameState } from '@/lib/game/types';
import { useEffect, useRef, useState } from 'react';

import { OPENING_REVEAL_MS, OPENING_TIE_MS } from '@/lib/game/computer-pace';
import { openingJustResolved } from '@/lib/game/opening-display';

/**
 * Holds the white-vs-black opening dice in the tray for OPENING_REVEAL_MS after
 * the engine resolves the first turn, and auto-clears a tied opening after
 * OPENING_TIE_MS. Purely presentational: the board is playable immediately.
 */
export function useOpeningReveal(
  live: GameState | null,
  clearTie: () => void,
): OpeningReveal | null {
  const [reveal, setReveal] = useState<OpeningReveal | null>(null);
  // react.dev "storing information from previous renders": detect the
  // opening-roll → first-turn transition without an effect.
  const [prevLive, setPrevLive] = useState(live);
  if (live !== prevLive) {
    setPrevLive(live);
    if (live?.phase === 'opening-roll') {
      if (reveal) {
        setReveal(null); // new game / reset while a reveal was showing
      }
    }
    else {
      const resolved = prevLive && live ? openingJustResolved(prevLive, live) : null;
      if (resolved) {
        setReveal(resolved);
      }
    }
  }

  // Keyed on the reveal itself, so a checker move during the hold can't cancel it.
  useEffect(() => {
    if (!reveal) {
      return;
    }
    const id = setTimeout(() => setReveal(null), OPENING_REVEAL_MS);
    return () => clearTimeout(id);
  }, [reveal]);

  const clearTieRef = useRef(clearTie);
  clearTieRef.current = clearTie;
  const tied = live?.phase === 'opening-roll'
    && live.openingRolls.white !== null
    && live.openingRolls.white === live.openingRolls.black;

  useEffect(() => {
    if (!tied) {
      return;
    }
    const id = setTimeout(() => clearTieRef.current(), OPENING_TIE_MS);
    return () => clearTimeout(id);
  }, [tied]);

  return reveal;
}
