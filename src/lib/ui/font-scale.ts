import type { TextStyle } from 'react-native';
import { Platform, useWindowDimensions } from 'react-native';

/**
 * Most a text style may grow with the system text size (iOS Dynamic Type,
 * Android font scale). Passed as `maxFontSizeMultiplier`; RN multiplies
 * `fontSize` and `lineHeight` by `min(systemScale, cap)`.
 *
 * - `fixed`: the board's own labels (point numbers, dice, checker counts,
 *   bear-off tray) and the game-screen chrome whose measured height sizes the
 *   board (status bar, turn banner, controls, hint, review strip). The board
 *   never changes size, so these never scale. The home wordmark is fixed too:
 *   it's sized to the screen width like the logo.
 * - `control`: buttons, chips and headings that share a row or sit above
 *   reflowing copy. They grow a little but keep the row on one line.
 * - `body`: copy that can wrap and scroll (Learn, Settings, Home captions,
 *   dialogs).
 */
export const FONT_SCALE_CAP = {
  fixed: 1,
  control: 1.3,
  body: 2,
} as const;

/** iOS's largest accessibility size (AX5) multiplies body text by 3.12. */
const MAX_EMULATED_SCALE = 3.12;

function readWebFontScale(): number {
  if (Platform.OS !== 'web' || typeof window === 'undefined') {
    return 1;
  }
  const raw = new URLSearchParams(window.location.search).get('fontScale');
  const value = raw == null ? Number.NaN : Number(raw);
  return Number.isFinite(value) && value > 1 ? Math.min(value, MAX_EMULATED_SCALE) : 1;
}

/**
 * Browsers have no Dynamic Type, so web previews can emulate it with
 * `?fontScale=3.12` (read once at load). Native always reports 1 here: the OS
 * applies its own scale.
 */
export const WEB_EMULATED_FONT_SCALE = readWebFontScale();

/**
 * Web-only: apply the emulated scale the way native does, capped by the
 * text's `maxFontSizeMultiplier`. Returns the style unchanged when nothing
 * is emulated.
 */
export function emulateFontScale(
  style: TextStyle,
  maxFontSizeMultiplier: number | null | undefined,
  scale: number = WEB_EMULATED_FONT_SCALE,
): TextStyle {
  const cap = maxFontSizeMultiplier == null || maxFontSizeMultiplier < 1 ? scale : maxFontSizeMultiplier;
  const factor = Math.min(scale, cap);
  if (factor <= 1) {
    return style;
  }
  return {
    ...style,
    fontSize: (style.fontSize ?? 14) * factor,
    ...(typeof style.lineHeight === 'number' ? { lineHeight: style.lineHeight * factor } : {}),
  };
}

/** The system text scale in effect: the OS's on native, `?fontScale=` on web. */
export function useTextScale(): number {
  const { fontScale } = useWindowDimensions();
  return Platform.OS === 'web' ? WEB_EMULATED_FONT_SCALE : fontScale;
}
