/**
 * Playwright e2e: home → game → coach → ask WebLLM → real streamed answer.
 * Records video under /opt/cursor/artifacts (or ./artifacts).
 *
 * Requires Expo web on BASE_URL (default http://localhost:8081) and WebGPU.
 */
import { chromium, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const BASE_URL = process.env.COACH_E2E_BASE_URL ?? 'http://localhost:8081';
const OUT_DIR = process.env.COACH_E2E_OUT
  ?? (fs.existsSync('/opt/cursor/artifacts') ? '/opt/cursor/artifacts' : path.join(process.cwd(), 'artifacts'));
const VIDEO_DIR = path.join(OUT_DIR, 'coach-webllm-e2e');
const TIMEOUT_MS = Number(process.env.COACH_E2E_TIMEOUT_MS ?? 10 * 60 * 1000);

function log(...args) {
  console.log('[coach-e2e]', ...args);
}

async function main() {
  fs.mkdirSync(VIDEO_DIR, { recursive: true });
  fs.mkdirSync(OUT_DIR, { recursive: true });

  const browser = await chromium.launch({
    channel: process.env.COACH_E2E_CHANNEL || 'chrome',
    headless: process.env.COACH_E2E_HEADED === '1' ? false : true,
    args: [
      '--enable-unsafe-webgpu',
      '--enable-features=Vulkan,UseSkiaRenderer,WebGPUService',
      '--ignore-gpu-blocklist',
      '--use-angle=swiftshader',
    ],
  });

  const context = await browser.newContext({
    ...devices['Desktop Chrome'],
    recordVideo: { dir: VIDEO_DIR, size: { width: 1280, height: 720 } },
    viewport: { width: 1280, height: 720 },
  });
  const page = await context.newPage();
  page.setDefaultTimeout(60_000);

  const consoleErrors = [];
  page.on('console', (msg) => {
    if (msg.type() === 'error') {
      consoleErrors.push(msg.text());
    }
  });
  page.on('pageerror', (err) => {
    consoleErrors.push(String(err));
  });

  const report = {
    baseUrl: BASE_URL,
    webgpu: null,
    modelReady: false,
    asked: false,
    gotRealAnswer: false,
    answerPreview: '',
    consoleErrors,
    videoPath: null,
    passed: false,
    notes: [],
  };

  try {
    log('goto', BASE_URL);
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });

    report.webgpu = await page.evaluate(async () => {
      if (!('gpu' in navigator)) {
        return { hasGpu: false, adapter: false };
      }
      try {
        const adapter = await navigator.gpu.requestAdapter();
        return { hasGpu: true, adapter: !!adapter };
      }
      catch (e) {
        return { hasGpu: true, adapter: false, error: String(e) };
      }
    });
    log('webgpu', report.webgpu);

    // Start vs computer (dismiss "new game?" confirm if present)
    page.once('dialog', async (dialog) => {
      await dialog.accept();
    });
    const vsComputer = page.getByLabel('Play against the computer').or(page.getByText('vs Computer'));
    await vsComputer.first().click();
    await page.waitForURL(/\/game/, { timeout: 30_000 });
    log('entered game');

    // Opening roll / mid-game — try to get into a playable position
    // Tap roll if visible
    for (let i = 0; i < 4; i++) {
      const roll = page.getByRole('button', { name: /roll/i });
      if (await roll.count() && await roll.first().isVisible().catch(() => false)) {
        await roll.first().click({ timeout: 2000 }).catch(() => {});
        await page.waitForTimeout(800);
      }
    }

    // Open coach
    const coachBtn = page.getByLabel('Ask the coach').or(page.getByTestId('coach-open'));
    await coachBtn.first().click();
    await page.getByTestId('coach-sheet').waitFor({ state: 'visible', timeout: 15_000 });
    log('coach open');

    // Wait for WebGPU check / welcome
    await page.waitForTimeout(1500);
    const subtitle = await page.getByTestId('coach-subtitle').innerText().catch(() => '');
    report.notes.push(`subtitle: ${subtitle}`);

    if (!report.webgpu?.adapter) {
      report.notes.push('No WebGPU adapter — cannot prove real WebLLM in this environment');
      throw new Error('WebGPU adapter unavailable; WebLLM e2e cannot pass here');
    }

    // Ask for a move
    const promptChip = page.getByText('What’s a good move here?').or(page.getByText("What's a good move here?"));
    if (await promptChip.count()) {
      await promptChip.first().click();
    }
    else {
      await page.getByTestId('coach-input').fill('What is a good move here and why?');
      await page.getByTestId('coach-send').click();
    }
    report.asked = true;
    log('asked coach');

    // Wait for download + answer (not Thinking… / not heuristic POC line alone)
    const deadline = Date.now() + TIMEOUT_MS;
    let lastText = '';
    while (Date.now() < deadline) {
      const bubbles = page.locator('[data-testid^="coach-msg-"]');
      const count = await bubbles.count();
      if (count > 0) {
        lastText = (await bubbles.nth(count - 1).innerText()).trim();
      }
      if (
        lastText
        && lastText !== 'Thinking…'
        && !lastText.startsWith('Checking WebGPU')
        && !lastText.startsWith('Local WebLLM coach')
        && !lastText.startsWith('POC coach')
        && !/^POC engine likes/.test(lastText)
        && lastText.length > 40
        && !/WebLLM unavailable/i.test(lastText)
      ) {
        report.gotRealAnswer = true;
        report.modelReady = true;
        report.answerPreview = lastText.slice(0, 500);
        break;
      }
      if (/WebLLM unavailable|WebGPU is required/i.test(lastText)) {
        report.notes.push(lastText.slice(0, 300));
        break;
      }
      await page.waitForTimeout(2000);
    }

    await page.screenshot({ path: path.join(OUT_DIR, 'coach-webllm-e2e-final.png'), fullPage: true });
    report.passed = report.gotRealAnswer;
    if (!report.passed) {
      throw new Error(`Did not get a real LLM answer. Last text: ${lastText.slice(0, 240)}`);
    }
    log('PASS answer:', report.answerPreview.slice(0, 180));
  }
  finally {
    const video = page.video();
    await context.close();
    await browser.close();
    if (video) {
      const raw = await video.path();
      const dest = path.join(OUT_DIR, 'coach-webllm-e2e.webm');
      try {
        fs.renameSync(raw, dest);
      }
      catch {
        fs.copyFileSync(raw, dest);
      }
      report.videoPath = dest;
      log('video', dest);
    }
    fs.writeFileSync(path.join(OUT_DIR, 'coach-webllm-e2e-report.json'), `${JSON.stringify(report, null, 2)}\n`);
  }

  if (!report.passed) {
    process.exit(1);
  }
}

main().catch((err) => {
  console.error('[coach-e2e] FAILED', err);
  process.exit(1);
});
