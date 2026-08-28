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
const MANIFEST_PATH = join(ROOT, 'docs/marketing/v1.0.0/screenshot-frames.json');
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

  it('lists 5 iPhone and 5 iPad frames at Apple pixel sizes', () => {
    const iphone = manifest.frames.filter(f => f.device === 'iphone');
    const ipad = manifest.frames.filter(f => f.device === 'ipad');
    expect(iphone).toHaveLength(5);
    expect(ipad).toHaveLength(5);
    expect(manifest.devices.iphone).toEqual({ width: 1320, height: 2868 });
    expect(manifest.devices.ipad).toEqual({ width: 2064, height: 2752 });
  });

  it('uses the store carousel order and 2–5 word headlines (home has none)', () => {
    const iphoneDest = manifest.frames
      .filter(f => f.device === 'iphone')
      .map(f => f.dest);
    expect(iphoneDest).toEqual([
      'iphone-69-01-vs-computer.png',
      'iphone-69-02-legal-highlights.png',
      'iphone-69-03-lesson-hitting.png',
      'iphone-69-04-learn-hub.png',
      'iphone-69-05-home.png',
    ]);
    const ipadDest = manifest.frames
      .filter(f => f.device === 'ipad')
      .map(f => f.dest);
    expect(ipadDest).toEqual([
      'ipad-13-01-vs-computer.png',
      'ipad-13-02-legal-highlights.png',
      'ipad-13-03-lesson-hitting.png',
      'ipad-13-04-learn-hub.png',
      'ipad-13-05-home.png',
    ]);
    expect(manifest.frames.filter(f => f.device === 'iphone').map(f => f.headline)).toEqual([
      'A thinking opponent',
      'Every move, highlighted',
      'Learn on the board',
      'Five lessons. Then play.',
      undefined,
    ]);
    for (const frame of manifest.frames) {
      const isHome = frame.dest.includes('-home.');
      if (isHome) {
        expect(frame.headline).toBeFalsy();
        expect(frame.cropTop).toBe(0);
        expect(JSON.stringify(frame)).not.toMatch(/Master the board/i);
        continue;
      }
      const n = wordCount(frame.headline ?? '');
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
      expect(frame.sub).toBeUndefined();
    }
  });

  it('crops in-app chrome per scene so the headline band does not cover UI type', () => {
    const byDest = Object.fromEntries(
      manifest.frames.filter(f => f.device === 'iphone').map(f => [f.dest, f]),
    );
    expect(byDest['iphone-69-01-vs-computer.png']?.cropTop).toBeGreaterThanOrEqual(0.25);
    expect(byDest['iphone-69-02-legal-highlights.png']?.cropTop).toBeGreaterThanOrEqual(0.25);
    expect(byDest['iphone-69-03-lesson-hitting.png']?.cropTop).toBeGreaterThanOrEqual(0.3);
    expect(byDest['iphone-69-04-learn-hub.png']?.cropTop).toBeGreaterThanOrEqual(0.12);
    expect(byDest['iphone-69-05-home.png']?.cropTop).toBe(0);
    for (const frame of manifest.frames) {
      expect(frame.cropTop).toBeGreaterThanOrEqual(0);
      expect(frame.cropTop).toBeLessThanOrEqual(1);
    }
  });

  it('is two opaque zones, not a gradient overlay or gold bezel', () => {
    expect(manifest.layout).toBe('two-zone');
    expect(manifest.colors.background).toBe('#1E0C02');
    expect(manifest.colors.headline).toBe('#F3E6C8');
    const src = readFileSync(SCRIPT, 'utf8');
    expect(src).toMatch(/object-fit:cover/);
    expect(src).toMatch(/object-position:top center/);
    expect(src).toMatch(/font-family:Fraunces/);
    expect(src).toMatch(/cropTop/);
    expect(src).toMatch(/class="band"/);
    expect(src).not.toMatch(/linear-gradient/);
    expect(src).not.toMatch(/class="veil"/);
    expect(src).not.toMatch(/font-family:Inter/);
    expect(src).not.toMatch(/class="device"/);
    expect(src).not.toMatch(/class="wordmark"/);
    expect(src).not.toMatch(/class="divider"/);
  });
});

describe('compose-store-screenshots', () => {
  it('--check verifies composed outputs exist at the right dimensions', () => {
    const out = execFileSync('node', [SCRIPT, '--check'], {
      cwd: ROOT,
      encoding: 'utf8',
    });
    expect(out).toMatch(/OK 10 composed PNGs/);
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
            dest: 'iphone-69-01-vs-computer.png',
            headline: 'A thinking opponent',
            cropTop: 0.3,
          },
        ],
      };
      const manifestPath = join(dir, 'screenshot-frames.json');
      writeFileSync(manifestPath, `${JSON.stringify(manifest, null, 2)}\n`);
      expect(existsSync(join(outDir, 'iphone-69-01-vs-computer.png'))).toBe(false);

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
