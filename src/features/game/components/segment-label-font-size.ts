/** Base Home segment label size; keep in sync with `home-setup-choice` styles. */
export const SEGMENT_LABEL_SIZE = 15;
export const SEGMENT_LABEL_MIN_SCALE = 0.75;

type SegmentLabelFontSizeArgs = {
  label: string;
  innerWidth: number;
  measure: (word: string, fontSize: number) => number;
  baseSize?: number;
  minScale?: number;
};

/**
 * Font size for a segmented-control label so a single word is never broken
 * mid-word (the "Mediu / m" Safari-zoom case). Multi-word labels can still
 * wrap at spaces at the base size.
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
  const longest = Math.max(...words.map(word => measure(word, baseSize)));
  if (longest <= innerWidth) {
    return baseSize;
  }
  const fitted = Math.floor(baseSize * (innerWidth / longest) * 10) / 10;
  return Math.max(baseSize * minScale, fitted);
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
  ctx.font = `${fontSize}px Inter_600SemiBold, Inter, ui-sans-serif, system-ui, sans-serif`;
  return ctx.measureText(word).width;
}

let measureCanvas: HTMLCanvasElement | null = null;
function getMeasureCanvas(): HTMLCanvasElement {
  measureCanvas ??= document.createElement('canvas');
  return measureCanvas;
}
