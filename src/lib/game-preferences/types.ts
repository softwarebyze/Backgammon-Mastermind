export type DiceDisplayStyle = 'numbers' | 'dots';

export type GamePreferences = {
  showMoveHints: boolean;
  showDirectionOverlay: boolean;
  diceDisplayStyle: DiceDisplayStyle;
  autoRoll: boolean;
  autoMoveWhenForced: boolean;
};

export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  showMoveHints: false,
  showDirectionOverlay: false,
  diceDisplayStyle: 'numbers',
  autoRoll: false,
  autoMoveWhenForced: false,
};
