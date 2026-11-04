import { LESSONS } from '@/lib/learn/curriculum';

import { LEARN_CAPTION_RESERVE, learnCaptionReserve, lessonUsesDice } from './lesson-layout';

describe('learnCaptionReserve', () => {
  it('is the same on every step, whatever the caption shows', () => {
    expect(learnCaptionReserve({ fontScale: 1, captionMaxHeight: 600 })).toBe(LEARN_CAPTION_RESERVE);
  });

  it('grows with larger text, up to a cap', () => {
    expect(learnCaptionReserve({ fontScale: 1.2, captionMaxHeight: 600 })).toBe(Math.round(LEARN_CAPTION_RESERVE * 1.2));
    expect(learnCaptionReserve({ fontScale: 3, captionMaxHeight: 600 })).toBe(Math.round(LEARN_CAPTION_RESERVE * 1.4));
  });

  it('never takes the board below its minimum slot', () => {
    expect(learnCaptionReserve({ fontScale: 1, captionMaxHeight: 150 })).toBe(150);
  });
});

describe('lessonUsesDice', () => {
  it('reserves the dice row only for lessons that roll', () => {
    const byId = Object.fromEntries(LESSONS.map(lesson => [lesson.id, lessonUsesDice(lesson)]));
    expect(byId['goal-board']).toBe(false);
    expect(byId['moving-dice']).toBe(true);
  });
});
