import { getPostHogPersonContext, isPostHogProjectToken } from './posthog-context';

describe('getPostHogPersonContext', () => {
  it('prefers native version and build over Expo config', () => {
    expect(getPostHogPersonContext({
      appEnv: 'preview',
      platform: 'ios',
      configVersion: '1.0.0',
      nativeApplicationVersion: '1.0.1',
      nativeBuildVersion: '42',
      iosBuildNumber: '7',
    })).toEqual({
      app_env: 'preview',
      platform: 'ios',
      app_version: '1.0.1',
      build_number: '42',
    });
  });

  it('falls back to iOS build number when native build is missing', () => {
    expect(getPostHogPersonContext({
      platform: 'ios',
      configVersion: '1.0.0',
      iosBuildNumber: '9',
    })).toEqual({
      app_env: 'development',
      platform: 'ios',
      app_version: '1.0.0',
      build_number: '9',
    });
  });

  it('stringifies Android versionCode', () => {
    expect(getPostHogPersonContext({
      appEnv: 'production',
      platform: 'android',
      configVersion: '1.0.0',
      androidVersionCode: 12,
    }).build_number).toBe('12');
  });
});

describe('isPostHogProjectToken', () => {
  it('rejects missing and placeholder tokens', () => {
    expect(isPostHogProjectToken(undefined)).toBe(false);
    expect(isPostHogProjectToken('')).toBe(false);
    expect(isPostHogProjectToken('phc_your_project_token_here')).toBe(false);
  });

  it('accepts a real phc_ project token prefix', () => {
    expect(isPostHogProjectToken('phc_exampletokenvalue')).toBe(true);
  });
});
