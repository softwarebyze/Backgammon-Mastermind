import { spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

it('renders nested Maestro screenshots without losing their flow paths', () => {
  const fixture = mkdtempSync(join(tmpdir(), 'maestro-report-'));
  try {
    const output = join(fixture, 'output');
    for (const flow of ['smoke', 'settings-back']) {
      const folder = join(output, flow, 'takeScreenshot');
      mkdirSync(folder, { recursive: true });
      writeFileSync(join(folder, '01-board.png'), flow);
    }
    const report = join(fixture, 'report.xml');
    writeFileSync(report, '<testsuite failures="0"/>');
    const result = spawnSync('bash', [join(process.cwd(), '.github/scripts/maestro-post-e2e-report.sh')], {
      encoding: 'utf8',
      env: {
        ...process.env,
        MAESTRO_FALLBACK_OUTPUT_DIR: join(fixture, 'fallback'),
        GITHUB_TOKEN: '',
        GITHUB_WORKSPACE: fixture,
        MAESTRO_OUTPUT_DIR: output,
        MAESTRO_JUNIT_REPORT: report,
        GITHUB_REPOSITORY: 'test/repo',
        GITHUB_RUN_ID: '123',
        GITHUB_SERVER_URL: 'https://github.com',
        GITHUB_STEP_SUMMARY: join(fixture, 'summary.md'),
      },
      timeout: 10000,
    });
    expect(result.status).toBe(0);
    const html = readFileSync(join(fixture, 'maestro-visual-bundle/index.html'), 'utf8');
    for (const flow of ['smoke', 'settings-back']) {
      expect(html).toContain(`src="${flow}/takeScreenshot/01-board.png"`);
      expect(readFileSync(join(fixture, 'maestro-visual-bundle', flow, 'takeScreenshot/01-board.png'), 'utf8')).toBe(flow);
    }
    expect(readFileSync(join(fixture, 'maestro-pr-comment.md'), 'utf8')).toContain('**2 screenshot(s)**');
  }
  finally {
    rmSync(fixture, { recursive: true, force: true });
  }
});
