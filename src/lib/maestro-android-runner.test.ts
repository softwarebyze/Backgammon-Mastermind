import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { basename, join } from 'node:path';

const script = join(__dirname, '../../.github/scripts/run-maestro-e2e-emulator.sh');

it('runs every configured flow once with an app ID and a report output', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'android-runner-'));
  try {
    for (const command of ['adb', 'sleep']) {
      writeFileSync(join(fixture, command), '#!/bin/sh\nexit 0\n', { mode: 0o755 });
    }
    writeFileSync(join(fixture, 'maestro'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n');
if (!args.includes('APP_ID=com.test.release')) process.exit(42);
if (!args.includes('--output')) process.exit(43);
`, { mode: 0o755 });
    const result = spawnSync('bash', [script, fixture, 'com.test.release'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${fixture}:${process.env.PATH}`, CALLS: join(fixture, 'calls') },
      timeout: 10000,
    });
    expect(result.status).toBe(0);
    const calls = readFileSync(join(fixture, 'calls'), 'utf8').trim().split('\n').map(line => JSON.parse(line) as string[]);
    expect(calls).toHaveLength(1);
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
