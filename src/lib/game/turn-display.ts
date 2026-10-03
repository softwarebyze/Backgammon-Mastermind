import type { GameMode, GamePhase, GameState, Player } from '@/lib/game/types';
import { translate } from '@/lib/i18n';

export type TurnDisplay = {
  player: Player;
  /** Short color name shown beside the checker disc */
  colorLabel: string;
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
  const colorLabel = playerLabel(state.currentPlayer);

  if (state.phase === 'game-over') {
    return {
      player: state.currentPlayer,
      colorLabel,
      headline: translate('game.turn.game_over'),
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
      headline: translate('game.turn.opening_roll'),
      isHumanTurn: !isComputerOpening,
      isWaiting: isComputerOpening,
    };
  }

  if (isComputerTurn) {
    return {
      player: 'black',
      colorLabel: playerLabel('black'),
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
    return translate('game.turn.your_turn');
  }
  return translate(player === 'white' ? 'game.turn.white_turn' : 'game.turn.black_turn');
}

export function playerLabel(player: Player): string {
  return translate(player === 'white' ? 'game.review.player_white' : 'game.review.player_black');
}

/** One player-named line in the banner — footer is skip-wait only. */
function computerWaitHeadline(phase: GamePhase): string {
  if (phase === 'rolling') {
    return translate('game.turn.black_is_rolling');
  }
  if (phase === 'moving') {
    return translate('game.turn.black_is_moving');
  }
  return translate('game.turn.computer_turn');
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
    return translate('game.turn.roll_dice', { color: turn.colorLabel });
  }
  if (state.phase === 'moving' && turn.isHumanTurn) {
    if (state.bar[state.currentPlayer] > 0) {
      return translate('game.turn.enter_from_bar');
    }
    if (state.selectedPoint !== null) {
      return translate('game.caption.selected');
    }
    return translate('game.turn.move_checkers', { color: turn.colorLabel.toLocaleLowerCase() });
  }
  if (state.phase === 'no-move' && turn.isHumanTurn) {
    const [d1, d2] = state.dice;
    if (state.bar[state.currentPlayer] > 0) {
      return translate('game.turn.cant_enter', { die1: d1, die2: d2 });
    }
    return translate('game.turn.no_legal_moves', { die1: d1, die2: d2 });
  }
  return ' ';
}
