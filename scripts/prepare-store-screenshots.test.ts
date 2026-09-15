import { execFileSync } from 'node:child_process';
import { existsSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const ROOT = process.cwd();
const SOURCE = join(ROOT, 'docs/marketing/v1.0.0/app-store-screenshots');
const PLAY_OUT = join(
  ROOT,
  'fastlane/metadata/android/en-US/images/phoneScreenshots',
);

describe('prepare-store-screenshots', () => {
  it('copies the iPhone 6.9" marketing set into Play phoneScreenshots', () => {
    const sourceIphone = readdirSync(SOURCE).filter(name =>
      name.startsWith('iphone-69-') && name.endsWith('.png'),
    );
    expect(sourceIphone).toHaveLength(5);

    execFileSync(process.execPath, ['scripts/prepare-store-screenshots.mjs'], {
      cwd: ROOT,
    });

    for (const name of sourceIphone) {
      expect(existsSync(join(PLAY_OUT, name))).toBe(true);
    }
    const staged = readdirSync(PLAY_OUT).filter(name => name.endsWith('.png'));
    expect(staged.sort()).toEqual(sourceIphone.sort());
  });
});
