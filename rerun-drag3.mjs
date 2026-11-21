import { chromium, devices } from '/workspace/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/workspace/qa-clips/pr-389/9e36ee4';
const PREVIEW = 'https://backgammon-mastermind-1pxvx4vzs-softwarebyzes-projects.vercel.app';
const size = { profile: 'iPhone 16 Pro', viewport: { width: 402, height: 874 }, dpr: 3 };
const log = (...a) => { const l = a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(l); fs.appendFileSync(path.join(OUT, 'rerun-drag3.log'), l + '\n'); };

function emptyPoints() { return Array.from({ length: 25 }, () => ({ player: null, count: 0 })); }
function distribute(points, player, homes, count) {
  if (count <= 0) return;
  const n = homes.length, base = Math.floor(count / n); let rem = count - base * n;
  for (const point of homes) { const c = base + (rem > 0 ? 1 : 0); if (rem > 0) rem--; if (c > 0) points[point] = { player, count: c }; }
}
function urlFor() {
  const points = emptyPoints();
  points[1] = { player: 'white', count: 1 };
  points[6] = { player: 'white', count: 7 };
  distribute(points, 'black', [24, 23, 22, 21, 20, 19], 8);
  const pos = {
    version: 1, points, bar: { white: 0, black: 0 }, borneOff: { white: 7, black: 7 },
    currentPlayer: 'white', dice: [1, 3],
    context: { cubeExponent: 0, cubeOwner: null, turnOwner: 'white', matchLength: 0, scores: { white: 0, black: 0 }, crawford: false, jacoby: false, beavers: false, maxCube: 10, gameState: 1, resignation: 0, doubleAction: '' },
  };
  return `${PREVIEW}/position?data=${encodeURIComponent(JSON.stringify(pos))}`;
}

async function inspect(page) {
  return page.evaluate(() => {
    const box = (el) => { if (!el) return null; const r = el.getBoundingClientRect(); return { x: r.x, y: r.y, w: r.width, h: r.height, top: r.top, bottom: r.bottom, left: r.left, right: r.right }; };
    const tray = document.querySelector('[aria-label="Bear off"]');
    const trayBox = box(tray);
    const midY = trayBox ? trayBox.y + trayBox.h / 2 : 0;
    const slabs = [...document.querySelectorAll('[data-testid="bear-off-slab"]')].map((el) => {
      const r = el.getBoundingClientRect();
      return { ...box(el), side: r.top + r.height / 2 < midY ? 'black' : 'white', h: r.height };
    });
    const whites = slabs.filter((s) => s.side === 'white').sort((a, b) => a.top - b.top);
    return {
      body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 280),
      trayBox,
      white: whites.length,
      black: slabs.filter((s) => s.side === 'black').length,
      selected: /Selected/i.test(document.body.innerText || ''),
      whiteTops: whites.map((s) => +s.top.toFixed(1)),
      off: (document.body.innerText || '').match(/\d+\s*OFF/gi),
    };
  });
}

async function shot(page, name, clip) {
  const fp = path.join(OUT, name);
  const opts = { path: fp, fullPage: false, type: 'png' };
  if (clip) opts.clip = clip;
  await page.screenshot(opts);
  log('SHOT', name, fs.statSync(fp).size);
}

async function play(page) {
  await page.goto(urlFor(), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 25000 });
  const human = page.getByTestId('position-mode-human');
  if (await human.count()) { try { await human.click({ timeout: 2500 }); } catch {} }
  await page.getByTestId('position-play').click({ timeout: 5000 });
  const confirm = page.getByTestId('confirm-dialog-confirm');
  if (await confirm.count()) { try { await confirm.click({ timeout: 2000 }); } catch {} }
  await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
}

async function main() {
  fs.writeFileSync(path.join(OUT, 'rerun-drag3.log'), '');
  const browser = await chromium.launch({ headless: true });
  const device = devices[size.profile];
  const prefs = {
    showMoveHints: true, showDirectionOverlay: false, showPointNumbers: true,
    diceDisplayStyle: 'numeric', autoRoll: false, autoMoveWhenForced: false,
    soundEnabled: false, tutorMode: false, moveInDiceOrder: false,
    confirmMove: false, computerLevel: 'easy',
  };
  const context = await browser.newContext({ ...device, viewport: size.viewport, deviceScaleFactor: size.dpr, hasTouch: true });
  await context.route(/posthog/i, (r) => r.abort());
  await context.addInitScript(({ prefs }) => {
    try { localStorage.setItem('mmkv.default\\GAME_PREFERENCES', JSON.stringify(prefs)); } catch {}
  }, { prefs });
  const page = await context.newPage();
  await play(page);
  let info = await inspect(page);
  log('before', info);
  await shot(page, 'anim-drag3-before-full.png');
  if (info.trayBox) await shot(page, 'anim-drag3-before-tray.png', { x: Math.max(0, info.trayBox.x-8), y: Math.max(0, info.trayBox.y-8), width: info.trayBox.w+16, height: info.trayBox.h+16 });

  const src = await page.getByTestId('point-1').boundingBox();
  const tray = info.trayBox;
  log('boxes', { src, tray });
  const from = { x: src.x + src.width / 2, y: src.y + src.height - 16 };
  const to = { x: tray.x + tray.w / 2, y: tray.y + tray.h * 0.78 };
  log('from-to', { from, to, dist: Math.hypot(to.x-from.x, to.y-from.y) });

  const flightWait = page.locator('[data-testid^="checker-flight"]').first().waitFor({ state: 'visible', timeout: 8000 }).then(() => true).catch(() => false);
  // Slow mouse pan, >16px immediately, no preliminary tap.
  await page.mouse.move(from.x, from.y);
  await page.waitForTimeout(60);
  await page.mouse.down();
  await page.waitForTimeout(50);
  // first jump past minDistance
  await page.mouse.move(from.x + 10, from.y - 20);
  const steps = 28;
  const start = { x: from.x + 10, y: from.y - 20 };
  for (let i = 1; i <= steps; i++) {
    await page.mouse.move(start.x + (to.x - start.x) * (i / steps), start.y + (to.y - start.y) * (i / steps));
    await page.waitForTimeout(20);
  }
  await page.waitForTimeout(200);
  // mid-drag shot if overlay is up
  try { await shot(page, 'anim-drag3-mid.png'); } catch {}
  await page.mouse.up();
  const sawFlight = await flightWait;
  await page.waitForTimeout(1800);
  info = await inspect(page);
  log('after-mouse', { sawFlight, ...info });
  await shot(page, 'anim-drag3-after-full.png');
  if (info.trayBox) await shot(page, 'anim-drag3-after-tray.png', { x: Math.max(0, info.trayBox.x-8), y: Math.max(0, info.trayBox.y-8), width: info.trayBox.w+16, height: info.trayBox.h+16 });

  const ok = info.white === 8;
  log(ok ? 'PASS drag' : 'FAIL drag', { sawFlight, white: info.white, selected: info.selected, off: info.off });
  fs.writeFileSync(path.join(OUT, 'rerun-drag3-findings.json'), JSON.stringify({ ok, sawFlight, info }, null, 2));
  await context.close();
  await browser.close();
  process.exit(ok ? 0 : 2);
}
main().catch((e) => { console.error(e); process.exit(1); });
