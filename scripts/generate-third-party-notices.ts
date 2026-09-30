#!/usr/bin/env node
// Regenerates THIRD_PARTY_NOTICES.md from source of truth.
//
// Run: pnpm notices            (write)
//       pnpm notices:check      (verify, used by the test suite + CI)
//
// Everything in the output is derived, so the file cannot drift:
//
//   * the bgsage pin comes from expo-bgsage/upstream.json, which is also what
//     .github/scripts/fetch-bgsage-engine.sh checks out
//   * the dependency-license roll-up is read from the installed packages
//   * the OFL text is the copy shipped in assets/licenses/
//
// The only prose lives in this file. To change the notice, change it here.
import { createHash } from 'node:crypto';
import { existsSync, readdirSync, readFileSync, realpathSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = join(root, 'THIRD_PARTY_NOTICES.md');
const NATIVE_NOTICES_FILE = join(root, 'assets/licenses/third_party_notices.json');
const UPSTREAM_FILE = join(root, 'expo-bgsage/upstream.json');
const OFL_FILE = join(root, 'assets/licenses/Inter-OFL-1.1.txt');

type LicenseLike = {
  type?: string;
};

type PackageManifest = {
  name?: string;
  dependencies?: Record<string, string>;
  optionalDependencies?: Record<string, string>;
  repository?: string | { url?: string };
  version?: string;
  license?: unknown;
  licenses?: Array<string | LicenseLike> | LicenseLike;
};

type Upstream = {
  name: string;
  displayName: string;
  repo: string;
  ref: string;
  license: string;
  licenseFile: string;
  usage: string;
  modified?: boolean;
};

type Dep = {
  name: string;
  pkg: PackageManifest;
  path: string;
};

function readJson<T>(absPath: string): T {
  return JSON.parse(readFileSync(absPath, 'utf8')) as T;
}

function sha256Of(absPath: string): string {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

/** Normalises the several shapes npm licenses arrive in to a single string. */
function readLicense(pkg: PackageManifest): string | null {
  const raw = pkg.license ?? pkg.licenses;
  if (!raw) {
    return null;
  }
  if (typeof raw === 'string') {
    return raw;
  }
  if (Array.isArray(raw)) {
    return raw.map(l => (typeof l === 'string' ? l : l.type ?? '')).filter(Boolean).join(' AND ');
  }
  // Older manifests use `{ licenses: { type } }`; the union above cannot prove
  // which branch we are in once narrowed by runtime checks.
  return (raw as LicenseLike).type ?? null;
}

/**
 * Follow required production dependencies using Node's installed resolution.
 * Optional dependencies are not included: their installation varies by platform.
 * This inventory is conservative and includes production tools as well as code
 * bundled into the app; it is not a claim that every npm package ships at runtime.
 */
export function collectRuntimeDeps(rootDir = root): Dep[] {
  const found = new Map<string, Dep>();
  const seen = new Set<string>();
  function visit(manifestPath: string): void {
    const pkg = readJson<PackageManifest>(manifestPath);
    const resolver = createRequire(manifestPath);
    for (const name of Object.keys(pkg.dependencies ?? {}).sort()) {
      if (name in (pkg.optionalDependencies ?? {})) {
        continue;
      }
      const candidate = (resolver.resolve.paths('__dependency_manifest__') ?? [])
        .map(dir => join(dir, name, 'package.json'))
        .find(path => existsSync(path));
      if (!candidate) {
        throw new Error(`Missing required dependency ${name}, referenced by ${pkg.name ?? manifestPath}. Run pnpm install.`);
      }
      const installed = realpathSync(candidate);
      if (seen.has(installed)) {
        continue;
      }
      seen.add(installed);
      // A local file: package may have a stale installed copy; read its source
      // manifest and license for the artifact we will install from this repo.
      const source = name === 'expo-bgsage' && manifestPath === join(rootDir, 'package.json')
        ? join(rootDir, 'expo-bgsage/package.json')
        : installed;
      const dep = readJson<PackageManifest>(source);
      found.set(`${dep.name ?? name}@${dep.version ?? ''}`, { name: dep.name ?? name, pkg: dep, path: dirname(source) });
      visit(installed);
    }
  }
  visit(join(rootDir, 'package.json'));
  return [...found.values()].sort((a, b) =>
    a.name.localeCompare(b.name) || (a.pkg.version ?? '').localeCompare(b.pkg.version ?? ''),
  );
}

type LicenseText = { text: string; packages: string[] };

function packageNotices(deps: Dep[]): string {
  const texts = new Map<string, LicenseText>();
  const missing: string[] = [];
  for (const dep of deps) {
    const label = `${dep.name}@${dep.pkg.version ?? 'local'}`;
    const files = readdirSync(dep.path, { withFileTypes: true })
      .filter(entry => entry.isFile() && /^(?:licen[cs]e|copying|copyright|notice)(?:[._-]|$)/i.test(entry.name))
      .map(entry => entry.name)
      .sort();
    if (files.length === 0) {
      missing.push(label);
    }
    for (const file of files) {
      const text = readFileSync(join(dep.path, file), 'utf8').trim();
      const key = createHash('sha256').update(text).digest('hex');
      const group = texts.get(key) ?? { text, packages: [] };
      group.packages.push(`${label} (${file})`);
      texts.set(key, group);
    }
  }
  const inventory = deps.map(dep => `| ${dep.name} | ${dep.pkg.version ?? 'local'} | ${readLicense(dep.pkg) ?? 'UNDECLARED'} |`).join('\n');
  const licenseTexts = [...texts.values()].map(group =>
    `### ${group.packages[0]}\n\nApplies to:\n${group.packages.map(name => `- ${name}`).join('\n')}\n\n<pre>\n${group.text.replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')}\n</pre>`,
  ).join('\n\n');
  return `## Production dependency inventory

This follows required direct and transitive npm dependencies from the installed
tree. It includes build tools that may not ship in an app binary, and excludes
platform-dependent optional packages. Native libraries and vendored code need
separate review. Regenerate using the lockfile's installation before release.

MIT, BSD, ISC, and other permissive licenses can require preservation of
copyright and license notices. Their supplied notices are reproduced below.

| Package | Version | Declared license |
| --- | --- | --- |
${inventory}

## Packages without a supplied top-level license file

These packages declare a license but their npm distribution does not provide a
top-level license/notice file. This generator does not invent copyright holders
or imply that an SPDX label alone completes attribution. Review the upstream
notices for any of these included in the distributed application:
${missing.map(name => `- ${name}`).join('\n') || '- None'}

## License and notice files supplied by npm packages

Identical texts are grouped without removing package-specific copyright notices.

${licenseTexts}`;
}

function licenseTally(deps: Dep[]): Array<[string, number]> {
  const byLicense = new Map<string, number>();
  for (const { pkg } of deps) {
    const lic = readLicense(pkg) ?? 'UNDECLARED';
    byLicense.set(lic, (byLicense.get(lic) ?? 0) + 1);
  }
  return [...byLicense.entries()].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]));
}

function bgsageSection(upstream: Upstream): string {
  const repoWeb = upstream.repo.replace(/\.git$/, '');
  const short = upstream.ref.slice(0, 7);
  const modifiedNote = upstream.modified
    ? '**This integration modifies upstream source files.** Modified files remain under the MPL-2.0 and their source is available at the commit above.'
    : 'This integration does not change upstream source files.';

  return `## ${upstream.displayName} (${upstream.name})

${upstream.usage}

- Upstream: <${repoWeb}>
- Pinned commit: [\`${short}\`](${repoWeb}/tree/${upstream.ref})
- License: **${upstream.license}**
- License text: [\`${upstream.licenseFile}\`](./${upstream.licenseFile})
- License file SHA-256: \`${sha256Of(join(root, upstream.licenseFile))}\`

${modifiedNote}

MPL-2.0 requires that recipients of the binary get the license and be able to
obtain the source of the covered files. \`${upstream.licenseFile}\` ships in this
repository and is reproduced in this file below.`;
}

/**
 * Reads the bundled Inter weights straight out of app.config.ts so the notice
 * stays true when someone adds or drops one. A regex is fragile, so an empty
 * result is treated as a hard error rather than an empty notice — the bundled
 * weights are exactly what makes the OFL obligation real.
 */
function bundledInterWeights(): string[] {
  const config = readFileSync(join(root, 'app.config.ts'), 'utf8');
  const found = [...config.matchAll(/@expo-google-fonts\/inter\/([^/]+)\/Inter_[^']+\.ttf/g)].map(m => m[1]);
  const weights = [...new Set(found)].sort();
  if (weights.length === 0) {
    throw new Error(
      'No @expo-google-fonts/inter weights matched in app.config.ts. '
      + 'The Inter require() paths changed shape; update bundledInterWeights().',
    );
  }
  return weights;
}

function interSection(): string {
  const manifest = readJson<{ version?: string }>(
    join(root, 'node_modules/@expo-google-fonts/inter/package.json'),
  );
  const weights = bundledInterWeights();
  const copyright = readFileSync(OFL_FILE, 'utf8').match(/Copyright [^\n]+/)?.[0];

  return `## Inter

The app bundles the **Inter** typeface.

- Upstream: <https://github.com/rsms/inter>
- Packaged as: \`@expo-google-fonts/inter@${manifest.version}\`
- License: **SIL Open Font License 1.1** (OFL-1.1) — the font files are not MIT.
- Bundled weights: ${weights.map(w => `\`${w}\``).join(', ')}
- Copyright: ${copyright ?? 'The Inter Project Authors'}

The OFL requires the copyright notice and license to accompany every copy of
the font software, so the full text from \`assets/licenses/Inter-OFL-1.1.txt\` is reproduced
below and included in the generated native notices asset. The generated third_party_notices.json is explicitly
embedded into native builds by the expo-asset config plugin.`;
}

export function build(): string {
  const upstream = readJson<Upstream>(UPSTREAM_FILE);
  const deps = collectRuntimeDeps();
  const tally = licenseTally(deps);

  return `# Third-party notices

<!-- Generated by scripts/generate-third-party-notices.ts — do not edit by hand. -->
<!-- Run \`pnpm notices\` after changing a dependency or the bgsage pin.       -->

This file records the pinned Open Sage engine, bundled Inter fonts, and
required production npm dependency notices. It is generated from installed
packages; review the inventory limitations and missing-license list below.

## Summary

${tally.map(([lic, count]) => `- \`${lic}\` — ${count} package${count === 1 ? '' : 's'}`).join('\n')}

${bgsageSection(upstream)}

${interSection()}

---

## Full license texts

### Open Sage — MPL-2.0

\`\`\`
${readFileSync(join(root, upstream.licenseFile), 'utf8').trim()}
\`\`\`

### Inter — OFL-1.1

\`\`\`
${readFileSync(OFL_FILE, 'utf8').trim()}
\`\`\`

${packageNotices(deps)}
`;
}

function main(): void {
  const next = build();
  const outputs: Array<[string, string]> = [
    [OUT_FILE, next],
    [NATIVE_NOTICES_FILE, `${JSON.stringify({ notices: next })}\n`],
  ];
  const changed = outputs.filter(([path, content]) =>
    !existsSync(path) || readFileSync(path, 'utf8') !== content,
  );
  if (changed.length === 0) {
    console.log('Third-party notices are up to date.');
    return;
  }
  if (process.argv.includes('--check')) {
    console.error('Third-party notices are out of date. Run: pnpm notices');
    process.exit(1);
  }
  for (const [path, content] of changed) {
    writeFileSync(path, content);
    console.log(`Wrote ${basename(path)}`);
  }
}

if (process.argv[1] && basename(process.argv[1]) === basename(fileURLToPath(import.meta.url))) {
  main();
}
