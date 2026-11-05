import { lessonShowsPointNumbers } from './lesson-point-numbers';

describe('lessonShowsPointNumbers', () => {
  it.each([true, false])('follows the preference (%s) when a step sets no aids, as the board does', (preference) => {
    expect(lessonShowsPointNumbers(undefined, preference)).toBe(preference);
    expect(lessonShowsPointNumbers({}, preference)).toBe(preference);
  });

  it.each([true, false])('lets a step override the preference with %s', (value) => {
    expect(lessonShowsPointNumbers({ showPointNumbers: value }, !value)).toBe(value);
  });
});
