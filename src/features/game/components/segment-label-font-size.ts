/** Base Home segment label size; keep in sync with `home-setup-choice` styles. */
export const SEGMENT_LABEL_SIZE = 15;
/**
 * Lowest scale used when a word still overflows at 0.55 (Russian "Сложный"
 * at 150% page zoom is ~39px at 8.25px, in a ~35px tile).
 */
export const SEGMENT_LABEL_MIN_SCALE = 0.4;
/**
 * Canvas and CSS subpixel rounding can under-report width by ~1px. Without
 * this slack, a 1px overflow stays at the base size and ellipsizes (QA:
 * English "Medium" at 667×375: 58.25px at 14.9px still ellipsized in a 58px tile).
 */
const FIT_SLACK_PX = 2;

type SegmentLabelFontSizeArgs = {
  label: string;
  innerWidth: number;
  measure: (word: string, fontSize: number) => number;
  baseSize?: number;
  minScale?: number;
};

/**
 * Font size for a segmented-control label so a single word is never broken
 * mid-word (the "Mediu / m" Safari-zoom case) and never ellipsized. Multi-word
 * labels can still wrap at spaces at the base size.
 */
export function segmentLabelFontSize({
  label,
  innerWidth,
  measure,
  baseSize = SEGMENT_LABEL_SIZE,
  minScale = SEGMENT_LABEL_MIN_SCALE,
}: SegmentLabelFontSizeArgs): number {
  if (innerWidth <= 0) {
    return baseSize;
  }
  const words = label.split(/\s+/).filter(Boolean);
  if (words.length === 0) {
    return baseSize;
  }
  const available = Math.floor(innerWidth) - FIT_SLACK_PX;
  if (available <= 0) {
    return baseSize * minScale;
  }
  const longestAt = (size: number) => Math.max(...words.map(word => measure(word, size)));
  if (longestAt(baseSize) <= available) {
    return baseSize;
  }
  const minSize = baseSize * minScale;
  if (longestAt(minSize) > available) {
    return Math.round(minSize * 10) / 10;
  }
  // Largest size in [minSize, baseSize) that still measures as fitting.
  let lo = minSize;
  let hi = baseSize;
  for (let i = 0; i < 20; i++) {
    const mid = (lo + hi) / 2;
    if (longestAt(mid) <= available) {
      lo = mid;
    }
    else {
      hi = mid;
    }
  }
  return Math.floor(lo * 10) / 10;
}

/** Width of a word at Inter semibold, used on web to shrink labels that do not fit. */
export function measureSegmentWordWidth(word: string, fontSize: number): number {
  if (typeof document === 'undefined') {
    return word.length * fontSize * 0.7;
  }
  const canvas = getMeasureCanvas();
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    return word.length * fontSize * 0.7;
  }
  // Match `interFont('semibold')` on web: Inter_600SemiBold, no fontWeight.
  // Ceil so a 58.68px canvas width cannot be treated as fitting a 58px tile
  // (QA: "Medium" scrollWidth was 59). canvas is in CSS pixels and is not
  // scaled by `html { zoom }`, unlike getBoundingClientRect.
  ctx.font = `${fontSize}px Inter_600SemiBold, Inter, ui-sans-serif, system-ui, sans-serif`;
  return Math.ceil(ctx.measureText(word).width);
}

let measureCanvas: HTMLCanvasElement | null = null;
function getMeasureCanvas(): HTMLCanvasElement {
  measureCanvas ??= document.createElement('canvas');
  return measureCanvas;
}
