import { emulateFontScale, FONT_SCALE_CAP } from './font-scale';

describe('emulateFontScale', () => {
  it('grows text like native Dynamic Type, up to each style cap', () => {
    const style = { fontSize: 16, lineHeight: 20 };
    expect(emulateFontScale(style, FONT_SCALE_CAP.body, 3.12)).toEqual({ fontSize: 32, lineHeight: 40 });
    expect(emulateFontScale(style, FONT_SCALE_CAP.fixed, 3.12)).toBe(style);
    // RN treats 0 as "no cap": the text follows the full system scale.
    expect(emulateFontScale(style, 0, 3)).toEqual({ fontSize: 48, lineHeight: 60 });
  });
});
