import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it('builds and copies the Release APK without a Metro-dependent debug runtime', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'android-release-apk-'));
  const script = join(__dirname, '../../.github/scripts/assemble-android-test-apk.sh');
  try {
    mkdirSync(join(fixture, 'android'));
    writeFileSync(join(fixture, 'android/gradlew'), `#!/bin/sh
[ "$1" = assembleRelease ] || exit 42
case "$*" in *kotlin.compiler.execution.strategy=in-process*) ;; *) exit 43 ;; esac
case "$*" in *MaxMetaspaceSize=1024m*) ;; *) exit 44 ;; esac
case "$*" in *--max-workers=2*) ;; *) exit 45 ;; esac
mkdir -p app/build/outputs/apk/release
printf 'release bundle' > app/build/outputs/apk/release/app-release.apk
`, { mode: 0o755 });
    const result = spawnSync('bash', [script, fixture], { encoding: 'utf8' });
    expect(result.status).toBe(0);
    expect(readFileSync(join(fixture, 'android-test.apk'), 'utf8')).toBe('release bundle');
  }
  finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
