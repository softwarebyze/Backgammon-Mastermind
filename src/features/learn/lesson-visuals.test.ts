import { LESSON_IDS } from '@/lib/learn/curriculum';

import { lessonNavigationIcons, lessonVisual } from './lesson-visuals';

describe('lessonVisual', () => {
  it('points forward along the reading direction and back in the opposite direction', () => {
    expect(lessonNavigationIcons(false)).toEqual({
      back: 'chevron-left',
      next: 'arrow-right',
      start: 'chevron-right',
    });
    expect(lessonNavigationIcons(true)).toEqual({
      back: 'chevron-right',
      next: 'arrow-left',
      start: 'chevron-left',
    });
  });
  it('gives every lesson a unique icon and a hex tint', () => {
    const visuals = LESSON_IDS.map(lessonVisual);

    expect(new Set(visuals.map(v => v.icon)).size).toBe(LESSON_IDS.length);
    for (const visual of visuals) {
      expect(visual.icon.length).toBeGreaterThan(0);
      expect(visual.tint).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
