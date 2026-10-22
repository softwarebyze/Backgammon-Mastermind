/** Space kept between a focused turn chip and the leading edge when scrolling. */
export const TIMELINE_SCROLL_LEAD = 120;
/** Approximate width of one chip plus its gap, used for review auto-scroll. */
export const TIMELINE_CHIP_SCROLL_STEP = 62;

export type TimelineScrollGeometry = {
  isRTL: boolean;
  isWeb: boolean;
  contentWidth: number;
  viewportWidth: number;
};

export type TimelineScrollTarget = { kind: 'live' } | { kind: 'turn'; focusedTurnIdx: number };

/** Furthest offset measured from the Start chip, i.e. the scrolled-to-end position. */
export function timelineMaxScrollX(geometry: TimelineScrollGeometry): number {
  return Math.max(0, geometry.contentWidth - geometry.viewportWidth);
}

/** Offset measured from the Start chip for the active target. */
export function timelineLogicalScrollX(
  target: TimelineScrollTarget,
  geometry: TimelineScrollGeometry,
): number {
  if (target.kind === 'live') {
    return timelineMaxScrollX(geometry);
  }
  return Math.max(
    0,
    (target.focusedTurnIdx + 1) * TIMELINE_CHIP_SCROLL_STEP - TIMELINE_SCROLL_LEAD,
  );
}

/**
 * Convert a timeline offset measured from the Start chip into the `x` that
 * `ScrollView.scrollTo` expects.
 *
 * Native scroll views measure `x` from the inline start in both directions:
 * iOS mirrors the scroll view with a transform and Android lays the row out
 * from the right, so the same positive offset reaches the same chip. On web,
 * react-native-web forwards `x` to DOM `scrollLeft`; an RTL scroller starts at
 * 0 on the right and runs negative as it moves left, so the offset must be
 * negated and clamped to the real scroll range.
 */
export function timelineScrollX(
  target: TimelineScrollTarget,
  geometry: TimelineScrollGeometry,
): number {
  const logicalX = timelineLogicalScrollX(target, geometry);
  if (!geometry.isWeb || !geometry.isRTL) {
    return logicalX;
  }
  const offset = Math.min(logicalX, timelineMaxScrollX(geometry));
  // Normalize -0 so callers and tests see a plain zero when nothing scrolls.
  return offset === 0 ? 0 : -offset;
}
