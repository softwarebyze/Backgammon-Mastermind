/**
 * @jest-environment node
 */

import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { parse } from 'yaml';

const ROOT = join(__dirname, '..');

type Step = { name?: string; run?: string; env?: Record<string, string> };
type Workflow = {
  on: { workflow_dispatch: { inputs: Record<string, { default?: unknown; options?: string[]; type?: string }> } };
  jobs: Record<string, { env?: Record<string, string>; steps: Step[] }>;
};

// The production Android workflow must not publish publicly by default.
// Dispatching it with defaults should upload to the Play internal track, and
// production must stay selectable. The workflow is parsed as YAML so each
// assertion checks a value directly (no source regexes that can backtrack).
describe('android submit track', () => {
  const easJson = JSON.parse(readFileSync(join(ROOT, 'eas.json'), 'utf8')) as {
    submit: Record<string, { android?: { track?: string } }>;
  };
  const workflow = parse(
    readFileSync(join(ROOT, '.github/workflows/eas-build-prod-android.yml'), 'utf8'),
  ) as Workflow;
  const track = workflow.on.workflow_dispatch.inputs.track;
  const jobs = Object.values(workflow.jobs);
  const runs = jobs.flatMap(job => job.steps.map(step => step.run ?? ''));
  // Collapse shell line continuations so each command is one line.
  const commands = runs.flatMap(run => run.replace(/\\\n\s*/g, ' ').split('\n'));
  const submitCommands = commands.filter(cmd => /\beas (submit|build)\b/.test(cmd));

  it('has internal and production submit profiles on matching tracks', () => {
    expect(easJson.submit.internal?.android?.track).toBe('internal');
    expect(easJson.submit.production?.android?.track).toBe('production');
  });

  it('defaults the track input to internal and keeps production selectable', () => {
    expect(track?.type).toBe('choice');
    expect(track?.default).toBe('internal');
    expect(track?.options).toEqual(['internal', 'production']);
  });

  it('takes the submit profile from the track input', () => {
    for (const job of jobs) {
      expect(job.env?.SUBMIT_PROFILE).toBe('${{ inputs.track }}'); // eslint-disable-line no-template-curly-in-string
      for (const step of job.steps) {
        expect(step.env?.SUBMIT_PROFILE).toBeUndefined();
        // No step may reassign it in shell (`SUBMIT_PROFILE=…`, `export …`,
        // or `echo "SUBMIT_PROFILE=…" >> $GITHUB_ENV`).
        expect(step.run ?? '').not.toMatch(/(?<![\w$])SUBMIT_PROFILE\s*=/);
      }
    }
  });

  it('submits every path with $SUBMIT_PROFILE, never a hardcoded profile', () => {
    const submits = submitCommands.filter(cmd => /eas submit|--auto-submit/.test(cmd));
    // Cloud auto-submit, local AAB submit, and submit of an existing build.
    expect(submits).toHaveLength(3);
    for (const cmd of submits) {
      if (cmd.includes('eas submit'))
        expect(cmd).toContain('--profile "$SUBMIT_PROFILE"');
      else
        expect(cmd).toContain('--auto-submit-with-profile "$SUBMIT_PROFILE"');
      expect(cmd).not.toMatch(/--auto-submit(\s|$)/);
      expect(cmd).not.toMatch(/--auto-submit-with-profile[ =]["']?production\b/);
      if (cmd.includes('eas submit'))
        expect(cmd).not.toMatch(/--profile[ =]["']?production\b/);
    }
  });
});
