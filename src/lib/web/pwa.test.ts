import { requestPersistentStorage, shouldRegisterPwa } from './pwa';

describe('service worker registration gating', () => {
  it('registers only on the web, in production, on a browser that supports workers', () => {
    expect(
      shouldRegisterPwa({ platform: 'web', production: true, hasServiceWorker: true }),
    ).toBe(true);
  });

  it.each([
    ['native app', { platform: 'ios', production: true, hasServiceWorker: true }],
    ['development server', { platform: 'web', production: false, hasServiceWorker: true }],
    ['browser without service workers', { platform: 'web', production: true, hasServiceWorker: false }],
  ])('stays out of the way in %s', (_label, env) => {
    expect(shouldRegisterPwa(env)).toBe(false);
  });
});

describe('persistent storage request', () => {
  const persist = jest.fn(() => Promise.resolve(true));
  const originalStorage = Object.getOwnPropertyDescriptor(navigator, 'storage');
  const originalMatchMedia = window.matchMedia;

  function displayMode(standalone: boolean) {
    window.matchMedia = jest.fn(() => ({ matches: standalone })) as unknown as typeof window.matchMedia;
  }

  beforeEach(() => {
    persist.mockClear();
    Object.defineProperty(navigator, 'storage', { value: { persist }, configurable: true });
  });

  afterAll(() => {
    window.matchMedia = originalMatchMedia;
    if (originalStorage) {
      Object.defineProperty(navigator, 'storage', originalStorage);
    }
    else {
      delete (navigator as { storage?: unknown }).storage;
    }
  });

  it('asks the installed app to keep its offline cache', () => {
    displayMode(true);
    requestPersistentStorage();
    expect(persist).toHaveBeenCalledTimes(1);
  });

  it('never prompts a visitor in a browser tab', () => {
    displayMode(false);
    requestPersistentStorage();
    expect(persist).not.toHaveBeenCalled();
  });
});
