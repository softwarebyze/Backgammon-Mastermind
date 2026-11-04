#!/usr/bin/env node
/**
 * Export the App Store signing credentials EAS keeps for this project (the
 * distribution certificate and one provisioning profile per bundle ID) to
 * .cache/ios-signing/, so a GitHub-hosted Mac can sign a build without an EAS
 * build. Reads credentials only: no EAS build minutes are used.
 *
 * Auth: EXPO_TOKEN (CI) or an `eas login` session.
 * Env: EAS_PROJECT_ID (defaults to app.config.ts's), IOS_BUNDLE_IDS (comma
 * separated, required; defaults to the preview app), IOS_OPTIONAL_BUNDLE_IDS
 * (signed when EAS has credentials, skipped otherwise; defaults to the
 * Messages extension). Skipped IDs are listed in signing.json `skipped`.
 *
 * Writes:
 *   .cache/ios-signing/distribution.p12
 *   .cache/ios-signing/signing.json  { certificatePassword, profiles: { bundleId: path } }
 *   .cache/ios-signing/<bundleId>.mobileprovision
 */
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.cache/ios-signing');
const PROJECT_ID = process.env.EAS_PROJECT_ID || '7ec6600a-8b02-4714-acc1-08385effa4c9';
const list = value => value.split(',').map(id => id.trim()).filter(Boolean);
const BUNDLE_IDS = list(process.env.IOS_BUNDLE_IDS || 'com.backgammonmastermind.preview');
const OPTIONAL_BUNDLE_IDS = list(process.env.IOS_OPTIONAL_BUNDLE_IDS ?? 'com.backgammonmastermind.preview.messages');

function loadExpoAuth() {
  if (process.env.EXPO_TOKEN)
    return { authorization: `Bearer ${process.env.EXPO_TOKEN}` };
  const statePath = path.join(os.homedir(), '.expo/state.json');
  if (!fs.existsSync(statePath))
    throw new Error(`No Expo session at ${statePath}. Run: eas login or set EXPO_TOKEN`);
  const secret = JSON.parse(fs.readFileSync(statePath, 'utf8'))?.auth?.sessionSecret;
  if (!secret)
    throw new Error('Expo state.json has no auth.sessionSecret. Run: eas login or set EXPO_TOKEN');
  return { 'expo-session': secret };
}

async function gql(authHeaders, query, variables) {
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: { 'content-type': 'application/json', ...authHeaders, 'user-agent': 'eas-cli/16.0.0' },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length)
    throw new Error(JSON.stringify(json.errors));
  return json.data;
}

const QUERY = `query IosStoreSigning($appId: String!) {
  app {
    byId(appId: $appId) {
      iosAppCredentials {
        appleAppIdentifier { bundleIdentifier }
        iosAppBuildCredentialsList(filter: { iosDistributionType: APP_STORE }) {
          distributionCertificate { serialNumber certificateP12 certificatePassword validityNotAfter }
          provisioningProfile { provisioningProfile expiration status }
        }
      }
    }
  }
}`;

async function main() {
  const data = await gql(loadExpoAuth(), QUERY, { appId: PROJECT_ID });
  const all = data?.app?.byId?.iosAppCredentials ?? [];
  const profiles = {};
  const skipped = [];
  let certificate = null;
  const known = all.filter(c => c.iosAppBuildCredentialsList?.length).map(c => c.appleAppIdentifier?.bundleIdentifier);
  console.log(`EAS has App Store credentials for: ${known.join(', ') || 'nothing'}`);
  for (const bundleId of [...BUNDLE_IDS, ...OPTIONAL_BUNDLE_IDS]) {
    const credentials = all.find(c => c.appleAppIdentifier?.bundleIdentifier === bundleId);
    const build = credentials?.iosAppBuildCredentialsList?.[0];
    if (!build?.provisioningProfile?.provisioningProfile || !build.distributionCertificate?.certificateP12) {
      if (OPTIONAL_BUNDLE_IDS.includes(bundleId)) {
        console.log(`Skipping ${bundleId}: no App Store credentials in EAS (set them up with: eas credentials -p ios)`);
        skipped.push(bundleId);
        continue;
      }
      throw new Error(`No App Store credentials in EAS for ${bundleId}. Set them up once with: eas credentials -p ios`);
    }
    if (certificate && certificate.serialNumber !== build.distributionCertificate.serialNumber)
      throw new Error(`${bundleId} is signed with a different distribution certificate than ${BUNDLE_IDS[0]}`);
    certificate = build.distributionCertificate;
    const file = path.join(OUT, `${bundleId}.mobileprovision`);
    fs.mkdirSync(OUT, { recursive: true });
    fs.writeFileSync(file, Buffer.from(build.provisioningProfile.provisioningProfile, 'base64'), { mode: 0o600 });
    profiles[bundleId] = file;
    console.log(`Profile for ${bundleId}: expires ${build.provisioningProfile.expiration}`);
  }
  fs.writeFileSync(path.join(OUT, 'distribution.p12'), Buffer.from(certificate.certificateP12, 'base64'), { mode: 0o600 });
  fs.writeFileSync(
    path.join(OUT, 'signing.json'),
    `${JSON.stringify({ certificatePassword: certificate.certificatePassword ?? '', profiles, skipped }, null, 2)}\n`,
    { mode: 0o600 },
  );
  console.log(`Distribution certificate ${certificate.serialNumber}: valid until ${certificate.validityNotAfter}`);
  console.log(`Wrote ${path.relative(ROOT, OUT)}/ (gitignored).`);
  if (process.env.GITHUB_OUTPUT)
    fs.appendFileSync(process.env.GITHUB_OUTPUT, `skipped=${skipped.join(',')}\n`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
