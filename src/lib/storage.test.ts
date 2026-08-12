import type * as storage from './storage';

const store: Record<string, string> = {};

jest.mock('react-native-mmkv', () => ({
  createMMKV: () => ({
    getString: (key: string) => store[key],
    set: (key: string, value: string) => {
      store[key] = value;
    },
    remove: (key: string) => {
      delete store[key];
    },
  }),
}));

describe('storage.getItem', () => {
  beforeEach(() => {
    for (const key of Object.keys(store)) {
      delete store[key];
    }
    jest.resetModules();
  });

  it('returns null and clears the key when JSON is corrupt', () => {
    store.bad = '{not-json';
    const { getItem } = require('./storage') as typeof storage;
    expect(getItem('bad')).toBeNull();
    expect(store.bad).toBeUndefined();
  });

  it('parses valid JSON', () => {
    store.ok = JSON.stringify({ a: 1 });
    const { getItem } = require('./storage') as typeof storage;
    expect(getItem<{ a: number }>('ok')).toEqual({ a: 1 });
  });
});
