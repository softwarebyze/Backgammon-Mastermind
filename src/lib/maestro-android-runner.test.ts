import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const script = join(__dirname, '../../.github/scripts/run-maestro-e2e-emulator.sh');

it('runs every configured flow once with an app ID and a report output', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'android-runner-'));
  try {
    mkdirSync(join(fixture, '.github/scripts'), { recursive: true });
    writeFileSync(join(fixture, '.github/scripts/record-android-screen.sh'), readFileSync(join(__dirname, '../../.github/scripts/record-android-screen.sh')));
    for (const command of ['sleep']) {
      writeFileSync(join(fixture, command), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    }
    writeFileSync(join(fixture, 'adb'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[1] === 'screenrecord') require('node:child_process').execFileSync('/bin/sleep', ['0.1']);
if (args[0] === 'pull') fs.writeFileSync(args.at(-1), 'video');
`, { mode: 0o755 });
    writeFileSync(join(fixture, 'ffmpeg'), `#!/usr/bin/env node
require('node:fs').writeFileSync(process.env.JOIN_CALL, JSON.stringify(process.argv.slice(2)));
`, { mode: 0o755 });
    writeFileSync(join(fixture, 'maestro'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n');
if (!args.includes('APP_ID=com.test.release')) process.exit(42);
if (!args.includes('--output')) process.exit(43);
require('node:child_process').execFileSync('/bin/sleep', ['0.3']);
`, { mode: 0o755 });
    const result = spawnSync('bash', [script, fixture, 'com.test.release'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${fixture}:${process.env.PATH}`, CALLS: join(fixture, 'calls'), JOIN_CALL: join(fixture, 'join-call') },
      timeout: 10000,
    });
    expect(result.status).toBe(0);
    const calls = readFileSync(join(fixture, 'calls'), 'utf8').trim().split('\n').map(line => JSON.parse(line) as string[]);
    expect(calls).toHaveLength(1);
    const joinArgs = JSON.parse(readFileSync(join(fixture, 'join-call'), 'utf8')) as string[];
    expect(joinArgs).toEqual(expect.arrayContaining(['concat', join(fixture, '.maestro-ci-output/recordings/concat.txt'), join(fixture, 'e2e-recording.mp4')]));
    const args = calls[0]!;
    const flows = args.filter(arg => arg.endsWith('.yaml')).map(arg => basename(arg));
    expect(new Set(flows).size).toBe(flows.length);
    const config = readFileSync(join(__dirname, '../../.maestro/config.yaml'), 'utf8');
    const configured = [...config.matchAll(/app\/([\w-]+\.yaml)/g)].map(match => match[1]);
    expect(flows).toEqual(expect.arrayContaining(configured));
    expect(args[args.indexOf('--output') + 1]).toBe(join(fixture, 'report.xml'));
  }
  finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
