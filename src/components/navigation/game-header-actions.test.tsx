import { Feather } from '@expo/vector-icons';

import { useLayoutIsRTL } from '@/lib/i18n';
import { cleanup, render, screen, within } from '@/lib/test-utils';
import he from '@/translations/he.json';

import { GameHeaderActions } from './game-header-actions';

jest.mock('@/lib/i18n', () => ({
  translate: (key: string) => key,
  useLayoutIsRTL: jest.fn(),
}));
jest.mock('@/lib/haptics', () => ({ hapticLight: jest.fn() }));

const layoutRTL = jest.mocked(useLayoutIsRTL);
afterEach(cleanup);

it.each([false, true])('points undo backward and redo forward with RTL=%s', (rtl) => {
  layoutRTL.mockReturnValue(rtl);
  render(<GameHeaderActions canUndo canRedo onUndo={jest.fn()} onRedo={jest.fn()} onOptions={jest.fn()} onReset={jest.fn()} />);
  const undo = screen.getByRole('button', { name: 'game.controls.undo_a11y' });
  const redo = screen.getByRole('button', { name: 'game.controls.redo_a11y' });
  expect(within(undo).UNSAFE_getByType(Feather).props.name).toBe(rtl ? 'corner-up-right' : 'corner-up-left');
  expect(within(redo).UNSAFE_getByType(Feather).props.name).toBe(rtl ? 'corner-up-left' : 'corner-up-right');
});

it('provides Hebrew undo and redo labels rather than the English fallback', () => {
  expect(he.game.controls.undo_a11y).toBe('ביטול המהלך');
  expect(he.game.controls.redo_a11y).toBe('ביצוע המהלך מחדש');
});
