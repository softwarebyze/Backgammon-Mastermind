import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const script = join(__dirname, '../../.github/scripts/skip-posthog-ios-upload-when-unkeyed.sh');

const XCODE_STUB = `#!/bin/bash
set +x +e
if [[ "$SKIP_BUNDLING" ]]; then
  echo "SKIP_BUNDLING enabled; skipping posthog-cli upload calls."
  exit 0;
fi
set -x -e
echo "would hermes clone"
`;

const UPLOAD_STUB = `#!/bin/bash
echo "would upload dSYMs"
`;

function run(env: Record<string, string>, dotenv?: string) {
  const fixture = mkdtempSync(join(tmpdir(), 'skip-posthog-ios-'));
  try {
    mkdirSync(join(fixture, 'node_modules/posthog-react-native/tooling'), { recursive: true });
    mkdirSync(join(fixture, 'ios/Pods/PostHog/build-tools'), { recursive: true });
    const xcode = join(fixture, 'node_modules/posthog-react-native/tooling/posthog-xcode.sh');
    const upload = join(fixture, 'ios/Pods/PostHog/build-tools/upload-symbols.sh');
    writeFileSync(xcode, XCODE_STUB);
    writeFileSync(upload, UPLOAD_STUB);
    if (dotenv !== undefined)
      writeFileSync(join(fixture, '.env'), dotenv);
    const { POSTHOG_CLI_API_KEY: _ignored, ...baseEnv } = process.env;
    const result = spawnSync('bash', [script, fixture], {
      encoding: 'utf8',
      env: { ...baseEnv, ...env },
    });
    expect(result.status).toBe(0);
    return {
      xcode: readFileSync(xcode, 'utf8'),
      upload: readFileSync(upload, 'utf8'),
      stdout: result.stdout,
    };
  }
  finally {
    rmSync(fixture, { recursive: true, force: true });
  }
}

describe('skip PostHog iOS uploads when unkeyed', () => {
  it('inserts an empty-key guard after RN bundling and on the dSYM uploader', () => {
    const { xcode, upload, stdout } = run({}, 'POSTHOG_CLI_API_KEY=\n');
    expect(stdout).toContain('No POSTHOG_CLI_API_KEY');
    expect(xcode).toContain('POSTHOG_CLI_API_KEY empty; skipping posthog-cli upload calls');
    expect(xcode.indexOf('SKIP_BUNDLING enabled')).toBeLessThan(
      xcode.indexOf('POSTHOG_CLI_API_KEY empty'),
    );
    expect(xcode).toContain('would hermes clone');
    expect(upload).toContain('POSTHOG_CLI_API_KEY empty; skipping posthog-cli upload calls');
    expect(upload).toContain('would upload dSYMs');
  });

  it('leaves the scripts alone when a key is set', () => {
    expect(run({ POSTHOG_CLI_API_KEY: 'phx_test' }).xcode).toBe(XCODE_STUB);
    expect(run({}, 'POSTHOG_CLI_API_KEY="phx_test"\n').xcode).toBe(XCODE_STUB);
  });

  it('is wired into the iOS release simulator smoke job after CocoaPods', () => {
    const workflow = readFileSync(join(__dirname, '../../.github/workflows/bgsage-verify.yml'), 'utf8');
    const pods = workflow.indexOf('Install CocoaPods dependencies');
    const skip = workflow.indexOf('Skip PostHog uploads without an API key');
    const build = workflow.indexOf('Build for iOS simulator (compile check)');
    expect(pods).toBeGreaterThan(-1);
    expect(skip).toBeGreaterThan(pods);
    expect(build).toBeGreaterThan(skip);
    expect(workflow).toContain('skip-posthog-ios-upload-when-unkeyed.sh');
  });
});
