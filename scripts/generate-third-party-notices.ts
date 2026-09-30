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
import type * as Callstack from '@callstack/licenses/node';
import { createHash } from 'node:crypto';
import { existsSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { createRequire } from 'node:module';
import { tmpdir } from 'node:os';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

// The root require export selects Callstack's Node API under tsx/CommonJS.
const { scanDependencies } = createRequire(import.meta.url)('@callstack/licenses') as typeof Callstack;

const root = join(dirname(fileURLToPath(import.meta.url)), '..');
const OUT_FILE = join(root, 'THIRD_PARTY_NOTICES.md');
const NATIVE_NOTICES_FILE = join(root, 'assets/licenses/third_party_notices.json');
const UPSTREAM_FILE = join(root, 'expo-bgsage/upstream.json');
const OFL_FILE = join(root, 'assets/licenses/Inter-OFL-1.1.txt');

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

function readJson<T>(absPath: string): T {
  return JSON.parse(readFileSync(absPath, 'utf8')) as T;
}

function sha256Of(absPath: string): string {
  return createHash('sha256').update(readFileSync(absPath)).digest('hex');
}

/** Callstack owns dependency traversal and license extraction; fail on skipped packages. */
export function collectRuntimeDeps(rootDir = root) {
  const manifest = readJson<{ dependencies: Record<string, string> }>(join(rootDir, 'package.json'));
  // Callstack does not support file: packages. Our local engine is covered by
  // the pinned-source/MPL section below, using the source manifest and license.
  const dependencies = { ...manifest.dependencies };
  delete dependencies['expo-bgsage'];
  const scratch = mkdtempSync(join(tmpdir(), 'bgsage-notices-'));
  const cwd = process.cwd();
  const warn = console.warn;
  const warnings: string[] = [];
  try {
    const input = join(scratch, 'package.json');
    writeFileSync(input, JSON.stringify({ dependencies }));
    process.chdir(rootDir);
    console.warn = (...args: unknown[]) => warnings.push(args.map(String).join(' '));
    const licenses = scanDependencies(input, () => ({
      includeDevDependencies: false,
      includeTransitiveDependencies: true,
      includeOptionalDependencies: false,
    }));
    if (warnings.length) {
      throw new Error(`Dependency license scan failed:\n${warnings.join('\n')}`);
    }
    return Object.values(licenses).sort((a, b) =>
      a.name.localeCompare(b.name) || a.version.localeCompare(b.version),
    );
  }
  finally {
    console.warn = warn;
    process.chdir(cwd);
    rmSync(scratch, { recursive: true, force: true });
  }
}

function packageNotices(deps: ReturnType<typeof collectRuntimeDeps>): string {
  const missing = deps.filter(dep => !dep.content).map(dep => `- ${dep.name}@${dep.version}`);
  const notices = deps.map((dep) => {
    const text = dep.content?.trim().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
    return `### ${dep.name}@${dep.version}\n\nDeclared license: ${dep.type ?? 'UNDECLARED'}\n\n${text ? `<pre>\n${text}\n</pre>` : 'No license text found; review upstream notices before distribution.'}`;
  }).join('\n\n');
  return `## Production dependency notices

Scanned by @callstack/licenses (from react-native-legal), with transitive
production dependencies enabled and dev/optional dependencies excluded.
This includes tools that may not ship in the binary. The scanner selects one
license file per package; additional notices, native libraries and vendored code
need separate review. The local expo-bgsage module is covered above.

## Packages without license text found by the scanner

An SPDX label alone does not complete attribution. Review upstream notices for
any of these packages included in the distributed application:
${missing.join('\n') || '- None'}

## License texts supplied by npm packages

${notices}`;
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

  return `# Third-party notices

<!-- Generated by scripts/generate-third-party-notices.ts — do not edit by hand. -->
<!-- Run \`pnpm notices\` after changing a dependency or the bgsage pin.       -->

This file records the pinned Open Sage engine, bundled Inter fonts, and
required production npm dependency notices. It is generated from installed
packages using @callstack/licenses; review the scan limitations and missing-license list below.

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
