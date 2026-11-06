import { homeGetAppInlineInBrand } from './home-get-app-placement';

describe('homeGetAppInlineInBrand (#351)', () => {
  it('is inline on short landscape phones where a stacked pill hid Start', () => {
    expect(homeGetAppInlineInBrand(true, 260)).toBe(true);
    expect(homeGetAppInlineInBrand(true, 280)).toBe(true);
    expect(homeGetAppInlineInBrand(true, 519)).toBe(true);
  });

  it('stays stacked in portrait and on taller landscape', () => {
    expect(homeGetAppInlineInBrand(false, 600)).toBe(false);
    expect(homeGetAppInlineInBrand(false, 260)).toBe(false);
    expect(homeGetAppInlineInBrand(true, 520)).toBe(false);
    expect(homeGetAppInlineInBrand(true, 844)).toBe(false);
  });
});
