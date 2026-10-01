import type * as storage from './storage';

// No react-native-mmkv mock here on purpose: jest-setup.ts stubs the Nitro
// boundary, so createMMKV() returns MMKV's real in-memory mock and the tests
// exercise the actual storage wrapper. Values are seeded and inspected through
// the module's raw helpers, which is the same surface app code uses.

function loadStorage(): typeof storage {
  jest.resetModules();
  return require('./storage') as typeof storage;
}

describe('storage.getItem', () => {
  it('returns null and clears the key when JSON is corrupt', () => {
    const { getItem, getRawString, setRawString } = loadStorage();
    setRawString('bad', '{not-json');
    expect(getItem('bad')).toBeNull();
    expect(getRawString('bad')).toBeUndefined();
  });

  it('parses valid JSON', () => {
    const { getItem, setRawString } = loadStorage();
    setRawString('ok', JSON.stringify({ a: 1 }));
    expect(getItem<{ a: number }>('ok')).toEqual({ a: 1 });
  });

  it('clears an empty-string payload instead of leaving it stored', () => {
    const { getItem, getRawString, setRawString } = loadStorage();
    setRawString('empty', '');
    expect(getItem('empty')).toBeNull();
    expect(getRawString('empty')).toBeUndefined();
  });

  it('returns null for a key that was never written', () => {
    const { getItem } = loadStorage();
    expect(getItem('missing')).toBeNull();
  });
});

describe('storage raw string helpers', () => {
  it('round-trips raw strings without JSON parsing', () => {
    const { getRawString, setRawString } = loadStorage();
    setRawString('session', '{not-json');
    expect(getRawString('session')).toBe('{not-json');
  });
});
