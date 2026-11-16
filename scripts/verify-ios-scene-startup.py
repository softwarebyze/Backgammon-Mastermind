"""Verify the generated app after every Expo config plugin has run."""
import plistlib
import sys
from pathlib import Path


def verify(ios):
    delegates = list(ios.glob('*/AppDelegate.swift'))
    if len(delegates) != 1:
        raise ValueError('Expected one generated application AppDelegate')
    app = delegates[0].parent
    with (app / 'Info.plist').open('rb') as stream:
        plist = plistlib.load(stream)
    scenes = plist['UIApplicationSceneManifest']['UISceneConfigurations']['UIWindowSceneSessionRoleApplication']
    if not scenes or not all(scene.get('UISceneDelegateClassName', '').endswith('.SceneDelegate') for scene in scenes):
        raise ValueError('Application scene must use SceneDelegate')
    delegate = delegates[0].read_text()
    if 'ExpoReactNativeFactoryProvider' not in delegate or 'UIWindow(frame:' in delegate or 'factory.startReactNative(' in delegate:
        raise ValueError('AppDelegate must delegate React Native startup to the scene')
    if 'ExpoAppSceneDelegate' not in (app / 'SceneDelegate.swift').read_text():
        raise ValueError('SceneDelegate must inherit ExpoAppSceneDelegate')
    print('Generated iOS scene startup verified')


if __name__ == '__main__':
    verify(Path(sys.argv[1]))
