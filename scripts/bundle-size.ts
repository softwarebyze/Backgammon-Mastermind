/**
 * Bundle-size measurement and PR report (see .github/workflows/size-report.yml).
 *
 * Pure functions only — the CLI wrappers live in measure-bundle-size.ts and
 * report-bundle-size.ts so Jest can test this file directly.
 */

export type Platform = 'web' | 'android';

export const GROUPS = ['js', 'css', 'fonts', 'images', 'audio', 'engine', 'other'] as const;
export type Group = (typeof GROUPS)[number];

export type ExportFile = {
  /** Path relative to the export root, e.g. `_expo/static/js/web/entry-<hash>.js`. */
  path: string;
  /** Extension without the dot; native assets are hash-named, so it is passed in. */
  ext: string;
  bytes: number;
  /** Only measured for JavaScript, where transfer size is what users feel. */
  gzipBytes?: number;
};

export type SizeSnapshot = {
  platform: Platform;
  total: number;
  jsGzip: number;
  groups: Record<Group, number>;
  /** Per-file bytes, keyed by path with content hashes removed (web only). */
  files: Record<string, number>;
};

const EXT_GROUPS: Record<string, Group> = {
  js: 'js',
  hbc: 'js',
  css: 'css',
  ttf: 'fonts',
  otf: 'fonts',
  woff: 'fonts',
  woff2: 'fonts',
  png: 'images',
  jpg: 'images',
  jpeg: 'images',
  gif: 'images',
  webp: 'images',
  svg: 'images',
  ico: 'images',
  wav: 'audio',
  mp3: 'audio',
  m4a: 'audio',
  aac: 'audio',
  ogg: 'audio',
};

export function groupFor(file: Pick<ExportFile, 'path' | 'ext'>): Group {
  if (file.path.startsWith('bgsage/')) {
    return 'engine';
  }
  return EXT_GROUPS[file.ext.toLowerCase()] ?? 'other';
}

/** `entry-1a2b….js` / `Feather.1a2b….ttf` → stable names that survive a rebuild. */
export function stripHash(path: string): string {
  return path.replace(/[.-][0-9a-f]{20,}(?=(@\dx)?\.\w+$)/, '');
}

export function summarize(platform: Platform, files: ExportFile[]): SizeSnapshot {
  const groups = Object.fromEntries(GROUPS.map(group => [group, 0])) as Record<Group, number>;
  const byName: Record<string, number> = {};
  let total = 0;
  let jsGzip = 0;
  for (const file of files) {
    const group = groupFor(file);
    groups[group] += file.bytes;
    total += file.bytes;
    if (group === 'js') {
      jsGzip += file.gzipBytes ?? 0;
    }
    if (platform === 'web') {
      const name = stripHash(file.path);
      byName[name] = (byName[name] ?? 0) + file.bytes;
    }
  }
  return { platform, total, jsGzip, groups, files: byName };
}

/** Changes that earn a warning line. The report never fails the build. */
export const WARN = { jsGzip: 25 * 1024, total: 250 * 1024 };

export function formatBytes(bytes: number): string {
  const abs = Math.abs(bytes);
  if (abs >= 1024 * 1024) {
    return `${(bytes / 1024 / 1024).toFixed(2)} MB`;
  }
  if (abs >= 1024) {
    return `${(bytes / 1024).toFixed(1)} KB`;
  }
  return `${bytes} B`;
}

export function formatDelta(base: number, head: number): string {
  const diff = head - base;
  if (Math.abs(diff) < 100) {
    return '—';
  }
  const sign = diff > 0 ? '+' : '−';
  const pct = base === 0 ? '' : ` (${sign}${Math.abs((diff / base) * 100).toFixed(1)}%)`;
  const arrow = diff > 0 ? '🔺' : '🟢';
  return `${arrow} ${sign}${formatBytes(Math.abs(diff))}${pct}`;
}

const LABELS: Record<Group | 'total' | 'jsGzip', string> = {
  total: '**Total**',
  jsGzip: 'JS (gzipped)',
  js: 'JS',
  css: 'CSS',
  fonts: 'Fonts',
  images: 'Images',
  audio: 'Audio',
  engine: 'bgsage engine',
  other: 'Other',
};

function rows(base: SizeSnapshot, head: SizeSnapshot): string[] {
  const keys: (Group | 'total' | 'jsGzip')[] = ['total', 'jsGzip', ...GROUPS];
  return keys
    .filter((key) => {
      const value = (s: SizeSnapshot) => (key === 'total' || key === 'jsGzip' ? s[key] : s.groups[key]);
      return value(base) > 0 || value(head) > 0;
    })
    .map((key) => {
      const value = (s: SizeSnapshot) => (key === 'total' || key === 'jsGzip' ? s[key] : s.groups[key]);
      return `| ${LABELS[key]} | ${formatBytes(value(base))} | ${formatBytes(value(head))} | ${formatDelta(value(base), value(head))} |`;
    });
}

/** `assets/node_modules/@expo/vector-icons/build/…/Ionicons.ttf` → `@expo/vector-icons/…/Ionicons.ttf`. */
export function shortName(path: string): string {
  const match = path.match(/node_modules\/((?:@[^/]+\/)?[^/]+)\/(?:.*\/)?([^/]+)$/);
  return match ? `${match[1]}/…/${match[2]}` : path;
}

function topFileChanges(base: SizeSnapshot, head: SizeSnapshot, limit = 8): string[] {
  const names = new Set([...Object.keys(base.files), ...Object.keys(head.files)]);
  return [...names]
    .map(name => ({ name, base: base.files[name] ?? 0, head: head.files[name] ?? 0 }))
    .filter(change => Math.abs(change.head - change.base) >= 1024)
    .sort((a, b) => Math.abs(b.head - b.base) - Math.abs(a.head - a.base))
    .slice(0, limit)
    .map((change) => {
      const status = change.base === 0 ? ' _(new)_' : change.head === 0 ? ' _(removed)_' : '';
      return `| \`${shortName(change.name)}\`${status} | ${formatDelta(change.base, change.head)} |`;
    });
}

export function warnings(base: SizeSnapshot, head: SizeSnapshot, label: string): string[] {
  const out: string[] = [];
  if (head.jsGzip - base.jsGzip > WARN.jsGzip) {
    out.push(`⚠️ ${label}: gzipped JS grew by ${formatBytes(head.jsGzip - base.jsGzip)} (warning threshold ${formatBytes(WARN.jsGzip)}).`);
  }
  if (head.total - base.total > WARN.total) {
    out.push(`⚠️ ${label}: total size grew by ${formatBytes(head.total - base.total)} (warning threshold ${formatBytes(WARN.total)}).`);
  }
  return out;
}

const TITLES: Record<Platform, string> = {
  web: 'Web (`expo export -p web`)',
  android: 'Native JS bundle + assets (`expo export -p android`, Hermes)',
};

export function buildReport(pairs: { base: SizeSnapshot; head: SizeSnapshot }[], baseRef: string): string {
  const lines = ['## 📦 Bundle size', ''];
  const allWarnings = pairs.flatMap(({ base, head }) => warnings(base, head, TITLES[head.platform].split(' (')[0]));
  lines.push(allWarnings.length > 0 ? allWarnings.join('\n') : '✅ No size increase above the warning thresholds.', '');
  for (const { base, head } of pairs) {
    lines.push(`### ${TITLES[head.platform]}`, '', `| | ${baseRef} | this PR | change |`, '|---|---:|---:|---:|', ...rows(base, head), '');
    const changes = topFileChanges(base, head);
    if (changes.length > 0) {
      lines.push('<details><summary>Largest file changes</summary>', '', '| file | change |', '|---|---:|', ...changes, '', '</details>', '');
    }
  }
  lines.push('<sub>Report only — never fails the build. The native app binary (native modules) is not included.</sub>');
  return lines.join('\n');
}
