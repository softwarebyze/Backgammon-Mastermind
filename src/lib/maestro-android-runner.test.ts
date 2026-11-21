import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const script = join(__dirname, '../../.github/scripts/run-maestro-e2e-emulator.sh');

const SHARDS = (JSON.parse(readFileSync(join(__dirname, '../../.maestro/android-shards.json'), 'utf8')) as { shards: string[][] }).shards;

function runRunner(shard?: string) {
  const fixture = mkdtempSync(join(tmpdir(), 'android-runner-'));
  mkdirSync(join(fixture, '.github/scripts'), { recursive: true });
  mkdirSync(join(fixture, '.maestro'), { recursive: true });
  writeFileSync(join(fixture, '.maestro/android-shards.json'), readFileSync(join(__dirname, '../../.maestro/android-shards.json')));
  writeFileSync(join(fixture, '.github/scripts/record-android-screen.sh'), readFileSync(join(__dirname, '../../.github/scripts/record-android-screen.sh')));
  writeFileSync(join(fixture, 'sleep'), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
  writeFileSync(join(fixture, 'adb'), `#!/usr/bin/env node
const args = process.argv.slice(2);
if (args[1] === 'screenrecord') require('node:child_process').execFileSync('/bin/sleep', ['0.1']);
if (args[0] === 'pull') require('node:fs').writeFileSync(args.at(-1), 'video');
`, { mode: 0o755 });
  writeFileSync(join(fixture, 'maestro'), `#!/usr/bin/env node
require('node:fs').appendFileSync(process.env.CALLS, JSON.stringify(process.argv.slice(2)) + '\\n');
`, { mode: 0o755 });
  const result = spawnSync('bash', [script, fixture, 'com.test.release', ...(shard === undefined ? [] : [shard])], {
    encoding: 'utf8',
    env: { ...process.env, PATH: `${fixture}:${process.env.PATH}`, CALLS: join(fixture, 'calls') },
    timeout: 10000,
  });
  const calls = existsSync(join(fixture, 'calls'))
    ? readFileSync(join(fixture, 'calls'), 'utf8').trim().split('\n').map(line => JSON.parse(line) as string[])
    : [];
  rmSync(fixture, { recursive: true, force: true });
  return { result, calls, flows: calls.map(args => args.filter(arg => arg.endsWith('.yaml')).map(arg => basename(arg, '.yaml'))) };
}

it.each(SHARDS.map((flows, index) => [index + 1, flows] as const))('runs only shard %i\'s flows, in order', (shard, flows) => {
  const { result, flows: ran } = runRunner(String(shard));
  expect(result.status).toBe(0);
  expect(ran).toEqual([flows]);
  expect(result.stdout).toContain(`for shard ${shard}`);
});

it('fails before touching the device when a shard does not exist', () => {
  const { result, calls } = runRunner(String(SHARDS.length + 1));
  expect(result.status).not.toBe(0);
  expect(result.stderr).toContain(`No flows for shard ${SHARDS.length + 1}`);
  expect(calls).toHaveLength(0);
});

it('runs every configured flow once with an app ID and a report output', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'android-runner-'));
  try {
    mkdirSync(join(fixture, '.github/scripts'), { recursive: true });
    mkdirSync(join(fixture, '.maestro'), { recursive: true });
    writeFileSync(join(fixture, '.maestro/android-shards.json'), readFileSync(join(__dirname, '../../.maestro/android-shards.json')));
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
    // Like real ffmpeg, write the output file (the last argument).
    writeFileSync(join(fixture, 'ffmpeg'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.writeFileSync(process.env.JOIN_CALL, JSON.stringify(args));
fs.writeFileSync(args.at(-1), 'joined');
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
    // ffmpeg joins into a temporary file, which is then moved to the final name.
    expect(joinArgs).toEqual(expect.arrayContaining(['concat', join(fixture, '.maestro-ci-output/recordings/concat.txt'), join(fixture, 'e2e-recording.partial.mp4')]));
    expect(readFileSync(join(fixture, 'e2e-recording.mp4'), 'utf8')).toBe('joined');
    expect(existsSync(join(fixture, 'e2e-recording.partial.mp4'))).toBe(false);
    const args = calls[0]!;
    const flows = args.filter(arg => arg.endsWith('.yaml')).map(arg => basename(arg));
    expect(new Set(flows).size).toBe(flows.length);
    const config = readFileSync(join(__dirname, '../../.maestro/config.yaml'), 'utf8');
    const configured = [...config.matchAll(/app\/([\w-]+\.yaml)/g)].map(match => match[1]);
    expect(flows).toEqual(expect.arrayContaining(configured));
    // With no shard argument the script runs every shard, in order.
    expect(flows).toEqual(SHARDS.flat().map(flow => `${flow}.yaml`));
    expect(args[args.indexOf('--output') + 1]).toBe(join(fixture, 'report.xml'));
  }
  finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
