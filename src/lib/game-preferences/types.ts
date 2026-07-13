export type DiceDisplayStyle = 'numbers' | 'dots';

export type GamePreferences = {
  showMoveHints: boolean;
  showDirectionOverlay: boolean;
  showPointNumbers: boolean;
  diceDisplayStyle: DiceDisplayStyle;
  autoRoll: boolean;
  autoMoveWhenForced: boolean;
};

export const DEFAULT_GAME_PREFERENCES: GamePreferences = {
  showMoveHints: false,
  showDirectionOverlay: false,
  showPointNumbers: false,
  diceDisplayStyle: 'dots',
  autoRoll: false,
  autoMoveWhenForced: false,
};
