import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(__dirname, '../../.github/scripts/run-maestro-ios-sim-smoke.sh');

it('retains iOS failure evidence in an uploadable directory and tests both devices', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'ios-smoke-'));
  try {
    writeFileSync(join(fixture, 'xcrun'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args.includes('list')) console.log(JSON.stringify({devices: {
  'com.apple.CoreSimulator.SimRuntime.iOS-26-0': [
    {udid: 'phone', name: 'iPhone test'}, {udid: 'tablet', name: 'iPad test'}
  ]
}}));
if (args.includes('screenshot')) fs.writeFileSync(args.at(-1), 'failure image');
if (args.includes('recordVideo')) fs.writeFileSync(args.at(-1), 'recording');
`, { mode: 0o755 });
    writeFileSync(join(fixture, 'maestro'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, args[args.indexOf('--device') + 1] + ':' + process.env.MAESTRO_DRIVER_STARTUP_TIMEOUT + '\\n');
fs.appendFileSync(process.env.FLOW_CALLS, JSON.stringify(args.filter(arg => arg.endsWith('.yaml'))) + '\\n');
fs.writeFileSync(args[args.indexOf('--output') + 1], '<testsuite failures="1"/>');
process.exit(1);
`, { mode: 0o755 });
    const result = spawnSync('bash', [script, fixture, 'fixture.app', 'com.test.release', join(fixture, 'settings.yaml'), join(fixture, 'confirm.yaml')], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${fixture}:${process.env.PATH}`, CALLS: join(fixture, 'calls'), FLOW_CALLS: join(fixture, 'flows'), MAESTRO_DRIVER_STARTUP_TIMEOUT: '' },
      timeout: 10000,
    });
    expect(result.status).toBe(1);
    expect(readFileSync(join(fixture, 'calls'), 'utf8')).toBe('phone:300000\ntablet:300000\n');
    const flows = readFileSync(join(fixture, 'flows'), 'utf8').trim().split('\n').map(line => JSON.parse(line) as string[]);
    expect(flows).toEqual([[join(fixture, '.maestro/app/backgammon-smoke.yaml'), join(fixture, 'settings.yaml'), join(fixture, 'confirm.yaml')], [join(fixture, '.maestro/app/backgammon-smoke.yaml'), join(fixture, 'settings.yaml'), join(fixture, 'confirm.yaml')]]);
    for (const device of ['iphone', 'ipad']) {
      expect(readFileSync(join(fixture, 'maestro-ios-output', device, 'failure-final-state.png'), 'utf8')).toBe('failure image');
      expect(readFileSync(join(fixture, 'maestro-ios-output', device, 'report.xml'), 'utf8')).toContain('failures="1"');
    }
    const workflow = readFileSync(join(__dirname, '../../.github/workflows/bgsage-verify.yml'), 'utf8');
    expect(workflow).toContain('path: maestro-ios-output/**');
  }
  finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

it('continues to the second device when simctl setup fails on the first', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'ios-smoke-setup-'));
  try {
    writeFileSync(join(fixture, 'xcrun'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args.includes('list')) console.log(JSON.stringify({devices: {
  'com.apple.CoreSimulator.SimRuntime.iOS-26-0': [
    {udid: 'phone', name: 'iPhone test'}, {udid: 'tablet', name: 'iPad test'}
  ]
}}));
if (args.includes('bootstatus') && args.includes('phone')) {
  console.error('boot timed out');
  process.exit(1);
}
if (args.includes('screenshot')) fs.writeFileSync(args.at(-1), 'failure image');
if (args.includes('recordVideo')) fs.writeFileSync(args.at(-1), 'recording');
`, { mode: 0o755 });
    writeFileSync(join(fixture, 'maestro'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, args[args.indexOf('--device') + 1] + '\\n');
fs.writeFileSync(args[args.indexOf('--output') + 1], '<testsuite failures="0"/>');
process.exit(0);
`, { mode: 0o755 });
    const result = spawnSync('bash', [script, fixture, 'fixture.app'], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${fixture}:${process.env.PATH}`, CALLS: join(fixture, 'calls') },
      timeout: 10000,
    });
    expect(result.status).toBe(1);
    expect(readFileSync(join(fixture, 'maestro-ios-output', 'iphone', 'setup-error.txt'), 'utf8')).toContain('bootstatus failed');
    expect(readFileSync(join(fixture, 'maestro-ios-output', 'iphone', 'bootstatus.err'), 'utf8')).toContain('boot timed out');
    expect(readFileSync(join(fixture, 'calls'), 'utf8')).toBe('tablet\n');
    expect(readFileSync(join(fixture, 'maestro-ios-output', 'ipad', 'report.xml'), 'utf8')).toContain('failures="0"');
  }
  finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
