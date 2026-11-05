import type * as ForceLtr from './force-ltr';

function loadOn(os: 'web' | 'ios') {
  let mod!: typeof ForceLtr;
  jest.isolateModules(() => {
    const { Platform } = require('react-native');
    Object.defineProperty(Platform, 'OS', { value: os, configurable: true });
    mod = require('./force-ltr');
  });
  return mod;
}

describe('force-ltr', () => {
  it('uses a dir prop on web, never a `direction` style react-native-web rejects', () => {
    const web = loadOn('web');
    expect(web.forceLtrStyle).toEqual({});
    expect(web.forceLtrWebDir).toEqual({ dir: 'ltr' });
  });

  it('uses the Yoga direction style on native', () => {
    const ios = loadOn('ios');
    expect(ios.forceLtrStyle).toEqual({ direction: 'ltr' });
    expect(ios.forceLtrWebDir).toEqual({});
  });
});
