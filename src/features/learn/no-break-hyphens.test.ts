import { noBreakHyphens } from './no-break-hyphens';

describe('noBreakHyphens', () => {
  it('keeps hyphenated words together', () => {
    expect(noBreakHyphens('until they re-enter.')).toBe('until they re\u2011enter.');
    expect(noBreakHyphens('the 6-point, 2-2')).toBe('the 6\u2011point, 2\u20112');
  });

  it('leaves spaced dashes and other text alone', () => {
    expect(noBreakHyphens('bar - come back')).toBe('bar - come back');
    expect(noBreakHyphens('Right — hit checkers')).toBe('Right — hit checkers');
  });
});
