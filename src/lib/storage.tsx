import { createMMKV } from 'react-native-mmkv';

export const storage = createMMKV();

export function getItem<T>(key: string): T | null {
  const value = storage.getString(key);
  if (value === undefined) {
    return null;
  }
  try {
    return JSON.parse(value) as T;
  }
  catch {
    // Corrupt MMKV payload — drop it so cold start can't crash the app.
    storage.remove(key);
    return null;
  }
}

export async function setItem<T>(key: string, value: T) {
  storage.set(key, JSON.stringify(value));
}

export async function removeItem(key: string) {
  storage.remove(key);
}

/** Raw MMKV access for atomic session commits that must quarantine, not drop, bad JSON. */
export function getRawString(key: string): string | undefined {
  return storage.getString(key);
}

export function setRawString(key: string, value: string): void {
  storage.set(key, value);
}
