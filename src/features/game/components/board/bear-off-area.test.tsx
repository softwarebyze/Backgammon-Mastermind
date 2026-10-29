import { cleanup, render, screen } from '@/lib/test-utils';
import { BearOffArea } from './bear-off-area';

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
  expect(screen.getByText('▲ game.status.off_short')).toBeTruthy();
  expect(screen.getByText('▽ game.status.off_short')).toBeTruthy();
});
