import { LESSON_IDS } from '@/lib/learn/curriculum';

import { lessonVisual } from './lesson-visuals';

describe('lessonVisual', () => {
  it('gives every lesson a unique icon and a hex tint', () => {
    const visuals = LESSON_IDS.map(lessonVisual);

    expect(new Set(visuals.map(v => v.icon)).size).toBe(LESSON_IDS.length);
    for (const visual of visuals) {
      expect(visual.icon.length).toBeGreaterThan(0);
      expect(visual.tint).toMatch(/^#[0-9A-F]{6}$/i);
    }
  });
});
