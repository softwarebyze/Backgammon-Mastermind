/** Paths and absolute URLs for web favicon / iOS share-sheet / Open Graph images. */

export const APPLE_TOUCH_ICON_PATH = '/apple-touch-icon.png';
export const FAVICON_PNG_PATH = '/favicon.png';
export const FAVICON_ICO_PATH = '/favicon.ico';

function originFromEnv(
  env: NodeJS.Dict<string> = process.env,
): string {
  const explicit = env.EXPO_PUBLIC_WEB_ORIGIN?.replace(/\/$/, '');
  if (explicit) {
    return explicit;
  }
  const vercelHost = env.VERCEL_URL?.replace(/^https?:\/\//, '');
  if (vercelHost) {
    return `https://${vercelHost}`;
  }
  return '';
}

/** Absolute HTTPS on Vercel preview/production; root-relative locally. */
export function webAssetUrl(
  path: string,
  env: NodeJS.Dict<string> = process.env,
): string {
  const normalized = path.startsWith('/') ? path : `/${path}`;
  const origin = originFromEnv(env);
  return origin ? `${origin}${normalized}` : normalized;
}
