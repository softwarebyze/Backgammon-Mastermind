import { Buffer } from 'node:buffer';
import { execFileSync } from 'node:child_process';
import {
  existsSync,
  mkdirSync,
  mkdtempSync,
  readFileSync,
  rmSync,
  writeFileSync,
} from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const ROOT = process.cwd();
const MANIFEST_PATH = join(ROOT, 'docs/marketing/screenshot-frames.json');
const LOCALIZATIONS_PATH = join(
  ROOT,
  'docs/marketing/screenshot-localizations.json',
);
const SCRIPT = join(ROOT, 'scripts/compose-store-screenshots.mjs');
const PNG_1X1 = Buffer.from(
  'iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8BQDwAEhQGAhKmMIQAAAABJRU5ErkJggg==',
  'base64',
);

type Frame = {
  device: 'iphone' | 'ipad';
  source: string;
  dest: string;
  headline?: string;
  sub?: string;
  cropTop?: number;
  fit?: 'cover' | 'contain';
  copy?: string;
};

type Manifest = {
  layout?: string;
  frames: Frame[];
  devices: Record<string, { width: number; height: number }>;
  colors: Record<string, string>;
};

function loadManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

function wordCount(headline: string): number {
  return headline.trim().split(/\s+/).filter(Boolean).length;
}

describe('screenshot-frames manifest', () => {
  const manifest = loadManifest();

  it('lists 7 iPhone and 7 iPad frames at Apple pixel sizes', () => {
    const iphone = manifest.frames.filter(f => f.device === 'iphone');
    const ipad = manifest.frames.filter(f => f.device === 'ipad');
    expect(iphone).toHaveLength(7);
    expect(ipad).toHaveLength(7);
    expect(manifest.devices.iphone).toEqual({ width: 1320, height: 2868 });
    expect(manifest.devices.ipad).toEqual({ width: 2064, height: 2752 });
  });

  it('leads with the best features, in the same order on both devices', () => {
    const scenes = (device: Frame['device']) => manifest.frames
      .filter(f => f.device === device)
      .map(f => f.dest.replace(/^(iphone-69|ipad-13)-/, ''));
    expect(scenes('iphone')).toEqual([
      '01-vs-computer.png',
      '02-tutor.png',
      '03-learn-to-play.png',
      '04-match-cube.png',
      '05-position.png',
      '06-pass-and-play.png',
      '07-learn-hub.png',
    ]);
    expect(scenes('ipad')).toEqual(scenes('iphone'));
    for (const frame of manifest.frames) {
      const n = wordCount(frame.headline ?? '');
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
    }
  });

  it('crops in-app chrome per scene so the headline band does not cover UI type', () => {
    for (const frame of manifest.frames) {
      expect(frame.cropTop).toBeGreaterThanOrEqual(0);
      expect(frame.cropTop).toBeLessThanOrEqual(0.2);
    }
  });

  it('clips cropTop before fitting a contain frame, so the bottom of the app stays in view', () => {
    const render = (cropTop: number) => execFileSync(process.execPath, ['--input-type=module', '-e', `
      const { frameHtml } = await import(${JSON.stringify(SCRIPT)});
      process.stdout.write(frameHtml({
        frame: { device: 'iphone', headline: 'Set up any position', fit: 'contain', cropTop: ${cropTop} },
        spec: { width: 1320, height: 2868 },
        colors: {},
        dataUrl: 'data:image/png;base64,',
      }));
    `], { cwd: ROOT, encoding: 'utf8' });
    expect(render(0.128)).toContain(`object-view-box:inset(${Math.round(0.128 * 2868)}px 0 0 0)`);
    expect(render(0)).not.toContain('object-view-box');
  });

  it('is two opaque zones, not a gradient overlay or gold bezel', () => {
    expect(manifest.layout).toBe('two-zone');
    expect(manifest.colors.background).toBe('#1E0C02');
    expect(manifest.colors.headline).toBe('#F3E6C8');
    const src = readFileSync(SCRIPT, 'utf8');
    expect(src).toMatch(/object-fit:\$\{contain \? 'contain' : 'cover'\}/);
    expect(src).toMatch(/object-position:center/);
    expect(src).toMatch(/font-family:InterStore/);
    expect(src).toMatch(/cropTop/);
    expect(src).toMatch(/class="band"/);
    expect(src).not.toMatch(/linear-gradient/);
    expect(src).not.toMatch(/class="veil"/);
    expect(src).not.toMatch(/font-family:Fraunces/);
    expect(src).not.toMatch(/class="device"/);
    expect(src).not.toMatch(/class="wordmark"/);
    expect(src).not.toMatch(/class="divider"/);
  });
});

describe('screenshot localizations', () => {
  it('provides store copy for every App Store locale', () => {
    const copy = JSON.parse(readFileSync(LOCALIZATIONS_PATH, 'utf8')) as Record<
      string,
      Record<string, string | string[]>
    >;
    const storeLocales = Object.keys(
      (JSON.parse(readFileSync(join(ROOT, 'store.config.json'), 'utf8')) as {
        apple: { info: Record<string, unknown> };
      }).apple.info,
    );
    expect(Object.keys(copy).sort()).toEqual(storeLocales.sort());
    const manifest = loadManifest();
    for (const locale of Object.values(copy)) {
      expect(locale.appLanguage).toBeTruthy();
      expect(locale.playLocale).toBeTruthy();
      for (const frame of manifest.frames) {
        const key = frame.copy ?? '';
        expect((locale[key] as string[]).join(' ')).toBeTruthy();
        // An English sub needs a localized one, or the band would mix languages.
        expect(Boolean(locale[`${key}Sub`])).toBe(Boolean(frame.sub));
      }
    }
  });
});

describe('compose-store-screenshots', () => {
  it('--check verifies composed outputs exist at the right dimensions', () => {
    const out = execFileSync('node', [SCRIPT, '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(out).toMatch(/OK 14 composed PNGs/);
  });

  it('refuses a raw PNG that is not the Apple pixel size', () => {
    const dir = mkdtempSync(join(tmpdir(), 'bm-frames-'));
    try {
      const rawDir = join(dir, 'app-store-screenshots', 'raw');
      const outDir = join(dir, 'app-store-screenshots');
      mkdirSync(rawDir, { recursive: true });
      writeFileSync(join(rawDir, 'iphone-69-04-vs-computer.png'), PNG_1X1);
      const manifest = {
        version: '1.0.0',
        rawDir: 'app-store-screenshots/raw',
        outDir: 'app-store-screenshots',
        layout: 'two-zone',
        colors: {
          background: '#1E0C02',
          headline: '#F3E6C8',
        },
        devices: {
          iphone: { width: 1320, height: 2868 },
          ipad: { width: 2064, height: 2752 },
        },
        frames: [
          {
            device: 'iphone',
            source: 'iphone-69-04-vs-computer.png',
            dest: 'iphone-69-03-vs-computer.png',
            headline: 'Play against the computer',
            cropTop: 0.3,
          },
        ],
      };
      const manifestPath = join(dir, 'screenshot-frames.json');
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      expect(existsSync(join(outDir, 'iphone-69-03-vs-computer.png'))).toBe(false);

      try {
        execFileSync('node', [SCRIPT, '--manifest', manifestPath], {
          cwd: ROOT,
          encoding: 'utf8',
        });
        throw new Error('expected compose to refuse the 1×1 PNG');
      }
      catch (err) {
        const error = err as { status?: number; stdout?: string; stderr?: string; message?: string };
        expect(error.status).toBe(1);
        const text = `${error.stdout ?? ''}${error.stderr ?? ''}${error.message ?? ''}`;
        expect(text).toMatch(/1×1/);
        expect(text).toMatch(/1320×2868/);
      }
    }
    finally {
      rmSync(dir, { recursive: true, force: true });
    }
  });
});
