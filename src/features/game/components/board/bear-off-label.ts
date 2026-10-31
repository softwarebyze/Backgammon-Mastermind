/**
 * The tray is narrow and "off" is long in some languages ("toplanan",
 * "выброс"). Shrink the label to fit rather than truncating it, down to 5px.
 * (adjustsFontSizeToFit is iOS-only.)
 */
export function trayLabelFontSize(label: string, width: number): number {
  const ems = [...label].reduce((sum, char) => sum + glyphEms(char), 0);
  return Math.max(5, Math.min(9, Math.floor(((width - 4) / ems) * 10) / 10));
}

/** Latin, Cyrillic and similar glyphs average about 0.58em; CJK and Hangul are a full em. */
function glyphEms(char: string): number {
  return /[\u1100-\u11FF\u2E80-\u9FFF\uAC00-\uD7AF\uF900-\uFAFF\uFF00-\uFFEF]/.test(char) ? 1 : 0.58;
}
