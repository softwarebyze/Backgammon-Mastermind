import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

// THIRD_PARTY_NOTICES.md is generated, not hand-maintained. The generator pulls
// the bgsage pin from expo-bgsage/upstream.json, so this suite is what stops
// the notices, the fetch script, and the in-app links from disagreeing.

const root = join(__dirname, '../..');

function read(relPath: string): string {
  return readFileSync(join(root, relPath), 'utf8');
}

const upstream = JSON.parse(read('expo-bgsage/upstream.json')) as {
  ref: string;
  repo: string;
  license: string;
  licenseFile: string;
  modified: boolean;
};

describe('third-party notices', () => {
  it('is up to date with the generator (run: pnpm notices)', () => {
    expect(() =>
      execFileSync(process.execPath, ['--import', 'tsx', 'scripts/generate-third-party-notices.ts', '--check'], {
        cwd: root,
        stdio: 'pipe',
        encoding: 'utf8',
      }),
    ).not.toThrow();
  });

  it('names the pinned bgsage commit and license', () => {
    const notices = read('THIRD_PARTY_NOTICES.md');
    expect(notices).toContain(upstream.ref);
    expect(notices).toContain(upstream.repo.replace(/\.git$/, ''));
    expect(notices).toContain(upstream.license);
  });

  it('reproduces the full MPL text so a shipped binary carries its license', () => {
    const mpl = read(upstream.licenseFile).trim();
    expect(read('THIRD_PARTY_NOTICES.md')).toContain(mpl);
  });

  it('copies the license the MPL file actually is', () => {
    expect(read(upstream.licenseFile)).toContain('Mozilla Public License Version 2.0');
  });

  it('retains supplied MIT copyright and permission text', () => {
    const license = read('node_modules/react/LICENSE').trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    expect(read('THIRD_PARTY_NOTICES.md')).toContain(license);
    expect(read('THIRD_PARTY_NOTICES.md')).not.toContain('MIT-licensed packages impose no attribution obligation');
  });
});

describe('production dependency discovery', () => {
  let fixture: string;

  beforeEach(() => {
    fixture = mkdtempSync(join(tmpdir(), 'notices-deps-test-'));
    writeFileSync(join(fixture, 'package.json'), JSON.stringify({
      name: 'app',
      dependencies: { parent: '1' },
      devDependencies: { 'dev-only': '1' },
    }));
    const parent = join(fixture, 'node_modules/parent');
    const child = join(parent, 'node_modules/child');
    mkdirSync(child, { recursive: true });
    writeFileSync(join(parent, 'package.json'), JSON.stringify({
      name: 'parent',
      version: '1',
      dependencies: { child: '2' },
    }));
    writeFileSync(join(child, 'package.json'), JSON.stringify({ name: 'child', version: '2' }));
  });

  afterEach(() => rmSync(fixture, { recursive: true, force: true }));

  function discover(): string[] {
    const generator = pathToFileURL(join(root, 'scripts/generate-third-party-notices.ts')).href;
    const code = `const imported = await import(${JSON.stringify(generator)});
const { collectRuntimeDeps } = imported.default ?? imported;
console.log(JSON.stringify(collectRuntimeDeps(${JSON.stringify(fixture)}).map(dep => dep.name)));`;
    return JSON.parse(execFileSync(process.execPath, ['--import', 'tsx', '--input-type', 'module', '--eval', code], {
      cwd: root,
      encoding: 'utf8',
      stdio: 'pipe',
    })) as string[];
  }

  it('includes nested transitive packages and excludes dev-only dependencies', () => {
    expect(discover()).toEqual(['child', 'parent']);
  });

  it('fails instead of silently omitting a missing required package', () => {
    rmSync(join(fixture, 'node_modules/parent/node_modules/child'), { recursive: true });
    expect(discover).toThrow(/Dependency license scan failed:/);
  });
});

describe('bgsage pin has a single source of truth', () => {
  it('uses the same commit in the in-app open-source link', () => {
    expect(read('src/lib/app-links.ts')).toContain(upstream.ref);
  });

  it('uses the same commit in the fetch script instead of a second literal', () => {
    const script = read('.github/scripts/fetch-bgsage-engine.sh');
    expect(script).toContain('upstream.json');
    // A hardcoded second copy of the SHA is exactly the drift we are preventing.
    expect(script).not.toContain(upstream.ref);
  });

  it('retains the module’s existing MPL-2.0 license', () => {
    const pkg = JSON.parse(read('expo-bgsage/package.json')) as { license: string };
    expect(pkg.license).toBe('MPL-2.0');
  });
});

describe('inter font licensing', () => {
  const ofl = 'assets/licenses/Inter-OFL-1.1.txt';

  it('bundles the OFL text shipped with the app', () => {
    const notices = read('THIRD_PARTY_NOTICES.md');
    expect(notices).toContain('OFL-1.1');
    expect(notices).toContain('SIL OPEN FONT LICENSE');
  });

  it('matches the license shipped inside @expo-google-fonts/inter', () => {
    const upstreamFont = read('node_modules/@expo-google-fonts/inter/LICENSE_FONT');
    expect(read(ofl).trim()).toBe(upstreamFont.trim());
  });

  it('includes the license in the explicitly embedded native notices asset', () => {
    const native = JSON.parse(read('assets/licenses/third_party_notices.json')) as { notices: string };
    expect(native.notices).toContain(read(ofl).trim());
    expect(native.notices).toBe(read('THIRD_PARTY_NOTICES.md'));
    expect(read('app.config.ts')).toContain('[\'expo-asset\', { assets: [\'./assets/licenses/third_party_notices.json\'] }]');
  });

  it('bundles font weights, so the OFL obligation is real', () => {
    const config = read('app.config.ts');
    const weights = [...config.matchAll(/@expo-google-fonts\/inter\/[^/]+\/Inter_[^']+\.ttf/g)];
    expect(weights.length).toBeGreaterThan(0);
  });
});
