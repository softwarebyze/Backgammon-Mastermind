/**
 * @jest-environment node
 */

import { spawnSync } from 'node:child_process';
import { existsSync, mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const merger = join(__dirname, '../../.github/scripts/merge-maestro-shards.mjs');
let fixture: string;

beforeEach(() => {
  fixture = mkdtempSync(join(tmpdir(), 'maestro-merge-'));
});
afterEach(() => rmSync(fixture, { recursive: true, force: true }));

/** A Maestro-style JUnit report for the given flow results. */
function junit(results: Record<string, 'SUCCESS' | 'ERROR'>) {
  const cases = Object.entries(results).map(([flow, status]) => status === 'SUCCESS'
    ? `<testcase id="${flow}" name="${flow}" classname="${flow}" time="1.0" status="SUCCESS"/>`
    : `<testcase id="${flow}" name="${flow}" classname="${flow}" time="1.0" status="ERROR"><failure>Element not found</failure></testcase>`);
  const failures = Object.values(results).filter(status => status === 'ERROR').length;
  return `<?xml version='1.0' encoding='UTF-8'?>
<testsuites>
  <testsuite name="Test Suite" device="emulator-5554" tests="${cases.length}" failures="${failures}" time="2.0">
    ${cases.join('\n    ')}
  </testsuite>
</testsuites>`;
}

function shard(number: number, files: { report?: string; screenshot?: string; recording?: string }) {
  const dir = join(fixture, 'artifacts', `maestro-shard-${number}`);
  mkdirSync(join(dir, 'output'), { recursive: true });
  if (files.report !== undefined)
    writeFileSync(join(dir, 'report.xml'), files.report);
  if (files.screenshot !== undefined)
    writeFileSync(join(dir, 'output', files.screenshot), `png ${number}`);
  if (files.recording !== undefined)
    writeFileSync(join(dir, 'e2e-recording.mp4'), files.recording);
}

function merge(shards: string[][]) {
  writeFileSync(join(fixture, 'shards.json'), JSON.stringify({ shards }));
  const workspace = join(fixture, 'workspace');
  mkdirSync(workspace, { recursive: true });
  const result = spawnSync(process.execPath, [merger, join(fixture, 'shards.json'), join(fixture, 'artifacts'), workspace], { encoding: 'utf8' });
  expect(result.status).toBe(0);
  return { result, workspace, report: readFileSync(join(workspace, 'report.xml'), 'utf8') };
}

it('combines passing shards into one green report with their screenshots and recordings', () => {
  shard(1, { report: junit({ smoke: 'SUCCESS' }), screenshot: 'home.png', recording: 'video 1' });
  shard(2, { report: junit({ 'undo-redo': 'SUCCESS', 'feedback': 'SUCCESS' }), screenshot: 'undo.png', recording: 'video 2' });
  const { report, workspace, result } = merge([['smoke'], ['undo-redo', 'feedback']]);

  expect(report).not.toMatch(/(failures|errors)="[1-9]/);
  expect(report.match(/<testsuite\b/g)).toHaveLength(2);
  expect(report).toContain('name="Android shard 1"');
  expect(report).toContain('name="Android shard 2"');
  for (const flow of ['smoke', 'undo-redo', 'feedback'])
    expect(report).toContain(`name="${flow}"`);
  expect(readFileSync(join(workspace, '.maestro-ci-output/shard-1/home.png'), 'utf8')).toBe('png 1');
  expect(readFileSync(join(workspace, '.maestro-ci-output/shard-2/undo.png'), 'utf8')).toBe('png 2');
  expect(readFileSync(join(workspace, 'e2e-recording-shard-1.mp4'), 'utf8')).toBe('video 1');
  expect(readFileSync(join(workspace, 'e2e-recording-shard-2.mp4'), 'utf8')).toBe('video 2');
  expect(result.stdout).not.toContain('::error::');
});

it('keeps a failing flow failing', () => {
  shard(1, { report: junit({ smoke: 'ERROR' }) });
  const { report } = merge([['smoke']]);
  expect(report).toMatch(/failures="[1-9]/);
  expect(report).toContain('Element not found');
});

it('fails every flow of a shard that uploaded no report', () => {
  shard(1, { report: junit({ smoke: 'SUCCESS' }) });
  // Shard 2 timed out: no artifact at all.
  const { report, workspace, result } = merge([['smoke'], ['undo-redo', 'feedback']]);
  expect(report).toContain('name="Android shard 2 (missing results)" tests="2" failures="2"');
  expect(report).toMatch(/<testcase id="undo-redo"[^>]*>\s*<failure message="No result reported/);
  expect(report).toMatch(/<testcase id="feedback"[^>]*>\s*<failure message="No result reported/);
  expect(result.stdout).toContain('::error::Android shard 2: no JUnit report');
  expect(existsSync(join(workspace, 'e2e-recording-shard-2.mp4'))).toBe(false);
});

it('fails a listed flow that is missing from an otherwise green report', () => {
  // Maestro stopped after the first flow and still wrote a passing report.
  shard(1, { report: junit({ smoke: 'SUCCESS' }) });
  const { report, result } = merge([['smoke', 'undo-redo']]);
  expect(report).toContain('name="Android shard 1 (missing results)" tests="1" failures="1"');
  expect(report).toMatch(/<testcase id="undo-redo"[^>]*>\s*<failure/);
  expect(result.stdout).toContain('no result for undo-redo');
});

it('handles an empty self-closing suite', () => {
  shard(1, { report: '<testsuites><testsuite name="Test Suite" tests="0" failures="0"/></testsuites>' });
  const { report } = merge([['smoke']]);
  expect(report).toContain('<testsuite name="Android shard 1" tests="0" failures="0"/>');
  expect(report).toMatch(/<testcase id="smoke"[^>]*>\s*<failure/);
});
