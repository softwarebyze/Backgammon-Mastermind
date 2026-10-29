/**
 * The tray is narrow and "off" is long in some languages ("toplanan",
 * "выброс"). Shrink the label to fit rather than truncating it, down to 5px.
 * (adjustsFontSizeToFit is iOS-only.)
 */
export function trayLabelFontSize(label: string, width: number): number {
  const perChar = 0.58;
  return Math.max(5, Math.min(9, Math.floor(((width - 4) / (label.length * perChar)) * 10) / 10));
}
