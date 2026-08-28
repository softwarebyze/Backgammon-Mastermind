#!/usr/bin/env node
/**
 * Capture production App Store screenshots from Expo web at Apple's pixel sizes.
 *
 * iPhone 6.9": 440×956 CSS @ 3x → 1320×2868
 * iPad Pro 13": 1032×1376 CSS @ 2x → 2064×2752
 *
 * Requires a production web server:
 *   EXPO_PUBLIC_APP_ENV=production BROWSER=none CI=1 pnpm exec expo start --web --port 8081
 *
 * Usage:
 *   STORE_SHOT_BASE=http://127.0.0.1:8081 node scripts/capture-store-screenshots.mjs
 */
import { execFileSync } from 'node:child_process';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const OUT_DIR = path.join(ROOT, 'docs/marketing/v1.0.0/app-store-screenshots/raw');
const BASE = process.env.STORE_SHOT_BASE || 'http://127.0.0.1:8081';
const MMKV = (key) => `mmkv.default\\${key}`;

const DEVICES = {
  iphone: {
    prefix: 'iphone-69',
    viewport: { width: 440, height: 956, deviceScaleFactor: 3 },
    pixels: { width: 1320, height: 2868 },
  },
  ipad: {
    prefix: 'ipad-13',
    viewport: { width: 1032, height: 1376, deviceScaleFactor: 2 },
    pixels: { width: 2064, height: 2752 },
  },
};

const HIDE_CHROME_CSS = `
html, body, #root {
  width: 100% !important;
  height: 100% !important;
  max-width: none !important;
  margin: 0 !important;
  box-shadow: none !important;
  overflow: hidden !important;
}
vercel-live-feedback,
#vercel-live-feedback,
[data-vercel-toolbar],
[data-vercel-toolbar-container],
iframe[src*="vercel.live"],
#expo-dev-client-menu,
[data-expo-dev-menu],
[data-expo-web-index],
div[id*="dev-menu"] {
  display: none !important;
  pointer-events: none !important;
  visibility: hidden !important;
}
`;

function loadGameStates() {
  const src = `
import { createPositionState } from './src/lib/game/create-position.ts';
import { getLegalMoves } from './src/lib/game/moves.ts';

const moving = createPositionState({
  useStandardSetup: true,
  dice: [6, 4],
  currentPlayer: 'white',
  mode: 'vs-computer',
});
moving.openingRolls = { white: 6, black: 3 };

const selectedPoint = 13;
const legal = getLegalMoves({ ...moving, selectedPoint }).filter((m) => m.from === selectedPoint);
const highlighted = {
  ...moving,
  selectedPoint,
  legalMovesForSelected: legal,
};

process.stdout.write(JSON.stringify({ moving, highlighted }));
`;
  const raw = execFileSync('pnpm', ['exec', 'tsx', '-e', src], {
    cwd: ROOT,
    encoding: 'utf8',
    maxBuffer: 4 * 1024 * 1024,
  });
  const json = raw.slice(raw.indexOf('{'));
  return JSON.parse(json);
}

const PREFS = {
  showMoveHints: false,
  showDirectionOverlay: false,
  showPointNumbers: false,
  diceDisplayStyle: 'dots',
  autoRoll: false,
  autoMoveWhenForced: false,
  soundEnabled: false,
  fastComputer: true,
};

function storageFor(kind, states) {
  const base = {
    [MMKV('local')]: 'en',
    [MMKV('GAME_PREFERENCES')]: JSON.stringify(PREFS),
    [MMKV('GAME_PREFERENCES_DICE_DOTS_V1')]: 'true',
  };
  if (kind === 'home' || kind === 'learn-hub' || kind === 'lesson') {
    return base;
  }
  if (kind === 'gameplay') {
    return { ...base, [MMKV('ACTIVE_GAME_STATE')]: JSON.stringify(states.moving) };
  }
  if (kind === 'highlights') {
    return { ...base, [MMKV('ACTIVE_GAME_STATE')]: JSON.stringify(states.highlighted) };
  }
  return base;
}

const SCENES = [
  { file: '01-home.png', kind: 'home', path: '/', ready: 'text=Learn to play' },
  { file: '02-learn-hub.png', kind: 'learn-hub', path: '/learn', ready: 'text=Goal & board' },
  { file: '03-lesson-hitting.png', kind: 'lesson', path: '/learn/hitting-bar', ready: '[data-testid="learn-board-slot"]' },
  { file: '04-vs-computer.png', kind: 'gameplay', path: '/game', ready: '[data-testid="game-board-slot"]' },
  { file: '05-legal-highlights.png', kind: 'highlights', path: '/game', ready: '[data-testid="game-board-slot"]' },
];

async function waitForServer(url, tries = 90) {
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, { redirect: 'manual' });
      if (res.ok || res.status === 304 || (res.status >= 300 && res.status < 400)) {
        return;
      }
    }
    catch {
      // still booting
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`Server not ready at ${url}`);
}

async function preparePage(page, storage) {
  await page.addInitScript((entries) => {
    try {
      localStorage.clear();
      for (const [key, value] of Object.entries(entries)) {
        localStorage.setItem(key, value);
      }
    }
    catch {
      // ignore
    }
  }, storage);
  await page.addInitScript(() => {
    try {
      window.__STORE_SHOTS__ = true;
    }
    catch {
      // ignore
    }
  });
}

async function hideChrome(page) {
  await page.addStyleTag({ content: HIDE_CHROME_CSS });
  await page.evaluate(() => {
    const zap = () => {
      document.querySelectorAll(
        'vercel-live-feedback, #vercel-live-feedback, [data-vercel-toolbar], iframe[src*="vercel.live"]',
      ).forEach((el) => el.remove());
    };
    zap();
  });
}

async function assertProductionUi(page, kind) {
  const body = await page.locator('body').innerText();
  const lower = body.toLowerCase();
  if (/\bpreview\b/.test(lower) && !lower.includes('tap a highlighted')) {
    throw new Error(`PREVIEW copy leaked into ${kind} screenshot`);
  }
  if (body.includes('0.1.3')) {
    throw new Error(`Version 0.1.3 leaked into ${kind} screenshot`);
  }
  if (kind === 'home' && body.includes('Resume Game')) {
    throw new Error('Home screenshot still shows Resume Game');
  }
  if (kind === 'home' && !body.includes('MASTERMIND')) {
    throw new Error('Home screenshot missing Backgammon Mastermind lockup');
  }
  if ((kind === 'gameplay' || kind === 'highlights') && body.includes('Who goes first?')) {
    throw new Error('Opening-roll overlay still visible on gameplay screenshot');
  }
  if (kind === 'gameplay' || kind === 'highlights') {
    if (!body.includes('Your turn') && !body.includes('Selected')) {
      throw new Error(`Gameplay screenshot missing turn chrome (${kind})`);
    }
  }
}

async function captureScene(browser, device, scene, states) {
  const page = await browser.newPage({
    viewport: {
      width: device.viewport.width,
      height: device.viewport.height,
    },
    deviceScaleFactor: device.viewport.deviceScaleFactor,
    hasTouch: true,
    isMobile: device.prefix.startsWith('iphone'),
    locale: 'en-US',
    colorScheme: 'dark',
  });
  await preparePage(page, storageFor(scene.kind, states));
  await page.goto(`${BASE}${scene.path}`, { waitUntil: 'domcontentloaded', timeout: 120_000 });
  await page.waitForSelector(scene.ready, { timeout: 60_000 });
  await hideChrome(page);
  await page.evaluate(async () => {
    if (document.fonts?.ready) {
      await document.fonts.ready;
    }
  });
  await new Promise((r) => setTimeout(r, 900));
  await assertProductionUi(page, scene.kind);
  const dest = path.join(OUT_DIR, `${device.prefix}-${scene.file}`);
  await page.screenshot({
    path: dest,
    type: 'png',
    fullPage: false,
    animations: 'disabled',
    caret: 'hide',
  });
  await page.close();
  return dest;
}

async function main() {
  const playwrightPath
    = process.env.PLAYWRIGHT_CORE
      || '/tmp/pw-store/node_modules/playwright-core/index.mjs';
  const { chromium } = await import(playwrightPath);
  fs.mkdirSync(OUT_DIR, { recursive: true });

  console.log(`Waiting for ${BASE} …`);
  await waitForServer(BASE);
  console.log('Generating seeded game states…');
  const states = loadGameStates();
  if (states.moving.phase !== 'moving' || states.highlighted.selectedPoint !== 13) {
    throw new Error('Seeded game states look wrong');
  }

  const browser = await chromium.launch({
    executablePath: process.env.CHROME_PATH || '/usr/bin/google-chrome',
    headless: true,
    args: [
      '--no-sandbox',
      '--disable-dev-shm-usage',
      '--hide-scrollbars',
      '--font-render-hinting=none',
      '--disable-gpu',
    ],
  });

  const written = [];
  try {
    for (const [name, device] of Object.entries(DEVICES)) {
      console.log(`\n=== ${name} ${device.pixels.width}×${device.pixels.height} ===`);
      for (const scene of SCENES) {
        const dest = await captureScene(browser, device, scene, states);
        written.push(dest);
        console.log(`  wrote ${path.relative(ROOT, dest)}`);
      }
    }
  }
  finally {
    await browser.close();
  }

  const old = fs.readdirSync(OUT_DIR).filter((f) => f.endsWith('.png') && !written.some((w) => path.basename(w) === f));
  for (const file of old) {
    fs.unlinkSync(path.join(OUT_DIR, file));
    console.log(`  deleted stale ${file}`);
  }

  console.log('\nDone.');
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
