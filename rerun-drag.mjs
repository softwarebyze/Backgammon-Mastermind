import { chromium, devices } from '/workspace/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/workspace/qa-clips/pr-389/9e36ee4';
const PREVIEW = 'https://backgammon-mastermind-1pxvx4vzs-softwarebyzes-projects.vercel.app';
const size = { profile: 'iPhone 16 Pro', viewport: { width: 402, height: 874 }, dpr: 3 };
const log = (...a) => { const l = a.map((x) => typeof x === 'string' ? x : JSON.stringify(x)).join(' '); console.log(l); fs.appendFileSync(path.join(OUT, 'rerun-drag.log'), l + '\n'); };

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
      return { ...box(el), side: r.top + r.height / 2 < midY ? 'black' : 'white' };
    });
    return {
      body: (document.body.innerText || '').replace(/\s+/g, ' ').slice(0, 300),
      trayBox,
      white: slabs.filter((s) => s.side === 'white').length,
      black: slabs.filter((s) => s.side === 'black').length,
      selected: /Selected/i.test(document.body.innerText || ''),
    };
  });
}

async function shot(page, name) {
  const fp = path.join(OUT, name);
  await page.screenshot({ path: fp, fullPage: false, type: 'png' });
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

async function dragMouse(page, from, to) {
  await page.mouse.move(from.x, from.y);
  await page.mouse.down();
  await page.waitForTimeout(80);
  const steps = 30;
  for (let i = 1; i <= steps; i++) {
    const x = from.x + (to.x - from.x) * (i / steps);
    const y = from.y + (to.y - from.y) * (i / steps);
    await page.mouse.move(x, y);
    await page.waitForTimeout(16);
  }
  await page.waitForTimeout(120);
  await page.mouse.up();
}

async function main() {
  fs.writeFileSync(path.join(OUT, 'rerun-drag.log'), '');
  const browser = await chromium.launch({ headless: true });
  const device = devices[size.profile];
  const prefs = {
    showMoveHints: true, showDirectionOverlay: false, showPointNumbers: true,
    diceDisplayStyle: 'numeric', autoRoll: false, autoMoveWhenForced: false,
    soundEnabled: false, tutorMode: false, moveInDiceOrder: false,
    confirmMove: false, computerLevel: 'easy',
  };

  const context = await browser.newContext({ ...device, viewport: size.viewport, deviceScaleFactor: size.dpr });
  await context.route(/posthog/i, (r) => r.abort());
  await context.addInitScript(({ prefs }) => {
    try { localStorage.setItem('mmkv.default\\GAME_PREFERENCES', JSON.stringify(prefs)); } catch {}
  }, { prefs });
  const page = await context.newPage();
  await play(page);
  let info = await inspect(page);
  log('before', info);
  await shot(page, 'anim-drag2-before-full.png');

  const src = await page.getByTestId('point-1').boundingBox();
  const tray = await page.getByLabel(/Bear off/i).first().boundingBox();
  log('boxes', { src, tray });
  // Start on the bottom checker of a bottom-home point, drop in the white (bottom) half of the tray.
  const from = { x: src.x + src.width / 2, y: src.y + src.height - 14 };
  const to = { x: tray.x + tray.width / 2, y: tray.y + tray.height * 0.78 };
  const flightWait = page.locator('[data-testid^="checker-flight"]').first().waitFor({ state: 'visible', timeout: 7000 }).then(() => true).catch(() => false);
  await dragMouse(page, from, to);
  const sawFlight = await flightWait;
  await page.waitForTimeout(1800);
  info = await inspect(page);
  log('after-mouse', { sawFlight, ...info });
  await shot(page, 'anim-drag2-after-full.png');
  if (info.trayBox) {
    const c = { x: Math.max(0, info.trayBox.x - 8), y: Math.max(0, info.trayBox.y - 8), width: info.trayBox.w + 16, height: info.trayBox.h + 16 };
    await page.screenshot({ path: path.join(OUT, 'anim-drag2-after-tray.png'), clip: c, type: 'png' });
  }

  // If it didn't land, cancel and try touchscreen
  if (info.white !== 8) {
    const cancel = page.getByText(/Cancel/i).first();
    if (await cancel.count()) { try { await cancel.click({ timeout: 2000 }); await page.waitForTimeout(400); } catch {} }
    info = await inspect(page);
    log('retry-touch start', info);
    const flight2 = page.locator('[data-testid^="checker-flight"]').first().waitFor({ state: 'visible', timeout: 7000 }).then(() => true).catch(() => false);
    try {
      await page.touchscreen.tap(from.x, from.y); // no, that's a tap
    } catch {}
    // real touch swipe: Playwright has no multi-step touchscreen besides tap; use dispatchEvent
    await page.evaluate(async ({ from, to }) => {
      const target = document.elementFromPoint(from.x, from.y);
      const fire = (type, x, y, extra = {}) => {
        const ev = new PointerEvent(type, {
          bubbles: true, cancelable: true, pointerId: 1, pointerType: 'touch',
          clientX: x, clientY: y, buttons: type === 'pointerup' ? 0 : 1, ...extra,
        });
        (document.elementFromPoint(x, y) || target || document.body).dispatchEvent(ev);
      };
      fire('pointerdown', from.x, from.y);
      const steps = 24;
      for (let i = 1; i <= steps; i++) {
        fire('pointermove', from.x + (to.x - from.x) * (i / steps), from.y + (to.y - from.y) * (i / steps));
        await new Promise((r) => setTimeout(r, 16));
      }
      fire('pointerup', to.x, to.y);
    }, { from, to });
    const saw2 = await flight2;
    await page.waitForTimeout(1800);
    info = await inspect(page);
    log('after-pointer', { sawFlight: saw2, ...info });
    await shot(page, 'anim-drag2-pointer-after-full.png');
  }

  fs.writeFileSync(path.join(OUT, 'rerun-drag-findings.json'), JSON.stringify({ sawFlight, info }, null, 2));
  await context.close();
  await browser.close();
}
main().catch((e) => { console.error(e); process.exit(1); });
