import { webkit, chromium, devices } from '/workspace/bgmm-389-mock-notes/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const BASE = process.env.BASE.replace(/\/$/, '');
const OUT = process.env.OUT || '/workspace/bgmm-389-mock-notes/final/shots';
const TAG = process.env.TAG || 'pr';
fs.mkdirSync(OUT, { recursive: true });
function pos({ w = 0, b = 0, barW = 0, barB = 0, owner = null, exp = 0, extraWhite = null, extraBlack = null, dice = [0, 0], turn = 'white' }) {
  const points = Array.from({ length: 25 }, () => ({ player: null, count: 0 }));
  const dist = (pl, homes, n) => { const base = Math.floor(n / 6); let rem = n - base * 6; for (const p of homes) { const k = base + (rem-- > 0 ? 1 : 0); if (k) points[p] = { player: pl, count: k }; } };
  if (extraWhite) points[extraWhite.point] = { player: 'white', count: extraWhite.count };
  else dist('white', [1,2,3,4,5,6], 15 - w - barW);
  if (extraBlack) points[extraBlack.point] = { player: 'black', count: extraBlack.count };
  else dist('black', [24,23,22,21,20,19], 15 - b - barB);
  return { version: 1, points, bar: { white: barW, black: barB }, borneOff: { white: w, black: b }, currentPlayer: turn, dice,
    context: { cubeExponent: exp, cubeOwner: owner, turnOwner: turn, matchLength: 0, scores: { white: 0, black: 0 }, crawford: false, jacoby: false, beavers: false, maxCube: 10, gameState: 1, resignation: 0, doubleAction: '' } };
}
export const url = (p) => `${BASE}/position?data=${encodeURIComponent(JSON.stringify(p))}`;
const VIEWS = {
  portrait: { device: 'iPhone 13 Pro Max', viewport: { width: 428, height: 926 }, dpr: 3 },
  landscape: { device: 'iPhone SE', viewport: { width: 667, height: 375 }, dpr: 2 },
  ipad: { device: 'iPad Pro 11', viewport: { width: 1024, height: 1366 }, dpr: 2 },
  desktop: { device: null, viewport: { width: 1440, height: 900 }, dpr: 1 },
};
const CASES = (process.env.CASES || '').split(',').filter(Boolean);
const W15 = (owner, exp = 1) => ({ w: 14, b: 9, extraWhite: { point: 1, count: 1 }, dice: [1, 2], owner, exp });
const B15 = (owner, exp = 1) => ({ w: 9, b: 14, extraBlack: { point: 24, count: 1 }, dice: [1, 2], owner, exp, turn: 'black' });
const ALL = [];
for (const view of ['portrait', 'landscape', 'ipad', 'desktop']) {
  ALL.push([view, 'cube-white-w15', W15('white'), 'en', 'endgame:point-1']);
  ALL.push([view, 'cube-black-b15', B15('black'), 'en', 'endgame:point-24']);
  ALL.push([view, 'centre-w14-b14', { w: 14, b: 14 }]);
}
ALL.push(['portrait', 'rtl-cube-white-w15', W15('white'), 'ar', 'endgame:point-1']);
ALL.push(['portrait', 'rtl-cube-black-b15', B15('black'), 'ar', 'endgame:point-24']);
ALL.push(['portrait', 'editor-cube-white-w14', { w: 14, b: 14, owner: 'white', exp: 1 }, 'en', 'editor']);
ALL.push(['portrait', 'editor-cube-black-b14', { w: 14, b: 14, owner: 'black', exp: 1 }, 'en', 'editor']);
ALL.push(['portrait', 'cube-white-w7', { w: 7, b: 7, owner: 'white', exp: 1 }]);

const browser = await webkit.launch();
const chrome = await chromium.launch();
const results = [];
for (const [view, id, p, lang = 'en', mode = 'play'] of ALL) {
  const name = `${TAG}-${view}-${id}`;
  if (CASES.length && !CASES.some(c => name.includes(c))) continue;
  const v = VIEWS[view];
  const b = v.device ? browser : chrome;
  const ctx = await b.newContext({ ...(v.device ? devices[v.device] : {}), viewport: v.viewport, deviceScaleFactor: v.dpr });
  await ctx.route(/posthog/i, r => r.abort());
  await ctx.addInitScript((lang) => {
    localStorage.setItem('mmkv.default\\GAME_PREFERENCES', JSON.stringify({ showMoveHints: true, showDirectionOverlay: false, showPointNumbers: true, diceDisplayStyle: 'numeric', autoRoll: false, autoMoveWhenForced: false, soundEnabled: false, tutorMode: false, confirmMove: false, computerLevel: 'easy' }));
    localStorage.setItem('mmkv.default\\local', lang.split('|')[0]);
    if (lang.split('|')[1]) localStorage.setItem('bo-alt', lang.split('|')[1]);
  }, `${lang}|${process.env.ALT || ''}`);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', name, e.message.slice(0, 200)));
  const u = url(pos(p));
  await page.goto(u, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.getByTestId('board-view').waitFor({ timeout: 40000 });
  await page.waitForTimeout(1500);
  if (mode !== 'editor') {
    const human = page.getByTestId('position-mode-human'); if (await human.count()) await human.click().catch(() => {});
    await page.getByTestId('position-play').click({ timeout: 8000 }).catch(e => console.log('play fail', name, e.message.slice(0, 80)));
    await page.waitForTimeout(800);
    const conf = page.getByTestId('confirm-dialog-confirm'); if (await conf.count()) await conf.click().catch(() => {});
    await page.getByTestId('point-1').waitFor({ timeout: 15000 }).catch(() => console.log('no point-1', name));
    await page.waitForTimeout(1200);
  }
  if (mode.startsWith('endgame')) {
    await page.screenshot({ path: `${OUT}/${name}-before.png` });
    await page.getByTestId(mode.split(':')[1]).click().catch(e => console.log('sel fail', e.message.slice(0, 80)));
    await page.waitForTimeout(400);
    const tray = page.locator('[aria-label^="Bear off"]').first();
    await tray.click().catch(e => console.log('tray fail', e.message.slice(0, 80)));
    
    await page.waitForTimeout(2500);
  }
  const info = await page.evaluate(() => {
    const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: +b.x.toFixed(1), y: +b.y.toFixed(1), w: +b.width.toFixed(1), h: +b.height.toFixed(1) }; };
    const tray = document.querySelector('[aria-label^="Bear off"]');
    return { board: r(document.querySelector('[data-testid="board-view"]')), tray: r(tray), trayLabel: tray?.getAttribute('aria-label'), cube: r(document.querySelector('[data-testid="board-cube-slot"]') || document.querySelector('[data-testid="position-cube"]')), bar: r(document.querySelector('[data-testid="board-bar"]') || document.querySelector('[data-testid="position-board-bar"]')), slabs: [...document.querySelectorAll('[data-testid="bear-off-slab"]')].map(r), counts: [...document.querySelectorAll('[data-testid^="bear-off-count"]')].map(e => e.textContent), countRects: [...document.querySelectorAll('[data-testid^="bear-off-count"]')].map(r), dir: document.documentElement.dir };
  });
  await page.screenshot({ path: `${OUT}/${name}-full.png` });
  if (info.board) await page.screenshot({ path: `${OUT}/${name}-board.png`, clip: { x: info.board.x, y: info.board.y, width: info.board.w, height: info.board.h } });
  console.log(name, JSON.stringify({ board: info.board, tray: info.tray, cube: info.cube, slabs: info.slabs.length, thick: info.slabs[0]?.h, counts: info.counts, label: info.trayLabel, dir: info.dir }));
  results.push({ name, url: u, ...info });
  await ctx.close();
}
fs.writeFileSync(`${OUT}/${TAG}-metrics.json`, JSON.stringify(results, null, 1));
await browser.close(); await chrome.close();
