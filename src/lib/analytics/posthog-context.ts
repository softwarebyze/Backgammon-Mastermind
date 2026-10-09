/**
 * Super-properties attached to every PostHog event so TestFlight crashes
 * can be sliced by env / platform / binary without hardcoding a token.
 */

/** Where the event came from; extend when quest / iMessage clients ship. */
export type AnalyticsSurface = 'app' | 'web' | 'quest' | 'imessage';

export function getAnalyticsSurface(platform: string): AnalyticsSurface {
  return platform === 'web' ? 'web' : 'app';
}

export type PostHogPersonContext = {
  app_env: string;
  platform: string;
  surface: AnalyticsSurface;
  app_version: string;
  build_number: string | null;
};

export function getPostHogPersonContext(input: {
  appEnv?: string | null;
  platform: string;
  configVersion?: string | null;
  nativeApplicationVersion?: string | null;
  nativeBuildVersion?: string | null;
  iosBuildNumber?: string | null;
  androidVersionCode?: string | number | null;
}): PostHogPersonContext {
  const app_version
    = input.nativeApplicationVersion
      || input.configVersion
      || 'unknown';
  const platformBuild
    = input.platform === 'ios'
      ? input.iosBuildNumber
      : input.androidVersionCode != null
        ? String(input.androidVersionCode)
        : null;
  const build_number = input.nativeBuildVersion || platformBuild || null;

  return {
    app_env: input.appEnv || 'development',
    platform: input.platform,
    surface: getAnalyticsSurface(input.platform),
    app_version,
    build_number,
  };
}

export function isPostHogProjectToken(token: string | undefined): boolean {
  return Boolean(token && token.startsWith('phc_') && token !== 'phc_your_project_token_here');
}
