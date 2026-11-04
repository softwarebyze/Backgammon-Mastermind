#!/usr/bin/env node
/**
 * Export the App Store signing credentials EAS keeps for this project (the
 * distribution certificate and one provisioning profile per bundle ID) to
 * .cache/ios-signing/, so a GitHub-hosted Mac can sign a build without an EAS
 * build. Reads credentials only: no EAS build minutes are used.
 *
 * Auth: EXPO_TOKEN (CI) or an `eas login` session.
 * Env: EAS_PROJECT_ID (defaults to app.config.ts's), IOS_BUNDLE_IDS (comma
 * separated; defaults to the preview app and its Messages extension).
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
const BUNDLE_IDS = (process.env.IOS_BUNDLE_IDS || 'com.backgammonmastermind.preview,com.backgammonmastermind.preview.messages')
  .split(',')
  .map(id => id.trim())
  .filter(Boolean);

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
  let certificate = null;
  for (const bundleId of BUNDLE_IDS) {
    const credentials = all.find(c => c.appleAppIdentifier?.bundleIdentifier === bundleId);
    const build = credentials?.iosAppBuildCredentialsList?.[0];
    if (!build?.provisioningProfile?.provisioningProfile || !build.distributionCertificate?.certificateP12)
      throw new Error(`No App Store credentials in EAS for ${bundleId}. Set them up once with: eas credentials -p ios`);
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
    `${JSON.stringify({ certificatePassword: certificate.certificatePassword ?? '', profiles }, null, 2)}\n`,
    { mode: 0o600 },
  );
  console.log(`Distribution certificate ${certificate.serialNumber}: valid until ${certificate.validityNotAfter}`);
  console.log(`Wrote ${path.relative(ROOT, OUT)}/ (gitignored).`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
