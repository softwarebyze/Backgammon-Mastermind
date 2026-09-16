import { contentEdgePadding, innerLayoutWidth } from '@/lib/ui/layout-metrics';

describe('contentEdgePadding', () => {
  it('applies left, right, and bottom insets (header owns top)', () => {
    expect(contentEdgePadding({ left: 47, right: 21, bottom: 21 })).toEqual({
      paddingLeft: 47,
      paddingRight: 21,
      paddingBottom: 21,
    });
  });

  it('adds extra padding on top of safe-area insets', () => {
    expect(
      contentEdgePadding(
        { left: 47, right: 21, bottom: 21 },
        { left: 24, right: 24, bottom: 32 },
      ),
    ).toEqual({
      paddingLeft: 71,
      paddingRight: 45,
      paddingBottom: 53,
    });
  });
});

describe('innerLayoutWidth', () => {
  it('subtracts iPhone landscape notch and home-indicator insets', () => {
    // iPhone 14 Pro landscape ~844×390 with notch + indicator
    expect(innerLayoutWidth(844, 59, 21)).toBe(764);
  });

  it('is a no-op when insets are 0 (desktop web)', () => {
    expect(innerLayoutWidth(1920, 0, 0)).toBe(1920);
  });
});
