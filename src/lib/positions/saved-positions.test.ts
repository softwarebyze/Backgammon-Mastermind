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
  savePosition(' My board ', p);
  expect(loadSavedPositions()).toEqual([{ id: JSON.stringify(p), name: 'My board', position: p }]);
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
