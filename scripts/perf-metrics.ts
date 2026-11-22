/**
 * Pure helpers for the Android performance job (see `scripts/perf-report.ts`).
 * Kept free of I/O so Jest can cover the maths and the baseline comparison.
 */

/** One cold launch as written by `.github/scripts/measure-android-startup.sh`. */
export type StartupRun = {
  run: number;
  firstFrameMs: number | null;
  readyMs: number | null;
  pssKb: number | null;
};

/** github-action-benchmark `customSmallerIsBetter` entry. */
export type BenchEntry = {
  name: string;
  unit: string;
  value: number;
  range?: string;
  extra?: string;
};

type MetricSpec = {
  name: string;
  unit: string;
  /** Flag as a regression only when worse by more than this fraction… */
  relative: number;
  /** …and by more than this absolute amount (filters emulator noise). */
  absolute: number;
};

/** Thresholds are loose for timings because the CI emulator is software-rendered and shared. */
export const METRICS = {
  ready: { name: 'Android cold start: app ready', unit: 'ms', relative: 0.15, absolute: 150 },
  firstFrame: { name: 'Android cold start: first frame', unit: 'ms', relative: 0.15, absolute: 100 },
  pss: { name: 'Android memory after start (PSS)', unit: 'MB', relative: 0.1, absolute: 10 },
  apk: { name: 'Android APK size', unit: 'MB', relative: 0.03, absolute: 0.25 },
  bundle: { name: 'Android JS bundle (Hermes bytecode)', unit: 'KB', relative: 0.03, absolute: 50 },
} as const satisfies Record<string, MetricSpec>;

const byName = new Map<string, MetricSpec>(Object.values(METRICS).map(m => [m.name, m]));

export function parseRuns(jsonl: string): StartupRun[] {
  return jsonl
    .split('\n')
    .map(line => line.trim())
    .filter(Boolean)
    .map(line => JSON.parse(line) as StartupRun);
}

export function median(values: number[]): number {
  if (values.length === 0) {
    return Number.NaN;
  }
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[mid]! : (sorted[mid - 1]! + sorted[mid]!) / 2;
}

function round(value: number, digits = 0): number {
  const f = 10 ** digits;
  return Math.round(value * f) / f;
}

function spread(values: number[], unit: string, digits = 0) {
  const min = Math.min(...values);
  const max = Math.max(...values);
  return `n=${values.length}, min ${round(min, digits)}${unit}, max ${round(max, digits)}${unit}`;
}

function present(values: (number | null)[]): number[] {
  return values.filter((v): v is number => typeof v === 'number' && Number.isFinite(v));
}

/** Summarise raw runs + artifact sizes into benchmark entries (medians for timings). */
export function buildBench(runs: StartupRun[], sizes: { apkBytes: number; bundleBytes: number }): BenchEntry[] {
  const entries: BenchEntry[] = [];
  const ready = present(runs.map(r => r.readyMs));
  const firstFrame = present(runs.map(r => r.firstFrameMs));
  const pssMb = present(runs.map(r => r.pssKb)).map(kb => kb / 1024);

  if (ready.length) {
    entries.push({ name: METRICS.ready.name, unit: 'ms', value: round(median(ready)), extra: spread(ready, 'ms') });
  }
  if (firstFrame.length) {
    entries.push({ name: METRICS.firstFrame.name, unit: 'ms', value: round(median(firstFrame)), extra: spread(firstFrame, 'ms') });
  }
  if (pssMb.length) {
    entries.push({ name: METRICS.pss.name, unit: 'MB', value: round(median(pssMb), 1), extra: spread(pssMb, 'MB', 1) });
  }
  if (sizes.apkBytes > 0) {
    entries.push({ name: METRICS.apk.name, unit: 'MB', value: round(sizes.apkBytes / 1024 / 1024, 2) });
  }
  if (sizes.bundleBytes > 0) {
    entries.push({ name: METRICS.bundle.name, unit: 'KB', value: round(sizes.bundleBytes / 1024) });
  }
  return entries;
}

type BenchmarkData = {
  entries?: Record<string, { commit?: { id?: string }; benches?: BenchEntry[] }[]>;
};

/**
 * Read the latest `main` results from github-action-benchmark's `data.js`
 * (`window.BENCHMARK_DATA = {...}`). Returns null when there is no history yet.
 */
export function parseBaseline(dataJs: string, suite: string): { commit?: string; values: Map<string, number> } | null {
  const start = dataJs.indexOf('{');
  if (start === -1) {
    return null;
  }
  const json = dataJs.slice(start).trim().replace(/;$/, '');
  const data = JSON.parse(json) as BenchmarkData;
  const history = data.entries?.[suite];
  const latest = history?.at(-1);
  if (!latest?.benches?.length) {
    return null;
  }
  return {
    commit: latest.commit?.id,
    values: new Map(latest.benches.map(b => [b.name, b.value])),
  };
}

export type Comparison = {
  name: string;
  unit: string;
  current: number;
  baseline?: number;
  delta?: number;
  status: 'regressed' | 'improved' | 'same' | 'new';
};

export function compare(current: BenchEntry[], baseline: Map<string, number> | undefined): Comparison[] {
  return current.map((entry) => {
    const base = baseline?.get(entry.name);
    if (base === undefined) {
      return { name: entry.name, unit: entry.unit, current: entry.value, status: 'new' };
    }
    const spec = byName.get(entry.name);
    const delta = entry.value - base;
    const significant = spec
      ? Math.abs(delta) > spec.absolute && Math.abs(delta) > Math.abs(base) * spec.relative
      : delta !== 0;
    const status = !significant ? 'same' : delta > 0 ? 'regressed' : 'improved';
    return { name: entry.name, unit: entry.unit, current: entry.value, baseline: base, delta, status };
  });
}

const ICON: Record<Comparison['status'], string> = {
  regressed: '🔴 slower/bigger',
  improved: '🟢 better',
  same: '⚪ within noise',
  new: '🆕 no baseline',
};

function fmt(value: number, unit: string) {
  return `${Number(value.toFixed(2))} ${unit}`;
}

/** Markdown for the job summary / sticky PR comment. */
export function formatReport(rows: Comparison[], opts: { baselineCommit?: string; runs: number; repoUrl?: string; dashboardUrl?: string }): string {
  const lines = ['### ⏱️ Performance (Android emulator)', ''];
  if (opts.baselineCommit) {
    const short = opts.baselineCommit.slice(0, 7);
    const link = opts.repoUrl ? `[\`${short}\`](${opts.repoUrl}/commit/${opts.baselineCommit})` : `\`${short}\``;
    lines.push(`Compared with latest \`main\` run ${link}. Timings are the median of ${opts.runs} cold starts.`, '');
  }
  else {
    lines.push(`No \`main\` baseline yet — numbers are recorded once this lands on \`main\`. Timings are the median of ${opts.runs} cold starts.`, '');
  }
  lines.push('| Metric | This run | main | Δ | |', '|---|---:|---:|---:|---|');
  for (const row of rows) {
    const base = row.baseline === undefined ? '—' : fmt(row.baseline, row.unit);
    let delta = '—';
    if (row.delta !== undefined && row.baseline) {
      const pct = (row.delta / row.baseline) * 100;
      delta = `${row.delta > 0 ? '+' : ''}${fmt(Number(row.delta.toFixed(2)), row.unit)} (${pct > 0 ? '+' : ''}${pct.toFixed(1)}%)`;
    }
    lines.push(`| ${row.name} | ${fmt(row.current, row.unit)} | ${base} | ${delta} | ${ICON[row.status]} |`);
  }
  lines.push(
    '',
    '<sub>Software-rendered CI emulator: absolute times are slower than real devices, so watch the trend, not the number. Regressions are flagged only past a noise threshold and never fail the build.</sub>',
  );
  if (opts.dashboardUrl) {
    lines.push('', `📈 [History dashboard](${opts.dashboardUrl})`);
  }
  return `${lines.join('\n')}\n`;
}
