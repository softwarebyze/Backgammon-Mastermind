import { STORE_LINKS } from '@/lib/app-links';

export type StoreLink = { store: 'appStore' | 'googlePlay'; url: string };

/**
 * Which store links a web visitor should see (#350). iPhone Safari already
 * shows Apple's Smart App Banner, so it gets none; other iOS browsers get the
 * App Store, Android gets Google Play, and desktop gets both.
 */
export function storeLinksForUserAgent(userAgent: string, maxTouchPoints = 0): StoreLink[] {
  const appStore: StoreLink = { store: 'appStore', url: STORE_LINKS.appStore };
  const googlePlay: StoreLink = { store: 'googlePlay', url: STORE_LINKS.googlePlay };
  if (/Android/i.test(userAgent))
    return [googlePlay];
  // iPadOS reports a Mac user agent; touch support tells them apart.
  const isIOS = /iPhone|iPad|iPod/i.test(userAgent) || (/Macintosh/i.test(userAgent) && maxTouchPoints > 1);
  if (isIOS) {
    const otherBrowser = /CriOS|FxiOS|EdgiOS|OPiOS|GSA\//i.test(userAgent);
    return otherBrowser ? [appStore] : [];
  }
  return [appStore, googlePlay];
}
