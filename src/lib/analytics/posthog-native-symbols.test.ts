import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = join(__dirname, '..', '..', '..');

// Invariant: the app captures native crashes at runtime, so the build must
// upload native symbols to symbolicate them. If either side is ever turned
// off without the other, crashes arrive unreadable in PostHog — the exact
// failure that prompted the PostHog wizard run. See src/config/posthog.ts
// (runtime capture) and app.config.ts (upload wiring).
describe('posthog native crash symbolication', () => {
  it('runtime captures native crashes outside Expo Go', () => {
    const runtime = readFileSync(join(ROOT, 'src/config/posthog.ts'), 'utf8');
    expect(runtime).toMatch(/nativeCrashes:\s*enableNativePostHog/);
  });

  it('build uploads native symbols to symbolicate them', () => {
    const build = readFileSync(join(ROOT, 'app.config.ts'), 'utf8');
    expect(build).toMatch(/uploadNativeSymbols:\s*(\{\s*includeSource:\s*true\s*\}|true)/);
  });

  it('build supplies CLI credentials for local native builds', () => {
    const build = readFileSync(join(ROOT, 'app.config.ts'), 'utf8');
    expect(build).toMatch(/dotenvFile:\s*['"]\.env['"]/);
  });
});
