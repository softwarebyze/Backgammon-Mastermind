import { getRawString, setRawString } from '@/lib/storage';
import { newPosition } from './position';
import { deleteSavedPosition, loadSavedPositions, savePosition } from './saved-positions';

jest.mock('@/lib/storage', () => ({ getRawString: jest.fn(), setRawString: jest.fn() }));

beforeEach(() => {
  let raw: string | undefined;
  jest.mocked(getRawString).mockImplementation(() => raw);
  jest.mocked(setRawString).mockImplementation((_, value) => {
    raw = value;
  });
});

it('saves, reloads, renames and deletes validated positions without touching the active game', () => {
  const p = newPosition();
  savePosition(' My board ', p, { now: 1000 });
  expect(loadSavedPositions()).toEqual([{ id: JSON.stringify(p), name: 'My board', position: p, savedAt: 1000, source: 'editor' }]);
  savePosition('Renamed', p);
  expect(loadSavedPositions()).toHaveLength(1);
  expect(loadSavedPositions()[0]!.name).toBe('Renamed');
  expect(setRawString).toHaveBeenLastCalledWith('SAVED_POSITIONS_V1', expect.any(String));
  deleteSavedPosition(loadSavedPositions()[0]!.id);
  expect(loadSavedPositions()).toEqual([]);
});

it('keeps valid entries when one saved board is corrupt', () => {
  jest.mocked(getRawString).mockReturnValue(JSON.stringify([{ id: 'bad', name: 'Bad', position: {} }, { id: 'ok', name: 'Good', position: newPosition() }]));
  expect(loadSavedPositions().map(entry => entry.name)).toEqual(['Good']);
});

it('survives malformed storage and caps the saved collection', () => {
  jest.mocked(getRawString).mockReturnValue('bad json');
  expect(loadSavedPositions()).toEqual([]);
  jest.mocked(getRawString).mockReturnValue(JSON.stringify(Array.from({ length: 55 }, (_, i) => ({ id: String(i), name: 'Test', position: newPosition() }))));
  expect(savePosition('Another', newPosition())).toHaveLength(50);
});

it('keeps when and where a position was saved, plus an optional note', () => {
  const p = newPosition();
  savePosition('From my game', p, { note: '  Should I hit here?  ', source: 'game', now: 1234 });
  expect(loadSavedPositions()[0]).toMatchObject({ name: 'From my game', note: 'Should I hit here?', source: 'game', savedAt: 1234 });
  savePosition('From my game', p, { note: '   ', now: 99 });
  expect(loadSavedPositions()[0]).not.toHaveProperty('note');
});

it('still opens positions saved before timestamps existed', () => {
  jest.mocked(getRawString).mockReturnValue(JSON.stringify([{ id: 'old', name: 'Old', position: newPosition(), savedAt: 'yesterday', source: 'elsewhere' }]));
  expect(loadSavedPositions()).toEqual([{ id: 'old', name: 'Old', position: newPosition() }]);
});
