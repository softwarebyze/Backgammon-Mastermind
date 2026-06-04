export type DiceDisplayStyle = 'numbers' | 'dots';

export type GamePreferences = {
  showMoveHints: boolean;
  showDirectionOverlay: boolean;
  diceDisplayStyle: DiceDisplayStyle;
};

export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  showMoveHints: false,
  showDirectionOverlay: false,
  diceDisplayStyle: 'numbers',
};
