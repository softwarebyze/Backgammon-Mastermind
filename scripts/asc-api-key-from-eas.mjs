#!/usr/bin/env node
/**
 * Export App Store Connect API key from Expo EAS credentials → .cache/asc-api-key.json
 * for Fastlane deliver (agents + local). Requires `eas login` / Expo session.
 *
 * Override key UUID with ASC_EAS_KEY_ID (Expo GraphQL id of the ASC API key).
 */
import fs from 'node:fs';
import path from 'node:path';
import os from 'node:os';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT = path.join(ROOT, '.cache/asc-api-key.json');
const DEFAULT_KEY_ID = '6086269d-b10d-43bf-89ad-f212f7150429';

function loadExpoSession() {
  const statePath = path.join(os.homedir(), '.expo/state.json');
  if (!fs.existsSync(statePath)) {
    throw new Error(`No Expo session at ${statePath}. Run: eas login`);
  }
  const state = JSON.parse(fs.readFileSync(statePath, 'utf8'));
  const secret = state?.auth?.sessionSecret;
  if (!secret) {
    throw new Error('Expo state.json has no auth.sessionSecret. Run: eas login');
  }
  return secret;
}

async function gql(sessionSecret, query, variables) {
  const res = await fetch('https://api.expo.dev/graphql', {
    method: 'POST',
    headers: {
      'content-type': 'application/json',
      'expo-session': sessionSecret,
      'user-agent': 'eas-cli/16.0.0',
    },
    body: JSON.stringify({ query, variables }),
  });
  const json = await res.json();
  if (json.errors?.length) {
    throw new Error(JSON.stringify(json.errors));
  }
  return json.data;
}

async function main() {
  const sessionSecret = loadExpoSession();
  const keyId = process.env.ASC_EAS_KEY_ID || DEFAULT_KEY_ID;
  const data = await gql(
    sessionSecret,
    `query($id: ID!) {
      appStoreConnectApiKey {
        byId(id: $id) {
          keyIdentifier
          issuerIdentifier
          keyP8
        }
      }
    }`,
    { id: keyId }
  );

  const key = data?.appStoreConnectApiKey?.byId;
  if (!key?.keyP8 || !key.keyIdentifier || !key.issuerIdentifier) {
    throw new Error(`ASC API key ${keyId} not found or incomplete in EAS credentials`);
  }

  fs.mkdirSync(path.dirname(OUT), { recursive: true });
  const payload = {
    key_id: key.keyIdentifier,
    issuer_id: key.issuerIdentifier,
    key: key.keyP8,
    duration: 1200,
    in_house: false,
  };
  fs.writeFileSync(OUT, `${JSON.stringify(payload, null, 2)}\n`, { mode: 0o600 });
  console.log(`Wrote ${path.relative(ROOT, OUT)} (gitignored). Ready for Fastlane.`);
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
