import type { GameState, Player } from '@/lib/game/types';
import { translate } from '@/lib/i18n';

import { playerLabel } from './turn-display';

/** Both opening dice have landed; the tray holds them white-vs-black before recoloring. */
export type OpeningReveal = {
  white: number;
  black: number;
  winner: Player;
};

/** What the dice tray shows while the opening is unresolved or being revealed. */
export type OpeningTray = {
  /** [white die, black die]; 0 = not rolled yet. */
  dice: [number, number];
  /** Index of the die to emphasize (0 white, 1 black), or null. */
  emphasis: 0 | 1 | null;
};

function isTiedOpening(state: GameState): boolean {
  const { white, black } = state.openingRolls;
  return white !== null && black !== null && white === black;
}

/** Tray contents during the opening, or null once normal play owns the tray. */
export function openingTray(state: GameState, reveal: OpeningReveal | null): OpeningTray | null {
  if (reveal) {
    return { dice: [reveal.white, reveal.black], emphasis: reveal.winner === 'white' ? 0 : 1 };
  }
  if (state.phase !== 'opening-roll') {
    return null;
  }
  return {
    dice: [state.openingRolls.white ?? 0, state.openingRolls.black ?? 0],
    emphasis: null,
  };
}

/** Banner headline + footer caption during the opening, or null. */
export function openingCopy(
  state: GameState,
  reveal: OpeningReveal | null,
): { headline: string; caption: string } | null {
  if (reveal) {
    const winner = playerLabel(reveal.winner);
    const [high, low] = reveal.winner === 'white'
      ? [reveal.white, reveal.black]
      : [reveal.black, reveal.white];
    return {
      headline: translate('game.opening.goes_first', { player: winner }),
      caption: translate('game.opening.compare', { winner, high, low }),
    };
  }
  if (state.phase !== 'opening-roll') {
    return null;
  }
  if (isTiedOpening(state)) {
    return {
      headline: translate('game.opening.tie'),
      caption: translate('game.opening.tie_again'),
    };
  }
  const roller = playerLabel(state.currentPlayer);
  const computerRolling = state.mode === 'vs-computer' && state.currentPlayer === 'black';
  return {
    headline: translate('game.opening.who_goes_first'),
    caption: computerRolling
      ? translate('game.opening.waiting_roll', { player: roller })
      : translate('game.opening.rolls_for_opening', { player: roller }),
  };
}

/**
 * The opening just resolved: previous frame was `opening-roll`, this one is not,
 * and the engine seeded the first turn's dice as [whiteDie, blackDie].
 */
export function openingJustResolved(prev: GameState, next: GameState): OpeningReveal | null {
  if (prev.phase !== 'opening-roll' || next.phase === 'opening-roll') {
    return null;
  }
  const [white, black] = next.dice;
  if (white === 0 || black === 0 || white === black) {
    return null;
  }
  return { white, black, winner: next.currentPlayer };
}
