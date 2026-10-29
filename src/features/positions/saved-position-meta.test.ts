import { savedPositionMeta } from './saved-position-meta';

jest.mock('@/lib/i18n', () => ({ translate: (key: string) => key, getLanguage: () => 'en' }));

it('shows when a position was saved and whether it came from a game', () => {
  const at = Date.UTC(2026, 9, 29, 15, 40);
  const meta = savedPositionMeta({ savedAt: at, source: 'game' }, 'en-US');
  expect(meta).toContain('2026');
  expect(meta.endsWith(' · positions.from_game')).toBe(true);
  expect(savedPositionMeta({ savedAt: at, source: 'editor' }, 'en-US')).not.toContain('positions.from_game');
});

it('has nothing to say about positions saved before timestamps existed', () => {
  expect(savedPositionMeta({})).toBe('');
});
