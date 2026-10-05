/**
 * Expo config plugin: adds the Backgammon Mastermind iMessage extension.
 *
 * `expo prebuild` regenerates `ios/` from scratch, so the Messages extension
 * target cannot be added by hand in Xcode — it must be injected here:
 *
 *  1. Copies the Swift sources + Info.plist from `targets/imessage/` into
 *     `ios/BackgammonMastermindMessages/` (idempotent).
 *  2. Creates a `com.apple.product-type.app-extension.messages` target named
 *     `BackgammonMastermindMessages` with bundle id `<app>.messages`,
 *     links Messages.framework, and embeds the .appex in the main app
 *     (handled by node-xcode's addTarget for `app_extension`).
 *  3. Mirrors version/deployment settings from the main target so TestFlight
 *     versioning stays in lockstep.
 *
 * Wire format between the app/extension is owned by
 * `src/lib/imessage/codec.ts` (Swift mirror: MessagePayload.swift).
 */

const {
  withDangerousMod,
  withXcodeProject,
} = require('@expo/config-plugins');
const fs = require('node:fs');
const path = require('node:path');

const EXT_FOLDER = 'BackgammonMastermindMessages';
const EXT_PRODUCT_TYPE = 'com.apple.product-type.app-extension.messages';
const SWIFT_FILES = [
  'GameEngine.swift',
  'MessagePayload.swift',
  'GameSession.swift',
  'BoardView.swift',
  'MessagesViewController.swift',
];

function extensionBundleId(config) {
  const main = config.ios?.bundleIdentifier;
  if (!main) {
    throw new Error(
      '[with-imessage-extension] ios.bundleIdentifier is required to derive the extension id.',
    );
  }
  return `${main}.messages`;
}

function withImessageSources(config) {
  return withDangerousMod(config, [
    'ios',
    async (cfg) => {
      const projectRoot = cfg.modRequest.projectRoot;
      const iosRoot = cfg.modRequest.platformProjectRoot;
      const fromDir = path.join(projectRoot, 'targets', 'imessage');
      const toDir = path.join(iosRoot, EXT_FOLDER);
      fs.mkdirSync(toDir, { recursive: true });
      for (const file of SWIFT_FILES.map(f => path.join('Sources', f))) {
        fs.copyFileSync(path.join(fromDir, file), path.join(toDir, path.basename(file)));
      }
      fs.copyFileSync(
        path.join(fromDir, 'Info.plist'),
        path.join(toDir, 'Info.plist'),
      );
      fs.copyFileSync(
        path.join(fromDir, 'MainInterface.storyboard'),
        path.join(toDir, 'MainInterface.storyboard'),
      );
      fs.rmSync(path.join(toDir, 'Assets.xcassets'), { recursive: true, force: true });
      fs.cpSync(path.join(fromDir, 'Assets.xcassets'), path.join(toDir, 'Assets.xcassets'), {
        recursive: true,
      });
      return cfg;
    },
  ]);
}

function findTargetByName(project, name) {
  const section = project.pbxNativeTargetSection();
  for (const uuid of Object.keys(section)) {
    if (uuid.endsWith('_comment')) {
      continue;
    }
    const target = section[uuid];
    if (target.name === `"${name}"` || target.name === name) {
      return { uuid, target };
    }
  }
  return null;
}

// Xcode 14+ signs resource bundles (incl. extensions) by default, so the target
// needs an explicit team or archive fails on EAS ("requires a development team").
// Inherit the host app's team rather than hardcoding one: a developer signing
// the host with a different team may not own the extension's signing assets.
const HOST_TEAM_FALLBACK = '75M38Z9JBF';
function hostDevelopmentTeam(project, mainTargetName) {
  for (const build of ['Release', 'Debug']) {
    const team = project.getBuildProperty('DEVELOPMENT_TEAM', build, mainTargetName);
    if (team) {
      return team;
    }
  }
  return HOST_TEAM_FALLBACK;
}

function withImessageTarget(config) {
  return withXcodeProject(config, (cfg) => {
    const project = cfg.modResults;
    const bundleId = extensionBundleId(cfg);
    const mainTargetName = project.getFirstTarget().firstTarget.name;
    const developmentTeam = hostDevelopmentTeam(project, mainTargetName);

    if (findTargetByName(project, EXT_FOLDER)) {
      // The target already exists, but the extension bundle id is derived from
      // ios.bundleIdentifier — which changes per flavor. Without this, a
      // prebuild that switches flavors (development -> preview) would keep the
      // previous flavor's id and build or sign the wrong extension.
      for (const build of ['Debug', 'Release']) {
        project.updateBuildProperty(
          'PRODUCT_BUNDLE_IDENTIFIER',
          bundleId,
          build,
          `"${EXT_FOLDER}"`,
        );
      }
      return cfg;
    }

    // node-xcode@3.0.1 `addTarget` has a bug on the `app_extension` path: it
    // creates the embed "Copy Files" phase on the *host* target, but then adds
    // the product to a phase looked up by `productFile.target`, which is the
    // *new* target. The lookup misses, `buildPhaseObject` returns undefined, and
    // `sources.files.push(...)` throws — prebuild dies with the target already
    // half-written into the project. Skip that one call and wire the embed
    // phase ourselves, which is what we want anyway (PlugIns, not Contacts).
    const addToCopyfilesPhase = project.addToPbxCopyfilesBuildPhase.bind(project);
    project.addToPbxCopyfilesBuildPhase = () => {};
    let created;
    try {
      created = project.addTarget(EXT_FOLDER, 'app_extension', EXT_FOLDER, bundleId);
    } finally {
      project.addToPbxCopyfilesBuildPhase = addToCopyfilesPhase;
    }
    const extUuid = created.uuid;

    // "Embed App Extensions" on the host. dstSubfolderSpec 13 is PlugIns.
    project.addBuildPhase(
      [`${EXT_FOLDER}.appex`],
      'PBXCopyFilesBuildPhase',
      'Embed App Extensions',
      project.getFirstTarget().uuid,
      13,
      '"$(CONTENTS_FOLDER_PATH)/PlugIns"',
    );

    // Messages extensions are a distinct product type from generic app extensions.
    project.pbxNativeTargetSection()[extUuid].productType = `"${EXT_PRODUCT_TYPE}"`;

    // Sources / Frameworks / Resources phases (addTarget leaves buildPhases empty).
    project.addBuildPhase([], 'PBXSourcesBuildPhase', 'Sources', extUuid);
    project.addBuildPhase([], 'PBXFrameworksBuildPhase', 'Frameworks', extUuid);
    project.addBuildPhase([], 'PBXResourcesBuildPhase', 'Resources', extUuid);

    const groupKey = project.pbxCreateGroup(EXT_FOLDER, EXT_FOLDER);
    for (const file of SWIFT_FILES) {
      project.addSourceFile(`${EXT_FOLDER}/${file}`, { target: extUuid }, groupKey);
    }
    // Asset catalog + storyboard: wire PBX entries directly (addResourceFile
    // assumes a top-level Resources group that Expo projects lack).
    const catalog = project.addFile(
      `${EXT_FOLDER}/Assets.xcassets`,
      groupKey,
      { target: extUuid },
    );
    catalog.uuid = project.generateUuid();
    catalog.target = extUuid;
    project.addToPbxBuildFileSection(catalog);
    project.addToPbxResourcesBuildPhase(catalog);
    const storyboard = project.addFile(
      `${EXT_FOLDER}/MainInterface.storyboard`,
      groupKey,
      { target: extUuid },
    );
    storyboard.uuid = project.generateUuid();
    storyboard.target = extUuid;
    project.addToPbxBuildFileSection(storyboard);
    project.addToPbxResourcesBuildPhase(storyboard);
    if (!project.hasFile('Messages.framework')) {
      project.addFramework('Messages.framework', { target: extUuid, link: true });
    }

    // node-xcode resolves targets by their pbx comment, which carries quotes.
    const extTargetName = `"${EXT_FOLDER}"`;
    // Mirror release metadata from the main target so versions stay in sync.
    for (const key of ['MARKETING_VERSION', 'CURRENT_PROJECT_VERSION', 'IPHONEOS_DEPLOYMENT_TARGET']) {
      const debug = project.getBuildProperty(key, 'Debug', mainTargetName);
      const release = project.getBuildProperty(key, 'Release', mainTargetName);
      if (debug) {
        project.updateBuildProperty(key, debug, 'Debug', extTargetName);
      }
      if (release) {
        project.updateBuildProperty(key, release, 'Release', extTargetName);
      }
    }
    for (const build of ['Debug', 'Release']) {
      project.updateBuildProperty(
        'INFOPLIST_FILE',
        `"${EXT_FOLDER}/Info.plist"`,
        build,
        extTargetName,
      );
      project.updateBuildProperty('SWIFT_VERSION', '5.0', build, extTargetName);
      // Xcode 14+ signs resource bundles (incl. extensions) by default — the
      // target needs an explicit team or archive fails on EAS ("requires a
      // development team"). Same team owns all flavors (see eas.json submit).
      project.updateBuildProperty('DEVELOPMENT_TEAM', developmentTeam, build, extTargetName);
      project.updateBuildProperty('GENERATE_INFOPLIST_FILE', 'NO', build, extTargetName);
      project.updateBuildProperty(
        'ASSETCATALOG_COMPILER_APPICON_NAME',
        '"iMessage App Icon"',
        build,
        extTargetName,
      );
      project.updateBuildProperty('GENERATE_INFOPLIST_FILE', 'NO', build, extTargetName);
      project.updateBuildProperty('TARGETED_DEVICE_FAMILY', '"1,2"', build, extTargetName);
      project.updateBuildProperty(
        'LD_RUNPATH_SEARCH_PATHS',
        '"$(inherited) @executable_path/Frameworks @executable_path/../../Frameworks"',
        build,
        extTargetName,
      );
    }

    return cfg;
  });
}

function withImessageExtension(config) {
  let next = withImessageSources(config);
  next = withImessageTarget(next);
  return next;
}

module.exports = withImessageExtension;
