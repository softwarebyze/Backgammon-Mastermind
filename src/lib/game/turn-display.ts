import type { GameMode, GamePhase, GameState, Player } from '@/lib/game/types';
import { translate } from '@/lib/i18n';

export type TurnDisplay = {
  player: Player;
  /** Short color name shown beside the checker disc */
  colorLabel: 'White' | 'Black';
  /** Main turn message */
  headline: string;
  /** Whether the local human should act right now */
  isHumanTurn: boolean;
  /** Opponent / waiting state */
  isWaiting: boolean;
};

export function getTurnDisplay(state: GameState): TurnDisplay {
  const isComputerTurn
    = state.mode === 'vs-computer' && state.currentPlayer === 'black';
  const isHumanTurn = !isComputerTurn;
  const colorLabel = state.currentPlayer === 'white' ? 'White' : 'Black';

  if (state.phase === 'game-over') {
    return {
      player: state.currentPlayer,
      colorLabel,
      headline: 'Game over',
      isHumanTurn: false,
      isWaiting: true,
    };
  }

  if (state.phase === 'opening-roll') {
    const isComputerOpening
      = state.mode === 'vs-computer' && state.currentPlayer === 'black';
    return {
      player: state.currentPlayer,
      colorLabel,
      // Ceremony owns the copy — keep the banner quiet so we don't say it 3×.
      headline: isComputerOpening ? 'Opening roll' : 'Opening roll',
      isHumanTurn: !isComputerOpening,
      isWaiting: isComputerOpening,
    };
  }

  if (isComputerTurn) {
    return {
      player: 'black',
      colorLabel: 'Black',
      headline: computerWaitHeadline(state.phase),
      isHumanTurn: false,
      isWaiting: true,
    };
  }

  return {
    player: state.currentPlayer,
    colorLabel,
    headline: humanHeadline(state.mode, state.currentPlayer),
    isHumanTurn,
    isWaiting: false,
  };
}

function humanHeadline(mode: GameMode, player: Player): string {
  if (mode === 'vs-computer') {
    return 'Your turn';
  }
  return player === 'white' ? 'White\'s turn' : 'Black\'s turn';
}

/** One player-named line in the banner — footer is skip-wait only. */
function computerWaitHeadline(phase: GamePhase): string {
  if (phase === 'rolling') {
    return 'Black is rolling…';
  }
  if (phase === 'moving') {
    return 'Black is moving…';
  }
  return 'Computer\'s turn';
}

export function getActionCaption(
  state: GameState,
  turn: TurnDisplay,
): string {
  // Opening ceremony owns the messaging — keep the footer quiet.
  if (state.phase === 'opening-roll') {
    return ' ';
  }
  // Banner already says whose turn it is. Don't stack "Black is moving…"
  // under a footer "Moving…" (or Rolling…) during computer wait.
  if (turn.isWaiting && (state.phase === 'rolling' || state.phase === 'moving')) {
    return ' ';
  }
  if (state.phase === 'rolling' && turn.isHumanTurn) {
    return `Roll dice — you play ${turn.colorLabel.toUpperCase()}`;
  }
  if (state.phase === 'moving' && turn.isHumanTurn) {
    if (state.bar[state.currentPlayer] > 0) {
      return 'Enter from the bar before moving other checkers';
    }
    if (state.selectedPoint !== null) {
      return translate('game.caption.selected');
    }
    return `Move your ${turn.colorLabel.toLowerCase()} checkers`;
  }
  if (state.phase === 'no-move' && turn.isHumanTurn) {
    const [d1, d2] = state.dice;
    if (state.bar[state.currentPlayer] > 0) {
      return `Can't enter from the bar with ${d1} and ${d2} — end your turn`;
    }
    return `No legal moves with ${d1} and ${d2} — end your turn`;
  }
  return ' ';
}
