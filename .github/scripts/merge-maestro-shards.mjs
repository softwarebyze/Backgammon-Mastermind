#!/usr/bin/env node
// Merge the Android Maestro shard artifacts into the single layout the visual
// report expects:
//   <workspace>/report.xml                     one JUnit file, a suite per shard
//   <workspace>/.maestro-ci-output/shard-N/    each shard's screenshots and logs
//   <workspace>/e2e-recording-shard-N.mp4      each shard's screen recording
//
// Every flow listed for a shard must report a result. A shard that crashed,
// timed out or never uploaded gets a failing testcase per missing flow, so a
// partial run can never read as green.
//
// Usage: node merge-maestro-shards.mjs <shards-json> <artifacts-dir> <workspace>
// <artifacts-dir>/maestro-shard-N/ holds report.xml, output/ and
// e2e-recording.mp4 as uploaded by the shard job.

import { cpSync, existsSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

const [shardsFile, artifactsDir, workspace] = process.argv.slice(2);
if (!shardsFile || !artifactsDir || !workspace) {
  console.error('Usage: merge-maestro-shards.mjs <shards-json> <artifacts-dir> <workspace>');
  process.exit(2);
}

const { shards } = JSON.parse(readFileSync(shardsFile, 'utf8'));
const outputDir = join(workspace, '.maestro-ci-output');
mkdirSync(outputDir, { recursive: true });

function escapeXml(text) {
  return text.replace(/[<>&"']/g, ch => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;', '"': '&quot;', '\'': '&apos;' })[ch]);
}

/** Every <testsuite> element in a JUnit document, self-closing or not. */
function testSuites(xml) {
  const suites = [];
  const open = /<testsuite\b[^>]*>/g;
  let match = open.exec(xml);
  while (match) {
    if (match[0].endsWith('/>')) {
      suites.push(match[0]);
      open.lastIndex = match.index + match[0].length;
    }
    else {
      const close = xml.indexOf('</testsuite>', open.lastIndex);
      if (close === -1)
        break;
      const end = close + '</testsuite>'.length;
      suites.push(xml.slice(match.index, end));
      open.lastIndex = end;
    }
    match = open.exec(xml);
  }
  return suites;
}

function renameSuite(suite, name) {
  return suite.replace(/^<testsuite\b([^>]*?)\sname="[^"]*"/, '<testsuite$1').replace(/^<testsuite\b/, `<testsuite name="${escapeXml(name)}"`);
}

const merged = [];
const problems = [];

shards.forEach((flows, index) => {
  const number = index + 1;
  const label = `Android shard ${number}`;
  const artifact = join(artifactsDir, `maestro-shard-${number}`);
  const report = join(artifact, 'report.xml');

  const reported = new Set();
  if (existsSync(report)) {
    const xml = readFileSync(report, 'utf8');
    for (const suite of testSuites(xml)) {
      merged.push(renameSuite(suite, label));
      for (const testcase of suite.matchAll(/<testcase\b[^>]*\bname="([^"]*)"/g))
        reported.add(testcase[1]);
    }
  }
  else {
    problems.push(`${label}: no JUnit report`);
  }

  const missing = flows.filter(flow => !reported.has(flow));
  if (missing.length > 0) {
    problems.push(`${label}: no result for ${missing.join(', ')}`);
    const cases = missing.map(flow => `    <testcase id="${escapeXml(flow)}" name="${escapeXml(flow)}" classname="${escapeXml(flow)}" time="0">
      <failure message="No result reported: the shard stopped, timed out or was cancelled before this flow finished."/>
    </testcase>`);
    merged.push(`<testsuite name="${escapeXml(`${label} (missing results)`)}" tests="${missing.length}" failures="${missing.length}" errors="0" time="0">
${cases.join('\n')}
  </testsuite>`);
  }

  const output = join(artifact, 'output');
  if (existsSync(output))
    cpSync(output, join(outputDir, `shard-${number}`), { recursive: true });

  const recording = join(artifact, 'e2e-recording.mp4');
  if (existsSync(recording))
    cpSync(recording, join(workspace, `e2e-recording-shard-${number}.mp4`));
});

writeFileSync(
  join(workspace, 'report.xml'),
  `<?xml version='1.0' encoding='UTF-8'?>\n<testsuites>\n  ${merged.join('\n  ')}\n</testsuites>\n`,
);

for (const problem of problems)
  console.log(`::error::${problem}`);
console.log(`Merged ${shards.length} shard(s); ${problems.length} problem(s).`);
