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
});
