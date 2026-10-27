import { Platform, StyleSheet } from 'react-native';
import { GAME_PALETTE as palette } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: 16, gap: 20 },
  section: { gap: 12, borderTopWidth: 1, borderTopColor: palette.surfaceBorder, paddingTop: 20 },
  heading: { ...interFont('semibold'), color: palette.text, fontSize: 19 },
  caption: { ...interFont('regular'), color: '#CBB8A7', fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  button: { borderRadius: 10, backgroundColor: palette.surface, paddingHorizontal: 14, minWidth: 48, minHeight: Platform.OS === 'android' ? 48 : 44, justifyContent: 'center', alignItems: 'center' },
  buttonText: { ...interFont('medium'), color: palette.accent, fontSize: 14, textAlign: 'center' },
  active: { backgroundColor: palette.control },
  activeText: { color: palette.controlInk },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  input: { ...interFont('regular'), color: palette.text, backgroundColor: palette.surface, padding: 12, minHeight: 48, borderRadius: 10, fontSize: 16, textAlignVertical: 'top' },
  number: { minWidth: 92, gap: 4 },
  numberInput: { ...interFont('medium'), color: palette.text, fontSize: 17, backgroundColor: palette.surface, minHeight: Platform.OS === 'android' ? 48 : 44, paddingHorizontal: 12, borderRadius: 8 },
  error: { ...interFont('regular'), color: '#FFBCAD', fontSize: 14, lineHeight: 21 },
  board: { alignItems: 'center' },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 8, flexWrap: 'wrap' },
});
