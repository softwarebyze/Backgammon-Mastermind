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
  headline: string;
  sub?: string;
};

type Manifest = {
  frames: Frame[];
  devices: Record<string, { width: number; height: number }>;
};

function loadManifest(): Manifest {
  return JSON.parse(readFileSync(MANIFEST_PATH, 'utf8')) as Manifest;
}

function wordCount(headline: string): number {
  return headline.trim().split(/\s+/).length;
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

  it('uses the store carousel order and 2–5 word headlines', () => {
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
    for (const frame of manifest.frames) {
      const n = wordCount(frame.headline);
      expect(n).toBeGreaterThanOrEqual(2);
      expect(n).toBeLessThanOrEqual(5);
    }
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
        wordmark: 'BACKGAMMON MASTERMIND',
        colors: {
          background: '#1E0C02',
          backgroundMid: '#2A1408',
          headline: '#E8A04A',
          sub: '#C4A07A',
          rim: '#E8A04A',
          wordmark: '#E8A04A',
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
            headline: 'Play a real game',
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
