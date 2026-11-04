import type { ConfigContext, ExpoConfig } from '@expo/config';
import { dirname, join } from 'node:path';

const ROOT = join(__dirname, '../..');
const { withIosSceneSupport } = require(join(dirname(require.resolve('expo-build-properties/package.json')), 'build/iosSceneSupport'));

// Mirrors the SDK 57 template's legacy startup that iOS 27 rejects.
const legacyDelegate = `class AppDelegate: ExpoAppDelegate {
    reactNativeFactory = factory

#if os(iOS) || os(tvOS)
    window = UIWindow(frame: UIScreen.main.bounds)
    factory.startReactNative(
      withModuleName: "main",
      in: window,
      launchOptions: launchOptions)
#endif
}
`;

it.each(['development', 'preview', 'production'])('adopts scene startup in the resolved %s app, not just its manifest', async (flavor) => {
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
  expect(options.ios?.enableSceneSupport).toBe(true);

  const migrated = withIosSceneSupport({ ...config, _internal: { projectRoot: ROOT } }, options);
  const request = { projectRoot: ROOT };
  const plist = await migrated.mods.ios.infoPlist({ ...migrated, modResults: {}, modRequest: request });
  expect(plist.modResults.UIApplicationSceneManifest.UISceneConfigurations.UIWindowSceneSessionRoleApplication).toEqual([
    { UISceneConfigurationName: 'Default Configuration', UISceneDelegateClassName: 'EXExpoAppSceneDelegate' },
  ]);
  const delegate = await migrated.mods.ios.appDelegate({ ...migrated, modResults: { language: 'swift', contents: legacyDelegate }, modRequest: request });
  expect(delegate.modResults.contents).toContain('ExpoAppDelegate, ExpoReactNativeFactoryProvider');
  expect(delegate.modResults.contents).toContain('reactNativeFactory = factory');
  expect(delegate.modResults.contents).not.toContain('UIWindow(frame:');
  expect(delegate.modResults.contents).not.toContain('factory.startReactNative(');
});
