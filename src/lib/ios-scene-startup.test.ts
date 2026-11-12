import type { ConfigContext, ExpoConfig } from '@expo/config';
import { execFileSync } from 'node:child_process';
import { dirname, join } from 'node:path';

// iOS 27 rejects Xcode 27 builds that don't adopt the UIKit scene lifecycle.
// SDK 57 needed expo-build-properties' `ios.enableSceneSupport` to migrate the
// AppDelegate; from SDK 58 the project template that prebuild uses ships scene
// startup itself and that flag only emits a deprecation warning.
const TEMPLATE = join(dirname(require.resolve('expo/package.json')), 'template.tgz');

function readTemplateFile(path: string) {
  return execFileSync('tar', ['-xzOf', TEMPLATE, `package/${path}`], { encoding: 'utf8' });
}

it.each(['development', 'preview', 'production'])('the resolved %s app no longer sets the obsolete scene flag', (flavor) => {
  const previous = process.env.EXPO_PUBLIC_APP_ENV;
  process.env.EXPO_PUBLIC_APP_ENV = flavor;
  let config: ExpoConfig | undefined;
  try {
    jest.isolateModules(() => {
      const app = require('../../app.config') as { default: (ctx: ConfigContext) => ExpoConfig };
      config = app.default({ config: {} } as ConfigContext);
    });
  }
  finally {
    if (previous === undefined)
      delete process.env.EXPO_PUBLIC_APP_ENV;
    else
      process.env.EXPO_PUBLIC_APP_ENV = previous;
  }
  const properties = config!.plugins!.find(entry => Array.isArray(entry) && entry[0] === 'expo-build-properties');
  expect(Array.isArray(properties)).toBe(true);
  const options = (properties as [string, { ios?: { enableSceneSupport?: boolean } }])[1];
  expect(options.ios?.enableSceneSupport).toBeUndefined();
});

it('prebuilds from a template that starts React Native from a scene delegate', () => {
  const delegate = readTemplateFile('ios/HelloWorld/AppDelegate.swift');
  expect(delegate).toContain('ExpoAppDelegate, ExpoReactNativeFactoryProvider');
  expect(delegate).not.toContain('UIWindow(frame:');
  expect(delegate).not.toContain('factory.startReactNative(');

  const plist = readTemplateFile('ios/HelloWorld/Info.plist');
  expect(plist).toContain('UIApplicationSceneManifest');
  expect(plist).toContain('UIWindowSceneSessionRoleApplication');
});
