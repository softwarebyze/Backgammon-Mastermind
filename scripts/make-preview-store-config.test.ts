import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

const PREVIEW_CONFIG = join(process.cwd(), 'store.preview.config.json');

afterEach(() => {
  if (existsSync(PREVIEW_CONFIG)) {
    rmSync(PREVIEW_CONFIG);
  }
});

describe('make-preview-store-config', () => {
  it('keeps every 1.0.2 localization within App Store text limits', () => {
    const canonical = JSON.parse(readFileSync('store.config.json', 'utf8')) as {
      apple: {
        version: string;
        info: Record<string, {
          title: string;
          subtitle: string;
          promoText: string;
          description: string;
          keywords: string[];
        }>;
      };
    };

    expect(canonical.apple.version).toBe('1.0.2');
    expect(Object.keys(canonical.apple.info)).toHaveLength(17);
    for (const listing of Object.values(canonical.apple.info)) {
      expect([...listing.title].length).toBeLessThanOrEqual(30);
      expect([...listing.subtitle].length).toBeLessThanOrEqual(30);
      expect([...listing.promoText].length).toBeLessThanOrEqual(170);
      expect([...listing.description].length).toBeLessThanOrEqual(4000);
      expect(listing.keywords.join(',').length).toBeLessThanOrEqual(100);
    }
  });

  it('writes the gitignored preview listing with a unique ASC title', () => {
    execFileSync('node', ['scripts/make-preview-store-config.mjs'], { cwd: process.cwd() });
    expect(existsSync(PREVIEW_CONFIG)).toBe(true);

    const preview = JSON.parse(readFileSync(PREVIEW_CONFIG, 'utf8')) as {
      apple: { version: string; info: Record<string, { title: string }> };
    };
    const canonical = JSON.parse(readFileSync('store.config.json', 'utf8')) as {
      apple: { version: string; info: Record<string, { title: string }> };
    };

    expect(preview.apple.info['en-US']?.title).toBe('Backgammon Mastermind Preview');
    expect(canonical.apple.info['en-US']?.title).not.toBe(
      preview.apple.info['en-US']?.title,
    );
    expect(preview.apple.version).toBe(canonical.apple.version);
  });

  it('keeps package.json version in sync with store.config.json apple.version', () => {
    const canonical = JSON.parse(readFileSync('store.config.json', 'utf8')) as {
      apple: { version: string };
    };
    const pkg = JSON.parse(readFileSync('package.json', 'utf8')) as { version: string };
    expect(pkg.version).toBe(canonical.apple.version);
  });
});
