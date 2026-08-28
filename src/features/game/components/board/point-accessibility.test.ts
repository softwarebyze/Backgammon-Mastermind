import { pointAccessibilityLabel } from './point-accessibility';

describe('pointAccessibilityLabel', () => {
  it('names occupied points so they stay a real button target', () => {
    expect(pointAccessibilityLabel(6, { count: 5, player: 'white' })).toBe(
      'Point 6, 5 white checkers',
    );
    expect(pointAccessibilityLabel(24, { count: 1, player: 'black' }, { isSelected: true }))
      .toBe('Point 24, 1 black checker, selected');
  });

  it('keeps empty points labeled as buttons', () => {
    expect(pointAccessibilityLabel(5, { count: 0, player: null }, { isLegalTarget: true }))
      .toBe('Point 5, legal move target');
  });
});
