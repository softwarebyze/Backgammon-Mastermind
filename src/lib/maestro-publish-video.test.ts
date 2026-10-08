import { spawnSync } from 'node:child_process';
import { existsSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const publisher = join(__dirname, '../../.github/scripts/maestro-publish-video.sh');
let fixture: string;

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), 'maestro-publisher-test-'));
  writeFileSync(join(fixture, 'e2e-recording.mp4'), 'fixture recording');
  writeFileSync(join(fixture, 'gh'), `#!/usr/bin/env node
const fs = require('node:fs');
const path = require('node:path');
const args = process.argv.slice(2);
fs.appendFileSync(process.env.CALLS, JSON.stringify(args) + '\\n');
if (args[1] === 'upload') {
  if (process.env.FAIL_UPLOAD) process.exit(1);
  fs.writeFileSync(process.env.UPLOADED, JSON.stringify({
    name: path.basename(args[3]), bytes: fs.readFileSync(args[3], 'utf8')
  }));
}
if (args[1] === 'create') process.exit(process.env.FAIL_CREATE ? 1 : 0);
if (args[1] === 'view') {
  if (args.includes('--json')) {
    if (!args.at(-1).endsWith('.url')) process.exit(1);
    if (process.env.FAIL_QUERY) process.exit(1);
    console.log('https://github.com/test/repo/releases/download/e2e-evidence/run-123-attempt-2.mp4');
  } else if (process.env.FAIL_CREATE) process.exit(1);
}
`, { mode: 0o755 });
});

afterEach(() => rmSync(fixture, { recursive: true, force: true }));

function publish(extra: Record<string, string> = {}) {
  return spawnSync('bash', [publisher, fixture], {
    encoding: 'utf8',
    env: {
      ...process.env,
      PATH: `${fixture}:${process.env.PATH}`,
      GITHUB_REPOSITORY: 'test/repo',
      GITHUB_TOKEN: 'fixture-token',
      GITHUB_RUN_ID: '123',
      GITHUB_RUN_ATTEMPT: '2',
      MAESTRO_URL_FILE: join(fixture, 'urls.env'),
      GITHUB_ENV: join(fixture, 'github.env'),
      CALLS: join(fixture, 'calls.jsonl'),
      UPLOADED: join(fixture, 'uploaded.json'),
      ...extra,
    },
  });
}

it('uploads the actual per-attempt filename and preserves one recording in the bundle', () => {
  const result = publish();
  expect(result.status).toBe(0);
  expect(JSON.parse(readFileSync(join(fixture, 'uploaded.json'), 'utf8'))).toEqual({
    name: 'run-123-attempt-2.mp4',
    bytes: 'fixture recording',
  });
  expect(readdirSync(fixture).filter(name => name.endsWith('.mp4'))).toEqual(['e2e-recording.mp4']);
  expect(readFileSync(join(fixture, 'urls.env'), 'utf8')).toContain('run-123-attempt-2.mp4');
  const calls = readFileSync(join(fixture, 'calls.jsonl'), 'utf8').trim().split('\n').map(line => JSON.parse(line) as string[]);
  const uploadedPath = calls.find(args => args[1] === 'upload')?.[3];
  expect(uploadedPath).toBeDefined();
  expect(existsSync(uploadedPath!)).toBe(false);
});

it.each(['FAIL_UPLOAD', 'FAIL_CREATE', 'FAIL_QUERY'])('keeps the artifact fallback without publishing a false URL when %s fails', (failure) => {
  const result = publish({ [failure]: '1' });
  expect(result.status).toBe(0);
  expect(result.stdout).toContain('::warning::');
  expect(existsSync(join(fixture, 'urls.env'))).toBe(false);
  expect(existsSync(join(fixture, 'github.env'))).toBe(false);
  expect(readFileSync(join(fixture, 'e2e-recording.mp4'), 'utf8')).toBe('fixture recording');
});
