import { webkit, devices } from '/workspace/bgmm-389-mock-notes/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
const BASE = process.env.BASE || 'http://localhost:44215';
const OUT = '/workspace/bgmm-389-mock-notes/raw';
fs.mkdirSync(OUT, { recursive: true });
const STYLES = (process.env.STYLES || 'now,A,B,C').split(',');
const CASES = [
  { id: 'w1-b1', w: 1, b: 1 },
  { id: 'w7-b7', w: 7, b: 7 },
  { id: 'w15-b15', w: 15, b: 15 },
  { id: 'w15-b1', w: 15, b: 1 },
  { id: 'w7-b7-cube-white', w: 7, b: 7, cubeOwner: 'white', exp: 1 },
];
function pos(c) {
  const points = Array.from({ length: 25 }, () => ({ player: null, count: 0 }));
  const dist = (pl, homes, n) => { const base = Math.floor(n / 6); let rem = n - base * 6; for (const p of homes) { const k = base + (rem-- > 0 ? 1 : 0); if (k) points[p] = { player: pl, count: k }; } };
  dist('white', [1,2,3,4,5,6], 15 - c.w); dist('black', [24,23,22,21,20,19], 15 - c.b);
  return { version: 1, points, bar: { white: 0, black: 0 }, borneOff: { white: c.w, black: c.b }, currentPlayer: 'white', dice: [0,0],
    context: { cubeExponent: c.exp ?? 0, cubeOwner: c.cubeOwner ?? null, turnOwner: 'white', matchLength: 0, scores: { white: 0, black: 0 }, crawford: false, jacoby: false, beavers: false, maxCube: 10, gameState: 1, resignation: 0, doubleAction: '' } };
}
const browser = await webkit.launch();
const metrics = [];
for (const style of STYLES) {
  const ctx = await browser.newContext({ ...devices['iPhone 13 Pro Max'], viewport: { width: 428, height: 926 }, deviceScaleFactor: 3 });
  await ctx.route(/posthog/i, r => r.abort());
  await ctx.addInitScript((style) => {
    localStorage.setItem('bgmm.mockBearOff', style);
    localStorage.setItem('mmkv.default\\GAME_PREFERENCES', JSON.stringify({ showMoveHints: true, showDirectionOverlay: false, showPointNumbers: true, diceDisplayStyle: 'numeric', autoRoll: false, autoMoveWhenForced: false, soundEnabled: false, tutorMode: false, confirmMove: false, computerLevel: 'easy' }));
    localStorage.setItem('mmkv.default\\local', 'en');
  }, style);
  const page = await ctx.newPage();
  page.on('pageerror', e => console.log('PAGEERROR', e.message.slice(0, 200)));
  for (const c of CASES) {
    await page.goto(`${BASE}/position?data=${encodeURIComponent(JSON.stringify(pos(c)))}`, { waitUntil: 'domcontentloaded' });
    await page.getByTestId('board-view').waitFor({ timeout: 30000 });
    await page.waitForTimeout(1200);
    const human = page.getByTestId('position-mode-human'); if (await human.count()) await human.click().catch(() => {});
    const play = page.getByTestId('position-play');
    if (await play.count()) { await play.click().catch(() => console.log('play fail', c.id)); await page.waitForTimeout(800);
      const conf = page.getByTestId('confirm-dialog-confirm'); if (await conf.count()) await conf.click().catch(() => {});
      await page.getByTestId('point-1').waitFor({ timeout: 15000 }).catch(() => console.log('no point-1', c.id)); }
    await page.waitForTimeout(1000);
    const info = await page.evaluate(() => {
      const r = el => { if (!el) return null; const b = el.getBoundingClientRect(); return { x: b.x, y: b.y, w: b.width, h: b.height }; };
      const tray = [...document.querySelectorAll('[aria-label]')].find(e => /bear off/i.test(e.getAttribute('aria-label')));
      const slabs = [...document.querySelectorAll('[data-testid="bear-off-slab"]')].map(r);
      return { board: r(document.querySelector('[data-testid="board-view"]')), tray: r(tray), cube: r(document.querySelector('[data-testid="board-cube-slot"]')), slabs };
    });
    const name = `${style}-${c.id}`;
    await page.screenshot({ path: `${OUT}/${name}-full.png` });
    if (info.board) await page.screenshot({ path: `${OUT}/${name}-board.png`, clip: { x: info.board.x, y: info.board.y, width: info.board.w, height: info.board.h } });
    console.log(name, 'tray', JSON.stringify(info.tray), 'cube', JSON.stringify(info.cube), 'slabs', info.slabs.length, 'thick', info.slabs[0]?.h ?? 0, 'board', JSON.stringify(info.board));
    metrics.push({ name, ...info });
  }
  await ctx.close();
}
fs.writeFileSync(`${OUT}/metrics.json`, JSON.stringify(metrics, null, 1));
await browser.close();
