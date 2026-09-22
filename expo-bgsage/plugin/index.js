// expo-bgsage/plugin/index.js — Expo config plugin (plain JS: loaded via require()).
//
// Copies the 21 bgsage weight files + bearoff DB into the native projects and
// registers them as bundled resources (iOS) / assets (Android).
//
// Expected layout before prebuild (populated by .github/scripts/fetch-bgsage-engine.sh):
//   <module>/assets/sl_s9_*.weights.best   (14 files)
//   <module>/assets/sl_s11_*.weights.best  (7 files)
//   <module>/assets/bearoff_1sided.db
const { withXcodeProject, withDangerousMod, IOSConfig } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');

const WEIGHT_NAMES = [
  'sl_s9_purerace', 'sl_s9_race_race', 'sl_s9_race_att', 'sl_s9_race_prim',
  'sl_s9_race_anch', 'sl_s9_att_race', 'sl_s9_att_att', 'sl_s9_att_prim',
  'sl_s9_att_anch', 'sl_s9_prim_race', 'sl_s9_prim_att', 'sl_s9_prim_anch',
  'sl_s9_anch_race', 'sl_s9_anch_att', 'sl_s11_bg_deep', 'sl_s11_bg_middle',
  'sl_s11_bg_double', 'sl_s11_bg_p3', 'sl_s11_bg_containment', 'sl_s11_bg_snake',
  'sl_s11_bg_massive',
];
const ASSET_FILES = [...WEIGHT_NAMES.map((n) => `${n}.weights.best`), 'bearoff_1sided.db'];

function copyDir(src, dest) {
  fs.mkdirSync(dest, { recursive: true });
  for (const f of ASSET_FILES) {
    const s = path.join(src, f);
    if (!fs.existsSync(s)) throw new Error(`[expo-bgsage] missing asset: ${s}`);
    fs.copyFileSync(s, path.join(dest, f));
  }
}

// pnpm (node-linker=hoisted) copies `file:` deps into node_modules at install
// time instead of symlinking, so engine assets fetched AFTER `pnpm install`
// (as CI does) are missing from the installed copy. Prefer the workspace
// source dir; fall back to the installed copy.
function resolveModuleAssets(projectRoot) {
  const candidates = [
    path.join(projectRoot, 'expo-bgsage', 'assets'),
    path.join(projectRoot, 'node_modules', 'expo-bgsage', 'assets'),
  ];
  for (const dir of candidates) {
    if (ASSET_FILES.every((f) => fs.existsSync(path.join(dir, f)))) return dir;
  }
  return candidates[1]; // let copyDir throw the descriptive "missing asset" error
}

const withBgsageAssets = (config) => {
  // iOS: copy into ios/bgsage-assets and add each file to the app target's
  // Resources build phase so Bundle.main can find them.
  //
  // Implementation notes (both learned the hard way in CI):
  // - Mutate config.modResults (the parsed project the ios.xcodeproj base mod
  //   writes back). Re-parsing project.pbxproj with a separate `xcode`
  //   instance and writing it directly is silently clobbered by the base mod.
  // - Use IOSConfig's addResourceFileToGroup, not xcode's addResourceFile():
  //   the latter unconditionally dereferences a PBXGroup named "Resources"
  //   (correctForResourcesPath), which a fresh Expo prebuild does not have ->
  //   TypeError: Cannot read properties of null (reading 'path').
  config = withXcodeProject(config, (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const moduleAssets = resolveModuleAssets(projectRoot);
    const iosDest = path.join(projectRoot, 'ios', 'bgsage-assets');
    copyDir(moduleAssets, iosDest);

    const project = config.modResults;
    IOSConfig.XcodeUtils.ensureGroupRecursively(project, 'bgsage-assets');
    const targetUuid = project.getFirstTarget().uuid;
    for (const f of ASSET_FILES) {
      IOSConfig.XcodeUtils.addResourceFileToGroup({
        filepath: path.join('bgsage-assets', f),
        groupName: 'bgsage-assets',
        isBuildFile: true,
        project,
        targetUuid,
      });
    }
    return config;
  });

  // Android: copy into android/app/src/main/assets/bgsage (AAssetManager path).
  // The Kotlin module copies these to internal storage on first init because
  // the C API needs real file paths.
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const moduleAssets = resolveModuleAssets(projectRoot);
      const androidDest = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'bgsage');
      copyDir(moduleAssets, androidDest);
      return config;
    },
  ]);

  return config;
};

module.exports = withBgsageAssets;
