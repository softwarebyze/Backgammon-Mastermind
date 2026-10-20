import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it.each([
  { variant: undefined, task: 'assembleRelease', directory: 'release' },
  { variant: 'debug', task: 'assembleDebug', directory: 'debug' },
])('builds and copies the correct APK for $task', ({ variant, task, directory }) => {
  const fixture = mkdtempSync(join(tmpdir(), 'android-release-apk-'));
  const script = join(__dirname, '../../.github/scripts/assemble-android-test-apk.sh');
  try {
    mkdirSync(join(fixture, 'android'));
    writeFileSync(join(fixture, 'android/gradlew'), `#!/bin/sh
[ "$1" = ${task} ] || exit 42
case "$*" in *kotlin.compiler.execution.strategy=in-process*) ;; *) exit 43 ;; esac
case "$*" in *MaxMetaspaceSize=1024m*) ;; *) exit 44 ;; esac
case "$*" in *--max-workers=2*) ;; *) exit 45 ;; esac
mkdir -p app/build/outputs/apk/${directory}
printf '${directory} bundle' > app/build/outputs/apk/${directory}/app-${directory}.apk
`, { mode: 0o755 });
    const result = spawnSync('bash', [script, fixture, ...(variant ? [variant] : [])], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(readFileSync(join(fixture, 'android-test.apk'), 'utf8')).toBe(`${directory} bundle`);
  }
  finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});

describe('postHog uploads in the CI test APK', () => {
  const script = join(__dirname, '../../.github/scripts/assemble-android-test-apk.sh');
  const appGradle = `apply plugin: "com.android.application"
apply plugin: "com.posthog.android"
posthog {
    uploadNativeSymbols = true
}
apply from: new File(["node", "--print", "require('path').join('tooling', 'posthog.gradle')"].execute().text.trim())
android {
}
`;

  function build(env: Record<string, string>, dotenv?: string) {
    const fixture = mkdtempSync(join(tmpdir(), 'android-release-apk-posthog-'));
    try {
      mkdirSync(join(fixture, 'android/app'), { recursive: true });
      writeFileSync(join(fixture, 'android/app/build.gradle'), appGradle);
      if (dotenv !== undefined)
        writeFileSync(join(fixture, '.env'), dotenv);
      writeFileSync(join(fixture, 'android/gradlew'), `#!/bin/sh
mkdir -p app/build/outputs/apk/release
printf 'apk' > app/build/outputs/apk/release/app-release.apk
`, { mode: 0o755 });
      const { POSTHOG_CLI_API_KEY: _ignored, ...baseEnv } = process.env;
      const result = spawnSync('bash', [script, fixture], { encoding: 'utf8', env: { ...baseEnv, ...env } });
      expect(result.status).toBe(0);
      return readFileSync(join(fixture, 'android/app/build.gradle'), 'utf8');
    }
    finally {
      rmSync(fixture, { recursive: true, force: true });
    }
  }

  it('drops the upload wiring when the key is empty in .env and the environment', () => {
    const gradle = build({}, 'POSTHOG_CLI_API_KEY=\nPOSTHOG_CLI_PROJECT_ID=1\n');
    expect(gradle).not.toContain('posthog.gradle');
    expect(gradle).toContain('uploadNativeSymbols = false');
    expect(gradle).toContain('apply plugin: "com.android.application"');
  });

  it('keeps uploads when a key is set', () => {
    expect(build({ POSTHOG_CLI_API_KEY: 'phx_test' })).toBe(appGradle);
    expect(build({}, 'POSTHOG_CLI_API_KEY="phx_test"\n')).toBe(appGradle);
  });
});
