import { cleanup, render, screen } from '@/lib/test-utils';
import { BearOffArea } from './bear-off-area';
import { trayLabelFontSize } from './bear-off-label';

jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key }));

afterEach(cleanup);

it('labels both trays through i18n instead of a hardcoded English "off" (#244)', () => {
  render(
    <BearOffArea
      whiteBorneOff={0}
      blackBorneOff={0}
      isLegalTarget={false}
      currentPlayer="white"
      onPress={jest.fn()}
      width={32}
      boardHeight={300}
      middleHeight={12}
      checkerSize={28}
    />,
  );
  expect(screen.getByText('▲game.status.off_short')).toBeTruthy();
  expect(screen.getByText('▽game.status.off_short')).toBeTruthy();
});

it('shrinks long tray labels to fit instead of truncating them', () => {
  expect(trayLabelFontSize('▲off', 32)).toBe(9);
  const size = trayLabelFontSize('▲toplanan', 32);
  expect(size).toBeLessThan(9);
  expect(size * 0.58 * '▲toplanan'.length).toBeLessThanOrEqual(28);
});

it('counts CJK labels at a full em per character, so they shrink to fit too', () => {
  // At 0.58em a glyph, "15 上がり" looks like it fits a 32px tray at 9px; it is about 46px wide.
  const size = trayLabelFontSize('15 上がり', 32);
  expect(size).toBeLessThan(9);
  expect(size * (3 * 0.58 + 3)).toBeLessThanOrEqual(28);
});
