import { shouldRegisterPwa } from './pwa';

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
