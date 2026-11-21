/**
 * Turns raw Android startup runs into benchmark JSON + a markdown report.
 *
 *   tsx scripts/perf-report.ts \
 *     --runs .perf-output/startup-runs.jsonl \
 *     --apk android-test.apk \
 *     [--baseline perf-baseline/data.js] \
 *     --out-bench .perf-output/bench.json \
 *     --out-md .perf-output/report.md
 *
 * The bench JSON feeds benchmark-action/github-action-benchmark
 * (`customSmallerIsBetter`), which keeps the history on the `gh-pages` branch.
 */
import { execFileSync } from 'node:child_process';
import { existsSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { parseArgs } from 'node:util';

import { buildBench, compare, formatReport, parseBaseline, parseRuns } from './perf-metrics.ts';

const SUITE = 'Android performance';

const { values: args } = parseArgs({
  options: {
    'runs': { type: 'string' },
    'apk': { type: 'string' },
    'baseline': { type: 'string' },
    'out-bench': { type: 'string' },
    'out-md': { type: 'string' },
  },
});

function bundleBytes(apk: string): number {
  try {
    const listing = execFileSync('unzip', ['-l', apk, 'assets/index.android.bundle'], { encoding: 'utf8' });
    const match = listing.match(/^\s*(\d+)\s+\S+\s+\S+\s+assets\/index\.android\.bundle$/m);
    return match ? Number(match[1]) : 0;
  }
  catch {
    return 0;
  }
}

const runs = args.runs && existsSync(args.runs) ? parseRuns(readFileSync(args.runs, 'utf8')) : [];
const apk = args.apk && existsSync(args.apk) ? args.apk : undefined;
const bench = buildBench(runs, {
  apkBytes: apk ? statSync(apk).size : 0,
  bundleBytes: apk ? bundleBytes(apk) : 0,
});

let baseline: ReturnType<typeof parseBaseline> = null;
if (args.baseline && existsSync(args.baseline)) {
  try {
    baseline = parseBaseline(readFileSync(args.baseline, 'utf8'), SUITE);
  }
  catch (error) {
    console.warn(`Could not read baseline ${args.baseline}:`, error);
  }
}

const repoUrl = process.env.GITHUB_REPOSITORY
  ? `${process.env.GITHUB_SERVER_URL ?? 'https://github.com'}/${process.env.GITHUB_REPOSITORY}`
  : undefined;
const markdown = formatReport(compare(bench, baseline?.values), {
  baselineCommit: baseline?.commit,
  runs: runs.length,
  repoUrl,
  dashboardUrl: process.env.PERF_DASHBOARD_URL || undefined,
});

if (args['out-bench']) {
  writeFileSync(args['out-bench'], `${JSON.stringify(bench, null, 2)}\n`);
}
if (args['out-md']) {
  writeFileSync(args['out-md'], markdown);
}
console.log(markdown);

if (runs.length && !runs.some(r => r.readyMs !== null)) {
  console.log('::warning::No run logged the JS startup marker; "app ready" was not measured.');
}
if (bench.length === 0) {
  console.error('::error::No performance metrics were produced.');
  process.exitCode = 1;
}
