/** Space kept between a focused turn chip and the leading edge when scrolling. */
export const TIMELINE_SCROLL_LEAD = 120;
/** Approximate width of one chip plus its gap, used for review auto-scroll. */
export const TIMELINE_CHIP_SCROLL_STEP = 62;

export type TimelineScrollGeometry = {
  isRTL: boolean;
  /** `Platform.OS`; only `android` and `web` need RTL conversion. */
  platform: string;
  contentWidth: number;
  viewportWidth: number;
};

export type TimelineScrollTarget = { kind: 'live' } | { kind: 'turn'; focusedTurnIdx: number };

/** Furthest offset measured from the Start chip, i.e. the scrolled-to-end position. */
function timelineMaxScrollX(geometry: TimelineScrollGeometry): number {
  return Math.max(0, geometry.contentWidth - geometry.viewportWidth);
}

/** Offset measured from the Start chip for the active target. */
function timelineLogicalScrollX(
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
 * `ScrollView.scrollTo` expects. In RTL the Start chip sits on the right.
 *
 * - iOS converts `x` itself: Fabric's `scrollToOffset` measures it from the
 *   inline start in RTL, so the logical offset passes through.
 * - Android takes a physical `scrollX` from the left edge even in RTL
 *   (`ReactHorizontalScrollView.reactSmoothScrollTo`), so the offset is
 *   mirrored: the Start chip is at the max offset and Live is at 0.
 * - On web, react-native-web forwards `x` to DOM `scrollLeft`, which starts at
 *   0 on the right in RTL and runs negative as it moves left.
 */
export function timelineScrollX(
  target: TimelineScrollTarget,
  geometry: TimelineScrollGeometry,
): number {
  if (!geometry.isRTL || geometry.platform === 'ios') {
    return timelineLogicalScrollX(target, geometry);
  }
  const maxX = timelineMaxScrollX(geometry);
  const logicalX = Math.min(timelineLogicalScrollX(target, geometry), maxX);
  if (geometry.platform === 'android') {
    return maxX - logicalX;
  }
  // Normalize -0 so callers and tests see a plain zero when nothing scrolls.
  return logicalX === 0 ? 0 : -logicalX;
}
