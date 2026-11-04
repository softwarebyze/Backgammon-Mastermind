import { StyleSheet } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';

/** Shared by the dice and cube pickers. */
export const pickerStyles = StyleSheet.create({
  overlay: {
    position: 'absolute',
    top: 0,
    right: 0,
    bottom: 0,
    left: 0,
    alignItems: 'center',
    justifyContent: 'center',
    padding: 16,
    backgroundColor: 'rgba(10, 4, 1, 0.6)',
  },
  card: {
    alignItems: 'center',
    gap: 8,
    padding: 12,
    maxWidth: 360,
    borderRadius: 16,
    backgroundColor: GAME_PALETTE.bg,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
  },
  heading: {
    alignSelf: 'stretch',
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 12,
  },
  title: {
    flexShrink: 1,
    color: GAME_PALETTE.text,
    fontSize: 14,
    ...interFont('semibold'),
  },
  grid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    justifyContent: 'center',
    gap: 8,
  },
  option: {
    padding: 4,
    borderRadius: 10,
    borderWidth: 1,
    borderColor: 'transparent',
  },
  optionSelected: {
    borderColor: GAME_PALETTE.accent,
    backgroundColor: GAME_PALETTE.surface,
  },
  pill: {
    minHeight: 36,
    paddingHorizontal: 14,
    borderRadius: 18,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillText: {
    color: GAME_PALETTE.text,
    fontSize: 14,
    ...interFont('medium'),
  },
  pressed: {
    opacity: 0.7,
  },
});
