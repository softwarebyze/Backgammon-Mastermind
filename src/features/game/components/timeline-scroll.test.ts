import {
  TIMELINE_CHIP_SCROLL_STEP,
  TIMELINE_SCROLL_LEAD,
  timelineScrollX,
} from './timeline-scroll';

const ltr = {
  isRTL: false,
  platform: 'ios',
  contentWidth: 734,
  viewportWidth: 294,
};
const MAX_X = 440;
const turn2 = { kind: 'turn', focusedTurnIdx: 2 } as const;
const turn2X = 3 * TIMELINE_CHIP_SCROLL_STEP - TIMELINE_SCROLL_LEAD;

describe('timelineScrollX', () => {
  it('scrolls Live to the end and turns from the Start chip in LTR', () => {
    expect(timelineScrollX({ kind: 'live' }, ltr)).toBe(MAX_X);
    expect(timelineScrollX(turn2, ltr)).toBe(turn2X);
  });

  it('passes the logical offset through on iOS RTL, which converts it natively', () => {
    const ios = { ...ltr, isRTL: true };
    expect(timelineScrollX({ kind: 'live' }, ios)).toBe(MAX_X);
    expect(timelineScrollX(turn2, ios)).toBe(turn2X);
  });

  it('mirrors the offset on Android RTL, where scrollX is physical from the left', () => {
    const android = { ...ltr, isRTL: true, platform: 'android' };
    expect(timelineScrollX({ kind: 'live' }, android)).toBe(0);
    expect(timelineScrollX(turn2, android)).toBe(MAX_X - turn2X);
    expect(timelineScrollX({ kind: 'turn', focusedTurnIdx: 0 }, android)).toBe(MAX_X);
  });

  it('negates the offset on web RTL, where DOM scrollLeft runs negative', () => {
    const web = { ...ltr, isRTL: true, platform: 'web' };
    expect(timelineScrollX({ kind: 'live' }, web)).toBe(-MAX_X);
    expect(timelineScrollX(turn2, web)).toBe(-turn2X);
    expect(timelineScrollX({ kind: 'live' }, { ...web, contentWidth: 200 })).toBe(0);
  });
});
