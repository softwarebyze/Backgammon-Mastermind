import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = join(__dirname, '../..');
const read = (path: string) => JSON.parse(readFileSync(join(root, path), 'utf8'));
const eas = read('eas.json');

describe('site association files (#350)', () => {
  it('apple-app-site-association names the production app', () => {
    const aasa = read('public/.well-known/apple-app-site-association');
    const { appleTeamId, bundleIdentifier } = eas.submit.production.ios;
    expect(aasa.applinks.details[0].appIDs).toEqual([`${appleTeamId}.${bundleIdentifier}`]);
  });

  it('assetlinks.json names the production package with valid SHA-256 fingerprints', () => {
    const [statement] = read('public/.well-known/assetlinks.json');
    expect(statement.target.package_name).toBe('com.backgammonmastermind');
    expect(statement.target.sha256_cert_fingerprints.length).toBeGreaterThan(0);
    for (const fp of statement.target.sha256_cert_fingerprints)
      expect(fp).toMatch(/^(?:[0-9A-F]{2}:){31}[0-9A-F]{2}$/);
  });

  it('vercel serves both files as JSON instead of rewriting them to the app', () => {
    const vercel = read('vercel.json');
    const spa = new RegExp(`^${vercel.rewrites.at(-1).source}$`);
    expect(spa.test('/.well-known/apple-app-site-association')).toBe(false);
    expect(spa.test('/.well-known/assetlinks.json')).toBe(false);
    expect(spa.test('/learn')).toBe(true);
  });
});
