import {
  TIMELINE_CHIP_SCROLL_STEP,
  TIMELINE_SCROLL_LEAD,
  timelineLogicalScrollX,
  timelineMaxScrollX,
  timelineScrollX,
} from './timeline-scroll';

const geometry = {
  isRTL: false,
  isWeb: false,
  contentWidth: 734,
  viewportWidth: 294,
};

describe('timelineScrollX', () => {
  it('scrolls to the scrolled-to-end position for Live', () => {
    expect(timelineMaxScrollX(geometry)).toBe(440);
    expect(timelineScrollX({ kind: 'live' }, geometry)).toBe(440);
  });

  it('uses the same positive offset as before in LTR', () => {
    expect(timelineScrollX({ kind: 'turn', focusedTurnIdx: 2 }, geometry)).toBe(
      3 * TIMELINE_CHIP_SCROLL_STEP - TIMELINE_SCROLL_LEAD,
    );
  });

  it('keeps native RTL on the positive native offset', () => {
    expect(timelineScrollX({ kind: 'live' }, { ...geometry, isRTL: true })).toBe(440);
    expect(timelineScrollX({ kind: 'turn', focusedTurnIdx: 0 }, { ...geometry, isRTL: true })).toBe(0);
  });

  it('negates the offset on web RTL, where DOM scrollLeft runs negative', () => {
    const webRTL = { ...geometry, isRTL: true, isWeb: true };
    expect(timelineScrollX({ kind: 'live' }, webRTL)).toBe(-440);
    expect(timelineScrollX({ kind: 'turn', focusedTurnIdx: 5 }, webRTL)).toBe(
      -Math.min(6 * TIMELINE_CHIP_SCROLL_STEP - TIMELINE_SCROLL_LEAD, 440),
    );
  });

  it('clamps web RTL to the real scroll range when content is narrower', () => {
    const webRTL = { isRTL: true, isWeb: true, contentWidth: 200, viewportWidth: 294 };
    expect(timelineMaxScrollX(webRTL)).toBe(0);
    expect(timelineScrollX({ kind: 'live' }, webRTL)).toBe(0);
  });

  it('never returns a negative LTR offset for very short timelines', () => {
    const short = { ...geometry, contentWidth: 100, viewportWidth: 294 };
    expect(timelineLogicalScrollX({ kind: 'turn', focusedTurnIdx: 0 }, short)).toBe(0);
    expect(timelineScrollX({ kind: 'turn', focusedTurnIdx: 0 }, { ...short, isRTL: true, isWeb: true }))
      .toBe(0);
  });
});
