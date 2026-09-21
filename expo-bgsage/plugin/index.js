// expo-bgsage/plugin/index.js — Expo config plugin (plain JS: loaded via require()).
//
// Copies the 21 bgsage weight files + bearoff DB into the native projects and
// registers them as bundled resources (iOS) / assets (Android).
//
// Expected layout before prebuild (populated by .github/scripts/fetch-bgsage-engine.sh):
//   <module>/assets/sl_s9_*.weights.best   (14 files)
//   <module>/assets/sl_s11_*.weights.best  (7 files)
//   <module>/assets/bearoff_1sided.db
const { withXcodeProject, withDangerousMod } = require('@expo/config-plugins');
const fs = require('fs');
const path = require('path');
const xcode = require('xcode');

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

const withBgsageAssets = (config) => {
  // iOS: copy into ios/bgsage-assets and add each file to the app target's
  // Resources build phase so Bundle.main can find them.
  config = withXcodeProject(config, (config) => {
    const projectRoot = config.modRequest.projectRoot;
    const moduleAssets = path.join(projectRoot, 'node_modules', 'expo-bgsage', 'assets');
    const iosDest = path.join(projectRoot, 'ios', 'bgsage-assets');
    copyDir(moduleAssets, iosDest);

    const iosDir = path.join(projectRoot, 'ios');
    const xcodeproj = fs.readdirSync(iosDir).find((f) => f.endsWith('.xcodeproj'));
    if (!xcodeproj) throw new Error('[expo-bgsage] no .xcodeproj found under ios/');
    const pbxPath = path.join(iosDir, xcodeproj, 'project.pbxproj');
    const proj = xcode.project(pbxPath);
    proj.parseSync();
    const target = proj.getFirstTarget().uuid;
    for (const f of ASSET_FILES) {
      proj.addResourceFile(path.join('bgsage-assets', f), { target });
    }
    fs.writeFileSync(pbxPath, proj.writeSync());
    return config;
  });

  // Android: copy into android/app/src/main/assets/bgsage (AAssetManager path).
  // The Kotlin module copies these to internal storage on first init because
  // the C API needs real file paths.
  config = withDangerousMod(config, [
    'android',
    (config) => {
      const projectRoot = config.modRequest.projectRoot;
      const moduleAssets = path.join(projectRoot, 'node_modules', 'expo-bgsage', 'assets');
      const androidDest = path.join(projectRoot, 'android', 'app', 'src', 'main', 'assets', 'bgsage');
      copyDir(moduleAssets, androidDest);
      return config;
    },
  ]);

  return config;
};

module.exports = withBgsageAssets;
