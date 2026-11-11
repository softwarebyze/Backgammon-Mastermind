import { STORE_LINKS } from '@/lib/app-links';
import { storeLinksForUserAgent } from './web-store-target';

const IPHONE_SAFARI = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Mobile/15E148 Safari/604.1';
const IPHONE_CHROME = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/130.0 Mobile/15E148 Safari/604.1';
const IPAD_SAFARI = 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.0 Safari/605.1.15';
const ANDROID_CHROME = 'Mozilla/5.0 (Linux; Android 15; Pixel 9) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Mobile Safari/537.36';
const DESKTOP_CHROME = 'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/130.0 Safari/537.36';

const stores = (ua: string, touch = 0) => storeLinksForUserAgent(ua, touch).map(l => l.store);

describe('storeLinksForUserAgent', () => {
  it('leaves iPhone and iPad Safari to the Smart App Banner', () => {
    expect(stores(IPHONE_SAFARI)).toEqual([]);
    expect(stores(IPAD_SAFARI, 5)).toEqual([]);
  });

  it('sends other iOS browsers to the App Store and Android to Google Play', () => {
    expect(stores(IPHONE_CHROME)).toEqual(['appStore']);
    expect(stores(ANDROID_CHROME)).toEqual(['googlePlay']);
  });

  it('offers both stores on desktop, including a Mac without touch', () => {
    expect(stores(DESKTOP_CHROME)).toEqual(['appStore', 'googlePlay']);
    expect(stores(IPAD_SAFARI, 0)).toEqual(['appStore', 'googlePlay']);
  });

  it('links the production listings', () => {
    expect(STORE_LINKS.appStore).toBe('https://apps.apple.com/app/id6792138473');
    expect(STORE_LINKS.googlePlay).toContain('id=com.backgammonmastermind');
  });
});
