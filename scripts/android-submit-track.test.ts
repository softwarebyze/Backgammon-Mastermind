import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..');

// The production Android workflow must not publish publicly by default.
// Dispatching it with defaults should upload to the Play internal track.
describe('android submit track', () => {
  const easJson = JSON.parse(readFileSync(join(ROOT, 'eas.json'), 'utf8')) as {
    submit: Record<string, { android?: { track?: string } }>;
  };
  const workflow = readFileSync(
    join(ROOT, '.github/workflows/eas-build-prod-android.yml'),
    'utf8',
  );

  it('has an internal submit profile on the internal track', () => {
    expect(easJson.submit.internal?.android?.track).toBe('internal');
  });

  it('defaults the workflow track input to internal', () => {
    expect(workflow).toMatch(/track:\n(?:\s+.*\n)*?\s+default: internal\n/);
  });

  it('never hardcodes the production submit profile', () => {
    expect(workflow).not.toMatch(/--profile production \\\n\s+--(path|id)/);
    expect(workflow).not.toMatch(/--auto-submit \\/);
  });
});
