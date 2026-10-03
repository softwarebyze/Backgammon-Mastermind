#!/usr/bin/env node
// Download the latest Maestro visual report for this branch and serve it locally.
//
// The CI report is an HTML bundle (index.html + screenshots + e2e-recording.mp4)
// uploaded as the `maestro-visual-report` artifact. This pulls that artifact
// down so the recording and the HTML gallery can be reviewed without clicking
// through the Actions UI.
//
// Usage:
//   pnpm e2e:report              # latest run for the current branch
//   pnpm e2e:report 1234567890   # a specific run id
import { spawn, spawnSync } from 'node:child_process';
import { createReadStream, existsSync } from 'node:fs';
import { mkdtemp } from 'node:fs/promises';
import { createServer } from 'node:http';
import { tmpdir } from 'node:os';
import { extname, join, resolve, sep } from 'node:path';

const ARTIFACT = 'maestro-visual-report';
const PORT = Number(process.env.PORT ?? 4321);
const WORKFLOW = 'e2e-android.yml';

const MIME: Record<string, string> = {
  '.html': 'text/html; charset=utf-8',
  '.mp4': 'video/mp4',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.xml': 'application/xml',
  '.json': 'application/json',
  '.log': 'text/plain; charset=utf-8',
};

type GhResult = {
  out: string;
  err: string;
};

function gh(args: string[], { quiet = false }: { quiet?: boolean } = {}): Promise<GhResult> {
  return new Promise((res, rej) => {
    const child = spawn('gh', args, { stdio: quiet ? ['ignore', 'pipe', 'pipe'] : 'inherit' });
    let out = '';
    let err = '';
    child.stdout?.on('data', (d) => {
      out += String(d);
    });
    child.stderr?.on('data', (d) => {
      err += String(d);
    });
    child.on('error', (e) => {
      rej(new Error(`could not run \`gh ${args.join(' ')}\`: ${e.message}. Install the GitHub CLI and run \`gh auth login\`.`));
    });
    child.on('close', (code) => {
      if (code === 0) {
        res({ out, err });
      }
      else {
        rej(new Error(`\`gh ${args.join(' ')}\` exited ${code}${err ? `\n${err.trim()}` : ''}`));
      }
    });
  });
}

/** Current branch, or '' on detached HEAD / shallow clone / non-git cwd. */
function currentBranch(): string {
  const r = spawnSync('git', ['rev-parse', '--abbrev-ref', 'HEAD'], { encoding: 'utf8' });
  return r.status === 0 ? (r.stdout ?? '').trim() : '';
}

/**
 * Newest e2e-android.yml run. The branch filter is pushed into `gh` rather than
 * filtered client-side: `gh run list --limit 1` returns the newest run overall,
 * so a post-filter can only ever match that one run or silently fall back to it.
 */
async function resolveRunId(): Promise<string> {
  const branch = currentBranch();
  const args = ['run', 'list', '--workflow', WORKFLOW, '--limit', '1', '--json', 'databaseId'];
  if (branch) {
    args.push('--branch', branch);
  }

  const { out } = await gh(args, { quiet: true });
  const runs = JSON.parse(out || '[]') as Array<{ databaseId: number | string }>;
  const match = runs[0];
  if (!match) {
    throw new Error(branch
      ? `No ${WORKFLOW} runs found for branch \`${branch}\`.`
      : `No ${WORKFLOW} runs found for this repository.`);
  }
  return String(match.databaseId);
}

async function main(): Promise<void> {
  const runId = process.argv[2] ?? (await resolveRunId());
  const dir = join(await mkdtemp(join(tmpdir(), 'maestro-report-')), ARTIFACT);

  console.log(`Downloading ${ARTIFACT} from run ${runId}…`);
  await gh(['run', 'download', runId, '--name', ARTIFACT, '--dir', dir]);

  const entry = join(dir, 'index.html');
  if (!existsSync(entry)) {
    throw new Error(`${ARTIFACT} from run ${runId} has no index.html.`);
  }

  const root = resolve(dir);
  const server = createServer((req, res) => {
    let rel: string;
    try {
      rel = decodeURIComponent((req.url ?? '/').split('?')[0]);
    }
    catch {
      res.writeHead(400).end('bad request');
      return;
    }

    const target = resolve(root, `.${rel === '/' ? '/index.html' : rel}`);
    // Refuse to serve anything outside the extracted bundle. The separator
    // matters: a bare startsWith(root) also admits sibling dirs like /tmp/x-evil.
    if (target !== root && !target.startsWith(root + sep)) {
      res.writeHead(403).end('forbidden');
      return;
    }

    const type = MIME[extname(target)] ?? 'application/octet-stream';
    const stream = createReadStream(target);
    stream.on('error', () => {
      if (!res.headersSent) {
        res.writeHead(404);
      }
      res.end('not found');
    });
    stream.on('open', () => {
      res.writeHead(200, { 'content-type': type });
    });
    stream.pipe(res);
  });

  server.listen(PORT, () => {
    console.log(`\nMaestro report for run ${runId}:`);
    console.log(`  http://localhost:${PORT}/\n`);
    console.log('Ctrl-C to stop.');
  });
}

main().catch((err: unknown) => {
  console.error(`\ne2e:report — ${err instanceof Error ? err.message : String(err)}`);
  process.exit(1);
});
