/**
 * @jest-environment node
 */

import { readdirSync, readFileSync } from 'node:fs';
import { basename, join } from 'node:path';

import { parse } from 'yaml';

// Every Maestro flow must run somewhere in CI. A flow nobody runs passes
// review but proves nothing, so it rots: two flows sat unrun for weeks before
// this check existed.
const ROOT = join(__dirname, '..', '..');
const APP_DIR = join(ROOT, '.maestro/app');
const FLOWS = readdirSync(APP_DIR).filter(name => name.endsWith('.yaml')).map(name => basename(name, '.yaml')).sort();
const { shards } = JSON.parse(readFileSync(join(ROOT, '.maestro/android-shards.json'), 'utf8')) as { shards: string[][] };
const ANDROID = shards.flat();

/** Text of every workflow and CI script other than the Android shard runner. */
function otherCiSources() {
  const files = [
    ...readdirSync(join(ROOT, '.github/workflows')).map(name => join(ROOT, '.github/workflows', name)),
    ...readdirSync(join(ROOT, '.github/scripts')).map(name => join(ROOT, '.github/scripts', name)),
  ].filter(file => !file.endsWith('run-maestro-e2e-emulator.sh') && !file.endsWith('.disabled'));
  return files.map(file => readFileSync(file, 'utf8')).join('\n');
}

function flowHeader(flow: string) {
  const [header] = readFileSync(join(APP_DIR, `${flow}.yaml`), 'utf8').split(/^---$/m);
  return (parse(header ?? '') ?? {}) as { name?: string; tags?: string[] };
}

describe('maestro flow coverage', () => {
  it('lists each Android flow in exactly one shard, and every listed flow exists', () => {
    expect(new Set(ANDROID).size).toBe(ANDROID.length);
    expect(ANDROID.filter(flow => !FLOWS.includes(flow))).toEqual([]);
    for (const shard of shards)
      expect(shard.length).toBeGreaterThan(0);
  });

  it('runs every flow on Android or in another named CI job', () => {
    const elsewhere = otherCiSources();
    const unrun = FLOWS.filter(flow => !ANDROID.includes(flow) && !elsewhere.includes(`${flow}.yaml`));
    expect(unrun).toEqual([]);
  });

  it('keeps the local Maestro config in step with the Android shards', () => {
    const config = parse(readFileSync(join(ROOT, '.maestro/config.yaml'), 'utf8')) as { flows: string[] };
    expect(config.flows.map(path => basename(path, '.yaml')).sort()).toEqual([...ANDROID].sort());
  });

  it('runs one emulator job per shard', () => {
    const workflow = parse(readFileSync(join(ROOT, '.github/workflows/e2e-android.yml'), 'utf8')) as {
      jobs: Record<string, { strategy?: { matrix?: { shard?: number[] } } }>;
    };
    expect(workflow.jobs['e2e-shard']?.strategy?.matrix?.shard).toEqual(shards.map((_, index) => index + 1));
  });

  // The shard merge matches JUnit results to flows by file name. A `name:`
  // in a flow header would rename its result and read as a missing flow.
  it('names every Android flow by its file name', () => {
    expect(ANDROID.filter(flow => flowHeader(flow).name !== undefined)).toEqual([]);
  });
});
