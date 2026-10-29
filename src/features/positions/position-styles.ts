import { Platform, StyleSheet } from 'react-native';
import { GAME_PALETTE as palette } from '@/features/game/game-palette';
import { interFont } from '@/lib/ui/fonts';

const TOUCH = Platform.OS === 'android' ? 48 : 44;
/**
 * The strip under the board always reserves this much height (title row plus
 * two control rows), whatever it shows, so the page never shifts.
 */
export const STRIP_HEIGHT = 40 + TOUCH * 2 + 8 * 2 + 12 * 2;
const muted = '#CBB8A7';

export const styles = StyleSheet.create({
  root: { flex: 1, backgroundColor: palette.bg },
  content: { width: '100%', maxWidth: 920, alignSelf: 'center', padding: 16, gap: 12 },
  caption: { ...interFont('regular'), color: muted, fontSize: 14, lineHeight: 21 },
  row: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 8 },
  button: { borderRadius: 10, backgroundColor: palette.surface, paddingHorizontal: 14, minWidth: TOUCH, minHeight: TOUCH, justifyContent: 'center', alignItems: 'center', flexDirection: 'row', gap: 8 },
  compactButton: { paddingHorizontal: 10, gap: 6 },
  segment: { flex: 1, minHeight: TOUCH - 4, paddingHorizontal: 6, backgroundColor: 'transparent', borderRadius: 8 },
  segmentActive: { backgroundColor: palette.surfaceBorder, borderWidth: 1, borderColor: palette.accent },
  segmentText: { fontSize: 13 },
  chip: { minHeight: 36, borderRadius: 18, paddingHorizontal: 12, borderWidth: 1, borderColor: palette.surfaceBorder, backgroundColor: 'transparent' },
  boardToolbar: { flexDirection: 'row', alignItems: 'center', gap: 6, zIndex: 10 },
  paintGroup: { flexDirection: 'row', gap: 2, padding: 2, borderRadius: 12, backgroundColor: palette.surface },
  paintSwatch: { width: TOUCH, height: TOUCH, borderRadius: 10, alignItems: 'center', justifyContent: 'center' },
  paintSwatchActive: { backgroundColor: palette.surfaceBorder, borderWidth: 1, borderColor: palette.accent },
  toolbarSpacer: { flex: 1 },
  board: { position: 'relative', alignItems: 'center' },
  boardCube: { position: 'absolute', zIndex: 30, borderRadius: 8 },
  boardCubeSelected: { shadowColor: palette.accent, shadowOpacity: 0.9, shadowRadius: 8, shadowOffset: { width: 0, height: 0 }, elevation: 6, borderWidth: 2, borderColor: palette.accent, borderRadius: 9 },
  // Reserved editing strip
  strip: { minHeight: STRIP_HEIGHT, borderRadius: 14, backgroundColor: 'rgba(43, 26, 16, 0.72)', borderWidth: 1, borderColor: palette.surfaceBorder, padding: 12 },
  stripPanel: { flex: 1, gap: 8 },
  stripHeading: { minHeight: 40, flexDirection: 'row', alignItems: 'center', gap: 8 },
  stripTitle: { ...interFont('semibold'), flex: 1, color: palette.text, fontSize: 16 },
  stripDone: { width: 36, height: 36, borderRadius: 18, alignItems: 'center', justifyContent: 'center', backgroundColor: palette.control },
  stripRow: { minHeight: TOUCH, flexDirection: 'row', alignItems: 'center', justifyContent: 'space-between', gap: 8 },
  stripHint: { ...interFont('regular'), color: muted, fontSize: 13, lineHeight: 19 },
  segmented: { minHeight: TOUCH, flexDirection: 'row', gap: 2, padding: 2, borderRadius: 10, backgroundColor: palette.surface },
  stepper: { flexDirection: 'row', alignItems: 'center', borderRadius: 10, backgroundColor: palette.surface, borderWidth: 1, borderColor: palette.surfaceBorder, overflow: 'hidden' },
  stepperButton: { width: TOUCH - 4, height: TOUCH - 2, alignItems: 'center', justifyContent: 'center' },
  stepperValue: { ...interFont('semibold'), minWidth: 40, textAlign: 'center', color: palette.text, fontSize: 18, fontVariant: ['tabular-nums'] },
  stepperValueWide: { minWidth: 60 },
  stepperValueSmall: { fontSize: 14 },
  scoreSide: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  stripLabel: { ...interFont('medium'), color: muted, fontSize: 13 },
  diceRow: { minHeight: 40, flexDirection: 'row', justifyContent: 'space-between' },
  dieChoice: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 8 },
  dieChoiceSelected: { backgroundColor: palette.surfaceBorder, borderWidth: 1, borderColor: palette.accent },
  summaryRow: { flex: 1, flexDirection: 'row', gap: 8 },
  summaryTile: { flex: 1, minHeight: TOUCH * 2, borderRadius: 12, backgroundColor: palette.surface, alignItems: 'center', justifyContent: 'center', gap: 6, paddingHorizontal: 6 },
  summaryVisual: { minHeight: 32, flexDirection: 'row', alignItems: 'center', gap: 4 },
  summaryLabel: { ...interFont('medium'), color: palette.text, fontSize: 13, textAlign: 'center' },
  summaryDice: { flexDirection: 'row', gap: 4 },
  scorePair: { flexDirection: 'row', gap: 3 },
  lightScore: { ...interFont('semibold'), fontSize: 20, fontVariant: ['tabular-nums'], color: palette.bg, backgroundColor: '#E8E0D0', borderRadius: 4, minWidth: 30, textAlign: 'center', paddingHorizontal: 4 },
  darkScore: { ...interFont('semibold'), fontSize: 20, fontVariant: ['tabular-nums'], color: palette.text, backgroundColor: '#3C3028', borderRadius: 4, minWidth: 30, textAlign: 'center', paddingHorizontal: 4 },
  // Tools below the strip
  detailPanel: { gap: 12, paddingVertical: 8 },
  workspaceActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  buttonText: { ...interFont('medium'), color: palette.text, fontSize: 14, textAlign: 'center' },
  primaryButton: { minHeight: 52, width: '100%', borderRadius: 12 },
  active: { backgroundColor: palette.surfaceBorder, borderWidth: 1, borderColor: palette.accent },
  primary: { backgroundColor: palette.control },
  activeText: { color: palette.controlInk },
  pressed: { opacity: 0.7 },
  disabled: { opacity: 0.35 },
  input: { ...interFont('regular'), color: palette.text, outlineColor: palette.accent, backgroundColor: palette.surface, padding: 12, minHeight: 48, borderRadius: 10, fontSize: 16, textAlignVertical: 'top' },
  error: { ...interFont('regular'), color: '#FFBCAD', fontSize: 14, lineHeight: 21 },
  savedList: { borderRadius: 12, borderWidth: 1, borderColor: palette.surfaceBorder, overflow: 'hidden' },
  savedRow: { flexDirection: 'row', alignItems: 'center', gap: 4, borderTopWidth: 1, borderTopColor: palette.surfaceBorder },
  savedOpen: { flex: 1, minHeight: 56, paddingVertical: 10, paddingHorizontal: 12, gap: 2 },
  savedName: { ...interFont('medium'), color: palette.text, fontSize: 15 },
  savedMeta: { ...interFont('regular'), color: muted, fontSize: 12 },
  savedNote: { ...interFont('regular'), color: palette.text, opacity: 0.8, fontSize: 13, lineHeight: 18 },
});

export const dialogStyles = StyleSheet.create({
  backdrop: { flex: 1, alignItems: 'center', justifyContent: 'center', padding: 20 },
  scrim: { position: 'absolute', top: 0, right: 0, bottom: 0, left: 0, backgroundColor: 'rgba(10, 4, 1, 0.72)' },
  card: { width: '100%', maxWidth: 420, gap: 12, padding: 20, borderRadius: 18, backgroundColor: palette.bg, borderWidth: 1, borderColor: palette.surfaceBorder },
  title: { ...interFont('semibold'), color: palette.text, fontSize: 19 },
  actions: { flexDirection: 'row', justifyContent: 'flex-end', gap: 8, marginTop: 4 },
});
