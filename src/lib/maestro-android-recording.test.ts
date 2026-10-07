import { spawnSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it('collects successive five-minute recordings including the final interrupted segment', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'android-recording-'));
  try {
    const stop = join(fixture, 'stop');
    writeFileSync(join(fixture, 'adb'), `#!/usr/bin/env node
const fs = require('node:fs');
const args = process.argv.slice(2);
if (args[1] === 'screenrecord') {
  fs.appendFileSync(process.env.CALLS, args.join(' ') + '\\n');
  if (args.at(-1).endsWith('0003.mp4')) { fs.writeFileSync(process.env.STOP, ''); process.exit(130); }
}
if (args[0] === 'pull') fs.writeFileSync(args.at(-1), 'video');
`, { mode: 0o755 });
    const result = spawnSync('bash', [join(__dirname, '../../.github/scripts/record-android-screen.sh'), fixture, stop], {
      encoding: 'utf8',
      env: { ...process.env, PATH: `${fixture}:${process.env.PATH}`, CALLS: join(fixture, 'calls'), STOP: stop },
      timeout: 10000,
    });
    expect(result.status).toBe(0);
    expect(readFileSync(join(fixture, 'calls'), 'utf8').trim().split('\n')).toHaveLength(3);
    expect(readFileSync(join(fixture, 'recordings/concat.txt'), 'utf8')).toBe('file \'segment-0001.mp4\'\nfile \'segment-0002.mp4\'\nfile \'segment-0003.mp4\'\n');
    expect(readFileSync(join(fixture, 'recordings/segment-0003.mp4'), 'utf8')).toBe('video');
  }
  finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
