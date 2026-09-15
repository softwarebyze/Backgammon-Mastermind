#!/usr/bin/env node
/**
 * Read-only App Store Connect version/status dump (no submit, no metadata push).
 *
 * Auth: same ASC API key Fastlane uses —
 *   pnpm screenshots:asc-key  → .cache/asc-api-key.json
 *   or EXPO_TOKEN / eas login (this script will fetch the key via EAS)
 *   or ASC_KEY_ID + ASC_ISSUER_ID + ASC_KEY_PATH | ASC_KEY_CONTENT
 *
 * Usage:
 *   pnpm asc:status
 *   ASC_APP_ID=6792138473 pnpm asc:status
 */
import { createPrivateKey, sign } from 'node:crypto';
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const KEY_JSON = path.join(ROOT, '.cache/asc-api-key.json');
const PRODUCTION_APP_ID = '6792138473';
const PREVIEW_APP_ID = '6781121420';

function b64urlJson(value) {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

function signAscJwt({ keyId, issuerId, pem }) {
  const now = Math.floor(Date.now() / 1000);
  const unsigned = `${b64urlJson({ alg: 'ES256', kid: keyId, typ: 'JWT' })}.${b64urlJson({
    iss: issuerId,
    iat: now,
    exp: now + 20 * 60,
    aud: 'appstoreconnect-v1',
  })}`;
  const key = createPrivateKey(pem);
  const derOrRaw = sign('sha256', Buffer.from(unsigned), {
    key,
    dsaEncoding: 'ieee-p1363',
  });
  return `${unsigned}.${derOrRaw.toString('base64url')}`;
}

function loadKeyFromEnv() {
  const keyId = process.env.ASC_KEY_ID;
  const issuerId = process.env.ASC_ISSUER_ID;
  if (!keyId || !issuerId) return null;
  if (process.env.ASC_KEY_CONTENT) {
    return { key_id: keyId, issuer_id: issuerId, key: process.env.ASC_KEY_CONTENT };
  }
  const keyPath = process.env.ASC_KEY_PATH;
  if (keyPath && fs.existsSync(keyPath)) {
    return { key_id: keyId, issuer_id: issuerId, key: fs.readFileSync(keyPath, 'utf8') };
  }
  return null;
}

function ensurePem(key) {
  const trimmed = key.trim();
  if (trimmed.includes('BEGIN')) return trimmed;
  return `-----BEGIN PRIVATE KEY-----\n${trimmed}\n-----END PRIVATE KEY-----`;
}

function loadAscKey() {
  const fromEnv = loadKeyFromEnv();
  if (fromEnv) return fromEnv;

  if (!fs.existsSync(KEY_JSON)) {
    execFileSync(process.execPath, [path.join(ROOT, 'scripts/asc-api-key-from-eas.mjs')], {
      cwd: ROOT,
      stdio: 'inherit',
    });
  }
  if (!fs.existsSync(KEY_JSON)) {
    throw new Error('Missing ASC key. Run: pnpm screenshots:asc-key  (or set ASC_KEY_ID / ASC_ISSUER_ID / ASC_KEY_PATH)');
  }
  return JSON.parse(fs.readFileSync(KEY_JSON, 'utf8'));
}

async function ascGet(token, pathname) {
  const url = `https://api.appstoreconnect.apple.com${pathname}`;
  const res = await fetch(url, {
    headers: { authorization: `Bearer ${token}`, accept: 'application/json' },
  });
  const text = await res.text();
  if (!res.ok) {
    throw new Error(`ASC ${res.status} ${pathname}: ${text.slice(0, 500)}`);
  }
  return JSON.parse(text);
}

function buildById(included) {
  const map = new Map();
  for (const item of included ?? []) {
    if (item.type === 'builds') {
      map.set(item.id, item);
    }
  }
  return map;
}

function formatApp(label, appId, payload) {
  const builds = buildById(payload.included);
  const rows = (payload.data ?? []).map((item) => {
    const attrs = item.attributes ?? {};
    const buildRel = item.relationships?.build?.data;
    const build = buildRel ? builds.get(buildRel.id) : null;
    return {
      version: attrs.versionString,
      state: attrs.appStoreState,
      platform: attrs.platform,
      build: build?.attributes?.version ?? '—',
    };
  });
  return { label, appId, versions: rows };
}

function printReport({ repoVersion, apps }) {
  console.log(`repo package.json / apple.version: ${repoVersion}`);
  console.log('(EAS remote build numbers are separate — eas.json appVersionSource: remote)\n');
  for (const app of apps) {
    console.log(`${app.label}  ASC ${app.appId}`);
    if (app.versions.length === 0) {
      console.log('  (no appStoreVersions)\n');
      continue;
    }
    for (const row of app.versions) {
      console.log(
        `  ${row.platform}  ${row.version}  build ${row.build}  ${row.state}`,
      );
    }
    console.log('');
  }
}

async function main() {
  const pkg = JSON.parse(fs.readFileSync(path.join(ROOT, 'package.json'), 'utf8'));
  const store = JSON.parse(fs.readFileSync(path.join(ROOT, 'store.config.json'), 'utf8'));
  const repoVersion = pkg.version;
  if (store?.apple?.version !== repoVersion) {
    console.warn(
      `warn: package.json (${repoVersion}) != store.config.json apple.version (${store?.apple?.version})`,
    );
  }

  const creds = loadAscKey();
  const token = signAscJwt({
    keyId: creds.key_id,
    issuerId: creds.issuer_id,
    pem: ensurePem(creds.key),
  });

  const only = process.env.ASC_APP_ID;
  const targets = only
    ? [{ label: 'app', appId: only }]
    : [
        { label: 'production', appId: PRODUCTION_APP_ID },
        { label: 'preview', appId: PREVIEW_APP_ID },
      ];

  const query
    = '/appStoreVersions?limit=20&include=build'
      + '&fields[appStoreVersions]=versionString,appStoreState,createdDate,platform'
      + '&fields[builds]=version,processingState,uploadedDate';

  const apps = [];
  for (const target of targets) {
    const payload = await ascGet(token, `/v1/apps/${target.appId}${query}`);
    apps.push(formatApp(target.label, target.appId, payload));
  }
  printReport({ repoVersion, apps });
}

main().catch((err) => {
  console.error(err.message || err);
  process.exit(1);
});
