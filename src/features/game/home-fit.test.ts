import { brandSpace, buttonsSpace, homeFitAt, homeFitLevel } from './home-fit';

function menuHeight(level: number, text: number, buttons: number) {
  const fit = homeFitAt(level);
  return text + fit.top + brandSpace(fit) + buttonsSpace(fit, buttons) + fit.buttonsBottom + fit.bottom;
}

describe('homeFitLevel', () => {
  const text = 300;
  const buttons = 4;

  it('picks the roomiest level that fits', () => {
    const level = homeFitLevel({ available: 600, text, buttons });
    expect(menuHeight(level, text, buttons)).toBeLessThanOrEqual(600);
    expect(menuHeight(level + 0.01, text, buttons)).toBeGreaterThan(600);
  });

  it('picks again when the available height shrinks', () => {
    const tall = homeFitLevel({ available: 600, text, buttons });
    const short = homeFitLevel({ available: 480, text, buttons });
    expect(short).toBeLessThan(tall);
    expect(menuHeight(short, text, buttons)).toBeLessThanOrEqual(480);
  });
});
