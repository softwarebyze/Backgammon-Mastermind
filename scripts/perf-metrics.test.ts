import { buildBench, compare, formatReport, median, METRICS, parseBaseline, parseRuns } from './perf-metrics';

const runsJsonl = [
  '{"run":1,"firstFrameMs":900,"readyMs":2100,"pssKb":204800}',
  '{"run":2,"firstFrameMs":800,"readyMs":null,"pssKb":null}',
  '',
  '{"run":3,"firstFrameMs":1000,"readyMs":1900,"pssKb":215040}',
].join('\n');

it('takes the median and ignores runs that missed a metric', () => {
  expect(median([3, 1, 2])).toBe(2);
  expect(median([4, 1, 2, 3])).toBe(2.5);
  const bench = buildBench(parseRuns(runsJsonl), { apkBytes: 50 * 1024 * 1024, bundleBytes: 3 * 1024 * 1024 });
  expect(bench).toEqual([
    expect.objectContaining({ name: METRICS.ready.name, value: 2000, extra: 'n=2, min 1900ms, max 2100ms' }),
    expect.objectContaining({ name: METRICS.firstFrame.name, value: 900 }),
    expect.objectContaining({ name: METRICS.pss.name, value: 205 }),
    { name: METRICS.apk.name, unit: 'MB', value: 50 },
    { name: METRICS.bundle.name, unit: 'KB', value: 3072 },
  ]);
});

it('reads the latest main entry from github-action-benchmark data.js', () => {
  const dataJs = `window.BENCHMARK_DATA = ${JSON.stringify({
    lastUpdate: 1,
    entries: {
      'Android performance': [
        { commit: { id: 'old' }, benches: [{ name: METRICS.ready.name, value: 9999, unit: 'ms' }] },
        { commit: { id: 'abc1234def' }, benches: [{ name: METRICS.ready.name, value: 2000, unit: 'ms' }] },
      ],
    },
  })};\n`;
  const baseline = parseBaseline(dataJs, 'Android performance');
  expect(baseline?.commit).toBe('abc1234def');
  expect(baseline?.values.get(METRICS.ready.name)).toBe(2000);
  expect(parseBaseline(dataJs, 'Other suite')).toBeNull();
  expect(parseBaseline('', 'Android performance')).toBeNull();
});

it('flags only changes past both the relative and absolute noise thresholds', () => {
  const baseline = new Map([
    [METRICS.ready.name, 2000],
    [METRICS.firstFrame.name, 900],
    [METRICS.apk.name, 50],
  ]);
  const rows = compare(
    [
      { name: METRICS.ready.name, unit: 'ms', value: 2400 }, // +20%, +400ms
      { name: METRICS.firstFrame.name, unit: 'ms', value: 960 }, // +6.7%: noise
      { name: METRICS.apk.name, unit: 'MB', value: 45 }, // -10%
      { name: METRICS.bundle.name, unit: 'KB', value: 3000 },
    ],
    baseline,
  );
  expect(rows.map(r => r.status)).toEqual(['regressed', 'same', 'improved', 'new']);

  const md = formatReport(rows, { baselineCommit: 'abc1234def', runs: 10, repoUrl: 'https://github.com/o/r' });
  expect(md).toContain('[`abc1234`](https://github.com/o/r/commit/abc1234def)');
  expect(md).toContain('| Android cold start: app ready | 2400 ms | 2000 ms | +400 ms (+20.0%) | 🔴 slower/bigger |');
  expect(md).toContain('🆕 no baseline');
});

it('explains when there is no baseline yet', () => {
  const md = formatReport(compare([{ name: METRICS.ready.name, unit: 'ms', value: 2000 }], undefined), { runs: 10 });
  expect(md).toContain('No `main` baseline yet');
});
