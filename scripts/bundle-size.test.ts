import type { ExportFile, SizeSnapshot } from './bundle-size';

import { buildReport, formatDelta, groupFor, shortName, stripHash, summarize, warnings } from './bundle-size';

function file(path: string, bytes: number, gzipBytes?: number): ExportFile {
  return {
    path,
    ext: path.split('.').pop() ?? '',
    bytes,
    gzipBytes,
  };
}

const KB = 1024;

describe('bundle size snapshot', () => {
  it('groups files by kind, with the engine kept apart', () => {
    expect(groupFor({ path: '_expo/static/js/web/entry-abc.js', ext: 'js' })).toBe('js');
    expect(groupFor({ path: '_expo/static/js/android/entry-abc.hbc', ext: 'hbc' })).toBe('js');
    expect(groupFor({ path: 'bgsage/bgsage.js', ext: 'js' })).toBe('engine');
    expect(groupFor({ path: 'assets/0a1b2c', ext: 'ttf' })).toBe('fonts');
    expect(groupFor({ path: 'assets/sounds/roll.wav', ext: 'wav' })).toBe('audio');
    expect(groupFor({ path: 'index.html', ext: 'html' })).toBe('other');
  });

  it('removes content hashes so files line up across builds', () => {
    expect(stripHash('_expo/static/js/web/entry-caeba80e2e49f170ba98daba28b60038.js')).toBe('_expo/static/js/web/entry.js');
    expect(stripHash('assets/sounds/roll.41655adb6f2ef33b1d52684d47fb3300.wav')).toBe('assets/sounds/roll.wav');
    expect(stripHash('assets/icons/close-icon.808e1b1b9b53114ec2838071a7e6daa7@2x.png')).toBe('assets/icons/close-icon@2x.png');
    expect(stripHash('bgsage/bgsage.data')).toBe('bgsage/bgsage.data');
  });

  it('shortens dependency asset paths for the table', () => {
    expect(shortName('assets/node_modules/@expo/vector-icons/build/vendor/Fonts/Ionicons.ttf')).toBe('@expo/vector-icons/…/Ionicons.ttf');
    expect(shortName('_expo/static/js/web/entry.js')).toBe('_expo/static/js/web/entry.js');
  });

  it('totals bytes and gzipped JS', () => {
    const snapshot = summarize('web', [
      file('_expo/static/js/web/entry-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.js', 100 * KB, 30 * KB),
      file('assets/a.png', 10 * KB),
      file('bgsage/bgsage.data', 500 * KB),
    ]);
    expect(snapshot.total).toBe(610 * KB);
    expect(snapshot.jsGzip).toBe(30 * KB);
    expect(snapshot.groups).toMatchObject({ js: 100 * KB, images: 10 * KB, engine: 500 * KB, fonts: 0 });
    expect(snapshot.files['_expo/static/js/web/entry.js']).toBe(100 * KB);
  });
});

describe('bundle size report', () => {
  const base: SizeSnapshot = summarize('web', [
    file('_expo/static/js/web/entry-aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa.js', 1000 * KB, 300 * KB),
    file('assets/Ionicons.bbbbbbbbbbbbbbbbbbbbbbbbbbbbbbbb.ttf', 400 * KB),
  ]);

  it('shows direction and percentage, and ignores noise', () => {
    expect(formatDelta(1000 * KB, 900 * KB)).toBe('🟢 −100.0 KB (−10.0%)');
    expect(formatDelta(1000 * KB, 1100 * KB)).toBe('🔺 +100.0 KB (+10.0%)');
    expect(formatDelta(1000, 1050)).toBe('—');
  });

  it('warns only above the thresholds and never otherwise', () => {
    const small = summarize('web', [file('_expo/static/js/web/entry-a.js', 1010 * KB, 310 * KB)]);
    expect(warnings(base, small, 'Web')).toEqual([]);
    const big = summarize('web', [file('_expo/static/js/web/entry-a.js', 1500 * KB, 400 * KB)]);
    expect(warnings(base, big, 'Web')).toEqual([expect.stringContaining('gzipped JS grew by 100.0 KB')]);
  });

  it('lists removed files and the overall change', () => {
    const head = summarize('web', [file('_expo/static/js/web/entry-cccccccccccccccccccccccccccccccc.js', 900 * KB, 280 * KB)]);
    const markdown = buildReport([{ base, head }], 'main');
    expect(markdown).toContain('| **Total** | 1.37 MB | 900.0 KB | 🟢 −500.0 KB (−35.7%) |');
    expect(markdown).toContain('`assets/Ionicons.ttf` _(removed)_');
    expect(markdown).toContain('✅ No size increase above the warning thresholds.');
  });
});
