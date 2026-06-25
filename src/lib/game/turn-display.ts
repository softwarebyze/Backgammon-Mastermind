import type { GameMode, GameState, Player } from '@/lib/game/types';

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
    const isComputerTurn
      = state.mode === 'vs-computer' && state.currentPlayer === 'black';
    const isHumanTurn = !isComputerTurn;
    return {
      player: state.currentPlayer,
      colorLabel,
      headline: isHumanTurn ? humanHeadline(state.mode, state.currentPlayer) : opponentHeadline(state.mode),
      isHumanTurn,
      isWaiting: !isHumanTurn,
    };
  }

  if (isComputerTurn) {
    return {
      player: 'black',
      colorLabel: 'Black',
      headline: opponentHeadline(state.mode),
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

function opponentHeadline(mode: GameMode): string {
  return mode === 'vs-computer' ? 'Computer\'s turn' : 'Black\'s turn';
}

export function getActionCaption(
  state: GameState,
  turn: TurnDisplay,
): string {
  if (state.phase === 'opening-roll' && turn.isHumanTurn) {
    return `Roll for opening — you play ${turn.colorLabel.toUpperCase()}`;
  }
  if (state.phase === 'opening-roll' && turn.isWaiting) {
    return turn.player === 'black'
      ? 'Black is rolling for opening…'
      : 'Opponent is rolling for opening…';
  }
  if (state.phase === 'rolling' && turn.isHumanTurn) {
    return `Roll dice — you play ${turn.colorLabel.toUpperCase()}`;
  }
  if (state.phase === 'rolling' && turn.isWaiting) {
    return turn.player === 'black'
      ? 'Black is rolling…'
      : 'Opponent is rolling…';
  }
  if (state.phase === 'moving' && turn.isWaiting) {
    return turn.player === 'black'
      ? 'Black is moving…'
      : 'Opponent is moving…';
  }
  if (state.phase === 'moving' && turn.isHumanTurn) {
    if (state.bar[state.currentPlayer] > 0) {
      return 'Enter from the bar before moving other checkers';
    }
    if (state.selectedPoint !== null) {
      return `Selected — tap a highlight or tap the board to cancel`;
    }
    return `Move your ${turn.colorLabel.toLowerCase()} checkers`;
  }
  return ' ';
}
