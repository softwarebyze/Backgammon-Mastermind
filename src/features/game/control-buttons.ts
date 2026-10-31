import { StyleSheet } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';
import { continuousRadius } from '@/lib/ui/native-styles';

/** Every button under the board is this tall, so a row of them never steps (#319). */
const CONTROL_BUTTON_HEIGHT = 50;

/** The two button looks under the board: filled (Roll, Confirm, Take) and outlined (Hint, Undo, Double, Pass). */
export const controlButtonStyles = StyleSheet.create({
  primary: {
    height: CONTROL_BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GAME_PALETTE.control,
    borderWidth: 1.5,
    borderColor: GAME_PALETTE.controlBorder,
    boxShadow: '0 2px 8px rgba(0, 0, 0, 0.25)',
    ...continuousRadius(12),
  },
  primaryText: {
    color: GAME_PALETTE.controlInk,
    fontSize: 16,
    ...interFont('semibold'),
  },
  secondary: {
    height: CONTROL_BUTTON_HEIGHT,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1.5,
    borderColor: 'rgba(232, 224, 208, 0.35)',
    ...continuousRadius(12),
  },
  secondaryText: {
    color: GAME_PALETTE.accent,
    fontSize: 16,
    ...interFont('semibold'),
  },
});
