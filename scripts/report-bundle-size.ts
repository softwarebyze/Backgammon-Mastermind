/**
 * Renders the PR bundle-size comment from snapshots made by measure-bundle-size.ts.
 *
 *   pnpm tsx scripts/report-bundle-size.ts <baseRef> base-web.json:head-web.json [base-android.json:head-android.json] > report.md
 */
import type { SizeSnapshot } from './bundle-size.ts';
import { readFileSync } from 'node:fs';

import { buildReport } from './bundle-size.ts';

const [baseRef, ...pairArgs] = process.argv.slice(2);
if (!baseRef || pairArgs.length === 0) {
  console.error('usage: report-bundle-size.ts <baseRef> <base.json:head.json>...');
  process.exit(1);
}
const read = (path: string) => JSON.parse(readFileSync(path, 'utf8')) as SizeSnapshot;
const pairs = pairArgs.map((arg) => {
  const [base, head] = arg.split(':');
  return { base: read(base), head: read(head) };
});
console.log(buildReport(pairs, baseRef));
