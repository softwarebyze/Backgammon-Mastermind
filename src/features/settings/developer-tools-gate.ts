import Env from 'env';

/** Dev/QA only — matches the non-production icon badge gate, plus Metro `__DEV__`. */
export function isDeveloperToolsEnabled(): boolean {
  return __DEV__ || Env.EXPO_PUBLIC_APP_ENV !== 'production';
}
