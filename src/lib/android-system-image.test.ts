import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

function install(tools: boolean, successAfter = 2) {
  const fixture = mkdtempSync(join(tmpdir(), 'android-sdk-install-'));
  try {
    const bin = join(fixture, 'cmdline-tools/latest/bin');
    mkdirSync(bin, { recursive: true });
    writeFileSync(join(bin, 'sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    writeFileSync(join(bin, 'sdkmanager'), `#!/usr/bin/env node
const fs = require('node:fs');
if (process.argv[2] === '--licenses') process.exit(0);
const log = process.env.SDK_CALLS;
fs.appendFileSync(log, JSON.stringify(process.argv.slice(2)) + '\\n');
const attempts = fs.readFileSync(log, 'utf8').trim().split('\\n').length;
if (attempts < Number(process.env.SUCCESS_AFTER)) {
  process.stderr.write('SDK download failed\\n');
  process.exit(1);
}
`, { mode: 0o755 });
    const result = spawnSync('bash', [join(__dirname, '../../.github/scripts/install-android-system-image.sh')], {
      encoding: 'utf8',
      env: {
        ...process.env,
        ANDROID_HOME: fixture,
        INSTALL_EMULATOR_TOOLS: String(tools),
        SDK_CALLS: join(fixture, 'calls'),
        SUCCESS_AFTER: String(successAfter),
        PATH: `${bin}:${process.env.PATH}`,
      },
    });
    const calls = readFileSync(join(fixture, 'calls'), 'utf8').trim().split('\n').map(line => JSON.parse(line) as string[]);
    return { ...result, calls };
  }
  finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

it.each([false, true])('retries SDK downloads and includes emulator tools only when requested (%s)', (tools) => {
  const result = install(tools);
  expect(result.status).toBe(0);
  expect(result.calls).toHaveLength(2);
  expect(result.calls[1]).toEqual([
    '--install',
    'system-images;android-34;google_apis;x86_64',
    ...(tools ? ['platform-tools', 'emulator'] : []),
  ]);
  expect(result.stderr).toContain('SDK download failed');
});

it('fails after three attempts and preserves the SDK error in its output', () => {
  const result = install(true, 4);
  expect(result.status).toBe(1);
  expect(result.calls).toHaveLength(3);
  expect(result.stderr).toContain('SDK download failed');
  expect(result.stderr).toContain('after 3 attempts');
});
