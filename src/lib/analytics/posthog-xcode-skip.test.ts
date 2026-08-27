import { execFileSync } from 'node:child_process';
import { chmodSync, mkdirSync, mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const POSTHOG_XCODE_SH = join(
  __dirname,
  '../../../node_modules/posthog-react-native/tooling/posthog-xcode.sh',
);

function runPostHogXcode(opts: {
  home: string;
  path: string;
  token?: string;
  bundleScript: string;
  derived: string;
  config: string;
}): { status: number; stdout: string } {
  try {
    const env: NodeJS.ProcessEnv = {
      ...process.env,
      PATH: opts.path,
      HOME: opts.home,
      DERIVED_FILE_DIR: opts.derived,
      CONFIGURATION_BUILD_DIR: opts.config,
    };
    delete env.POSTHOG_CLI_API_KEY;
    delete env.POSTHOG_CLI_TOKEN;
    if (opts.token) {
      env.POSTHOG_CLI_API_KEY = opts.token;
      env.POSTHOG_CLI_TOKEN = opts.token;
    }
    const stdout = execFileSync('bash', [POSTHOG_XCODE_SH, opts.bundleScript], {
      encoding: 'utf8',
      env,
    });
    return { status: 0, stdout };
  }
  catch (error) {
    const err = error as { status?: number; stdout?: string; stderr?: string };
    return {
      status: err.status ?? 1,
      stdout: `${err.stdout ?? ''}${err.stderr ?? ''}`,
    };
  }
}

describe('posthog xcode sourcemap upload skip', () => {
  it('patches posthog-xcode.sh so a missing CLI is a warning, not a fatal error', () => {
    const source = readFileSync(POSTHOG_XCODE_SH, 'utf8');
    expect(source).not.toMatch(/echo "error: posthog-cli not found"/);
    expect(source).toMatch(/SKIP_POSTHOG_UPLOAD=1/);
    expect(source).toMatch(/posthog-cli not found; skipping PostHog sourcemap upload/);
  });

  it('runs the React Native bundle and exits 0 when posthog-cli is missing', () => {
    const root = mkdtempSync(join(tmpdir(), 'posthog-xcode-'));
    const derived = join(root, 'derived');
    const config = join(root, 'config');
    const home = join(root, 'home');
    mkdirSync(derived);
    mkdirSync(config);
    mkdirSync(home);
    const bundleScript = join(root, 'react-native-xcode.sh');
    writeFileSync(bundleScript, '#!/bin/sh\necho RN_BUNDLE_OK\n');
    chmodSync(bundleScript, 0o755);

    const result = runPostHogXcode({
      home,
      path: '/usr/bin:/bin',
      bundleScript,
      derived,
      config,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/RN_BUNDLE_OK/);
    expect(result.stdout).toMatch(/posthog-cli not found; skipping PostHog sourcemap upload/);
    expect(result.stdout).not.toMatch(/error: posthog-cli not found/);
  });

  it('skips upload and still bundles when the CLI token is absent', () => {
    const root = mkdtempSync(join(tmpdir(), 'posthog-xcode-token-'));
    const derived = join(root, 'derived');
    const config = join(root, 'config');
    const home = join(root, 'home');
    const cliDir = join(home, '.posthog');
    mkdirSync(derived);
    mkdirSync(config);
    mkdirSync(cliDir, { recursive: true });
    const fakeCli = join(cliDir, 'posthog-cli');
    writeFileSync(fakeCli, '#!/bin/sh\necho SHOULD_NOT_RUN\nexit 1\n');
    chmodSync(fakeCli, 0o755);
    const bundleScript = join(root, 'react-native-xcode.sh');
    writeFileSync(bundleScript, '#!/bin/sh\necho RN_BUNDLE_OK\n');
    chmodSync(bundleScript, 0o755);

    const result = runPostHogXcode({
      home,
      path: '/usr/bin:/bin',
      bundleScript,
      derived,
      config,
    });

    expect(result.status).toBe(0);
    expect(result.stdout).toMatch(/RN_BUNDLE_OK/);
    expect(result.stdout).toMatch(/CLI token not set; skipping sourcemap upload/);
    expect(result.stdout).not.toMatch(/SHOULD_NOT_RUN/);
  });
});
