import { webkit, devices } from '/workspace/qa-clips/safari-textsize/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/workspace/qa-clips/pr-389/ea01515';
const PREVIEW = 'https://backgammon-mastermind-6zpgwncz4-softwarebyzes-projects.vercel.app';
const PROD = 'https://backgammon-mastermind.vercel.app';
const SHA = 'ea01515';

const SHARE = {};
for (const line of fs.readFileSync('/workspace/qa-clips/bearoff-baseline/share-urls.txt', 'utf8').trim().split('\n')) {
  const i = line.indexOf(' ');
  SHARE[line.slice(0, i)] = line.slice(i + 1).replace(PROD, '').replace(/^/, ''); // keep path+query via URL
}
// store path+query
for (const [id, full] of Object.entries(SHARE)) {
  const u = new URL(full.startsWith('http') ? full : PROD + (full.startsWith('/') ? full : '/'));
  // rewrite: original lines are full prod URLs
}
// re-parse properly
const shareById = {};
for (const line of fs.readFileSync('/workspace/qa-clips/bearoff-baseline/share-urls.txt', 'utf8').trim().split('\n')) {
  const i = line.indexOf(' ');
  const id = line.slice(0, i);
  const u = new URL(line.slice(i + 1));
  shareById[id] = u.pathname + u.search;
}

const BASELINE_SIZES = [
  { id: 'iphone-portrait', profile: 'iPhone 16 Pro', viewport: { width: 402, height: 874 } },
  { id: 'iphone-landscape', profile: 'iPhone 16 Pro', viewport: { width: 852, height: 393 } },
  { id: 'ipad-portrait', profile: 'iPad Pro 11', viewport: { width: 820, height: 1180 } },
  { id: 'ipad-landscape', profile: 'iPad Pro 11', viewport: { width: 1180, height: 820 } },
];
const PLAN_SIZES = [
  { id: 'iphone-390x844', profile: 'iPhone 16 Pro', viewport: { width: 390, height: 844 } },
  { id: 'iphone-402x681', profile: 'iPhone 16 Pro', viewport: { width: 402, height: 681 } },
  { id: 'iphone-844x390', profile: 'iPhone 16 Pro', viewport: { width: 844, height: 390 } },
  { id: 'ipad-1024x1366', profile: 'iPad Pro 11', viewport: { width: 1024, height: 1366 } },
];

function emptyPoints() {
  return Array.from({ length: 25 }, () => ({ player: null, count: 0 }));
}
function distribute(points, player, homes, count) {
  if (count <= 0) return;
  const n = homes.length;
  const base = Math.floor(count / n);
  let rem = count - base * n;
  for (const point of homes) {
    const c = base + (rem > 0 ? 1 : 0);
    if (rem > 0) rem--;
    if (c > 0) points[point] = { player, count: c };
  }
}
function makePosition({ whiteOff, blackOff, dice = [0, 0], cubeOwner = null, cubeExponent = 0, placements = null }) {
  const points = placements || emptyPoints();
  if (!placements) {
    distribute(points, 'white', [1, 2, 3, 4, 5, 6], 15 - whiteOff);
    distribute(points, 'black', [24, 23, 22, 21, 20, 19], 15 - blackOff);
  }
  return {
    version: 1,
    points,
    bar: { white: 0, black: 0 },
    borneOff: { white: whiteOff, black: blackOff },
    currentPlayer: 'white',
    dice,
    context: {
      cubeExponent,
      cubeOwner,
      turnOwner: 'white',
      matchLength: 0,
      scores: { white: 0, black: 0 },
      crawford: false,
      jacoby: false,
      beavers: false,
      maxCube: 10,
      gameState: 1,
      resignation: 0,
      doubleAction: '',
    },
  };
}
function positionUrl(origin, position) {
  return `${origin}/position?data=${encodeURIComponent(JSON.stringify(position))}`;
}

const logLines = [];
function log(...a) {
  const line = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
  console.log(line);
  logLines.push(line);
}

const findings = { pass: [], fail: [], notes: [] };
function fail(id, msg) { findings.fail.push({ id, msg }); log('FAIL', id, msg); }
function pass(id, msg) { findings.pass.push({ id, msg }); log('PASS', id, msg); }
function note(msg) { findings.notes.push(msg); log('NOTE', msg); }

async function dismissChrome(page) {
  for (const t of [/Hide/i, /Not now/i, /Dismiss/i, /Got it/i, /Close/i, /Accept/i]) {
    const el = page.getByText(t).first();
    if (await el.count()) {
      try { await el.click({ timeout: 700 }); await page.waitForTimeout(200); } catch {}
    }
  }
}

function prefsScript(extra = {}) {
  const prefs = {
    showMoveHints: true,
    showDirectionOverlay: false,
    showPointNumbers: true,
    diceDisplayStyle: 'numeric',
    autoRoll: false,
    autoMoveWhenForced: false,
    soundEnabled: false,
    tutorMode: false,
    moveInDiceOrder: false,
    confirmMove: false,
    computerLevel: 'easy',
    ...extra.prefs,
  };
  const lang = extra.lang || 'en';
  return () => {
    try {
      localStorage.setItem('mmkv.default\\GAME_PREFERENCES', JSON.stringify(prefs));
      localStorage.setItem('mmkv.default\\local', lang);
    } catch {}
  };
}

async function inspectTray(page) {
  return page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1) };
    };
    const tray = document.querySelector('[aria-label="Bear off"]')
      || [...document.querySelectorAll('[aria-label]')].find((e) => /bear off|מש|atrás|malen|Porta fuori|Taş topla|빼내기/i.test(e.getAttribute('aria-label') || ''));
    // Hebrew etc — also take the tall thin column of slabs if needed
    const board = document.querySelector('[data-testid="board-view"]') || document.querySelector('[data-testid="board-playing-surface"]');
    const cube = document.querySelector('[data-testid="board-cube-slot"]');
    const trayBox = box(tray);
    const slabs = [...document.querySelectorAll('[data-testid="bear-off-slab"]')].map((el) => {
      const r = el.getBoundingClientRect();
      const side = trayBox ? (r.top + r.height / 2 < trayBox.y + trayBox.h / 2 ? 'black' : 'white') : 'unknown';
      return { ...box(el), side, thickness: +r.height.toFixed(1) };
    });
    const empties = [...document.querySelectorAll('[data-testid="bear-off-empty-slot"]')].map((el) => {
      const r = el.getBoundingClientRect();
      const side = trayBox ? (r.top + r.height / 2 < trayBox.y + trayBox.h / 2 ? 'black' : 'white') : 'unknown';
      return { ...box(el), side };
    });
    const overflow = [];
    if (tray) {
      const seen = new Set();
      for (const el of tray.querySelectorAll('*')) {
        const raw = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
        if (/^\+\d+$/.test(raw)) {
          const r = el.getBoundingClientRect();
          const k = `${raw}@${r.top.toFixed(0)}`;
          if (!seen.has(k)) {
            seen.add(k);
            overflow.push({ text: raw, fontSize: getComputedStyle(el).fontSize, side: trayBox ? (r.top + r.height / 2 < trayBox.y + trayBox.h / 2 ? 'black' : 'white') : 'unknown' });
          }
        }
      }
    }
    const cubeBox = box(cube);
    const overlapsCube = [];
    if (cubeBox) {
      for (const tok of slabs) {
        const ox = Math.min(tok.right, cubeBox.right) - Math.max(tok.left, cubeBox.left);
        const oy = Math.min(tok.bottom, cubeBox.bottom) - Math.max(tok.top, cubeBox.top);
        if (ox > 0.5 && oy > 0.5) overlapsCube.push({ side: tok.side, ox: +ox.toFixed(1), oy: +oy.toFixed(1), tok });
      }
    }
    const bySide = (side) => slabs.filter((s) => s.side === side).sort((a, b) => a.top - b.top);
    const spacing = (side) => {
      const arr = bySide(side);
      if (arr.length < 2) return { count: arr.length, steps: [], even: true, span: 0 };
      const steps = [];
      for (let i = 1; i < arr.length; i++) steps.push(+(arr[i].top - arr[i - 1].top).toFixed(2));
      const mean = steps.reduce((a, b) => a + b, 0) / steps.length;
      const even = steps.every((s) => Math.abs(s - mean) <= 1.5);
      const first = arr[0];
      const last = arr[arr.length - 1];
      return { count: arr.length, steps, mean: +mean.toFixed(2), even, firstTop: first.top, lastBottom: last.bottom, span: +(last.bottom - first.top).toFixed(1), thickness: first.thickness };
    };
    const trayStyle = tray ? getComputedStyle(tray) : null;
    const greenBorder = tray ? (getComputedStyle(tray).borderTopColor || '') + ' ' + (getComputedStyle(tray).borderWidth || '') : '';
    // RNW may put border on inner half, not the pressable
    const greenKids = tray ? [...tray.querySelectorAll('*')].filter((el) => {
      const s = getComputedStyle(el);
      return s.borderTopWidth && parseFloat(s.borderTopWidth) >= 2 && /74|76|116|4CAF50|75, 175|76, 175/i.test(s.borderTopColor);
    }).map((el) => ({ border: getComputedStyle(el).borderTopColor, w: getComputedStyle(el).borderTopWidth, box: box(el) })) : [];
    return {
      viewport: { w: window.innerWidth, h: window.innerHeight },
      url: location.href,
      dir: document.documentElement.getAttribute('dir') || document.documentElement.dir || getComputedStyle(document.documentElement).direction,
      lang: document.documentElement.lang,
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 900),
      trayBox,
      boardBox: box(board),
      cubeBox,
      overflow,
      slabs,
      empties,
      white: spacing('white'),
      black: spacing('black'),
      whiteCount: slabs.filter((s) => s.side === 'white').length,
      blackCount: slabs.filter((s) => s.side === 'black').length,
      overlapsCube,
      greenKids,
      greenBorder,
      flights: [...document.querySelectorAll('[data-testid^="checker-flight"]')].map((el) => box(el)),
    };
  });
}

function padClip(box, pad, vw, vh) {
  if (!box) return null;
  const x = Math.max(0, Math.floor(box.x - pad));
  const y = Math.max(0, Math.floor(box.y - pad));
  const right = Math.min(vw, Math.ceil(box.x + box.w + pad));
  const bottom = Math.min(vh, Math.ceil(box.y + box.h + pad));
  const w = right - x, h = bottom - y;
  if (w < 4 || h < 4) return null;
  return { x, y, width: w, height: h };
}

async function shot(page, name, clip) {
  const fp = path.join(OUT, name);
  const opts = { path: fp, fullPage: false, type: 'png' };
  if (clip) opts.clip = clip;
  await page.screenshot(opts);
  log('SHOT', name, fs.statSync(fp).size);
  return fp;
}

async function shotsForInspect(page, prefix, info, size) {
  const vw = size.viewport.width, vh = size.viewport.height;
  await shot(page, `${prefix}-full.png`);
  const boardClip = padClip(info.boardBox, 8, vw, vh);
  if (boardClip) await shot(page, `${prefix}-board.png`, boardClip);
  const trayClip = padClip(info.trayBox, 6, vw, vh);
  if (trayClip) await shot(page, `${prefix}-tray.png`, trayClip);
}

async function newContext(browser, size, extra = {}) {
  const device = devices[size.profile];
  const context = await browser.newContext({ ...device, viewport: size.viewport });
  await context.route(/posthog/i, (route) => route.abort());
  await context.addInitScript(prefsScript(extra));
  const page = await context.newPage();
  page.on('pageerror', (e) => {
    const m = String(e.message);
    if (/posthog|access control checks/i.test(m)) return;
    log('PAGEERROR', m.slice(0, 240));
  });
  return { context, page };
}

async function loadShare(page, origin, caseId, { play }) {
  const pathq = shareById[caseId];
  if (!pathq) throw new Error('unknown share ' + caseId);
  const url = origin + pathq;
  log('goto', caseId, origin, play ? 'play' : 'editor');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1600);
  await dismissChrome(page);
  await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(300);
  let played = false, playDisabled = false;
  const playBtn = page.getByTestId('position-play');
  if (await playBtn.count()) {
    playDisabled = await playBtn.isDisabled().catch(() => false);
  }
  if (play && !playDisabled) {
    const human = page.getByTestId('position-mode-human');
    if (await human.count()) {
      try { await human.click({ timeout: 2500 }); await page.waitForTimeout(200); } catch {}
    }
    await playBtn.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    const confirm = page.getByTestId('confirm-dialog-confirm');
    if (await confirm.count()) {
      try { await confirm.click({ timeout: 2000 }); } catch {}
    }
    try {
      await page.getByTestId('point-1').or(page.getByTestId('point-24')).first().waitFor({ state: 'visible', timeout: 15000 });
      played = true;
    } catch { log('play failed to show points'); }
    await page.waitForTimeout(700);
  }
  return { url, played, playDisabled };
}

async function loadPosition(page, origin, position, { play }) {
  const url = positionUrl(origin, position);
  log('goto custom', url.slice(0, 80), play ? 'play' : 'editor');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1600);
  await dismissChrome(page);
  await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 20000 });
  await page.waitForTimeout(300);
  let played = false, playDisabled = false;
  const playBtn = page.getByTestId('position-play');
  if (await playBtn.count()) {
    playDisabled = await playBtn.isDisabled().catch(() => false);
  }
  if (play && !playDisabled) {
    const human = page.getByTestId('position-mode-human');
    if (await human.count()) {
      try { await human.click({ timeout: 2500 }); await page.waitForTimeout(200); } catch {}
    }
    await playBtn.click({ timeout: 5000 });
    await page.waitForTimeout(500);
    const confirm = page.getByTestId('confirm-dialog-confirm');
    if (await confirm.count()) {
      try { await confirm.click({ timeout: 2000 }); } catch {}
    }
    try {
      await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 15000 });
      played = true;
    } catch {}
    await page.waitForTimeout(700);
  }
  return { url, played, playDisabled };
}

function evalStack(tag, info, expectedWhite, expectedBlack) {
  const id = tag;
  if (info.overflow.length) fail(id + '.overflow', `unexpected +N: ${JSON.stringify(info.overflow)}`);
  else pass(id + '.overflow', 'no +N');
  if (info.whiteCount !== expectedWhite) fail(id + '.whiteCount', `visible ${info.whiteCount} expected ${expectedWhite}`);
  else pass(id + '.whiteCount', `${info.whiteCount} visible`);
  if (info.blackCount !== expectedBlack) fail(id + '.blackCount', `visible ${info.blackCount} expected ${expectedBlack}`);
  else pass(id + '.blackCount', `${info.blackCount} visible`);
  if (expectedWhite >= 2) {
    if (!info.white.even) fail(id + '.whiteEven', `uneven steps ${info.white.steps}`);
    else pass(id + '.whiteEven', `even step ${info.white.mean}px, span ${info.white.span}`);
  }
  if (expectedBlack >= 2) {
    if (!info.black.even) fail(id + '.blackEven', `uneven steps ${info.black.steps}`);
    else pass(id + '.blackEven', `even step ${info.black.mean}px, span ${info.black.span}`);
  }
  if (info.overlapsCube.length) fail(id + '.cube', `cube covers checker: ${JSON.stringify(info.overlapsCube)}`);
  else pass(id + '.cube', 'cube does not cover a checker');
  if (expectedWhite === 0) {
    const emptyW = info.empties.filter((e) => e.side === 'white');
    if (!emptyW.length) fail(id + '.empty', 'no empty placeholder on white');
    else {
      // outer edge for white = near bottom of tray half
      const e = emptyW[0];
      const mid = info.trayBox.y + info.trayBox.h / 2;
      const inLower = e.top > mid;
      const distBottom = info.trayBox.bottom - e.bottom;
      if (!inLower) fail(id + '.emptyPos', `empty slot not in white (lower) half: ${JSON.stringify(e)}`);
      else pass(id + '.emptyPos', `empty placeholder in lower half, ${distBottom.toFixed(1)}px from tray bottom`);
    }
  }
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const metrics = {};
  const browser = await webkit.launch({ headless: true });

  // --- Baseline share links on preview, plus prod dimension compare ---
  for (const size of BASELINE_SIZES) {
    const { context, page } = await newContext(browser, size);
    try {
      // prod measure on w7-b7
      const prodLoad = await loadShare(page, PROD, 'w7-b7', { play: true });
      const prodInfo = await inspectTray(page);
      metrics[`${size.id}-prod-w7`] = { load: prodLoad, board: prodInfo.boardBox, tray: prodInfo.trayBox };

      for (const c of [
        { id: 'w0-b7', play: true, w: 0, b: 7 },
        { id: 'w7-b7', play: true, w: 7, b: 7 },
        { id: 'w14-b7', play: true, w: 14, b: 7 },
        { id: 'w15-b7', play: false, w: 15, b: 7 },
      ]) {
        const load = await loadShare(page, PREVIEW, c.id, { play: c.play });
        const info = await inspectTray(page);
        const prefix = `after-${size.id}-${c.id}`;
        await shotsForInspect(page, prefix, info, size);
        evalStack(`${size.id}-${c.id}`, info, c.w, c.b);
        if (c.id === 'w7-b7') {
          const pb = prodInfo.boardBox, pt = prodInfo.trayBox;
          const ab = info.boardBox, at = info.trayBox;
          const boardWok = pb && ab && Math.abs(pb.w - ab.w) <= 1 && Math.abs(pb.h - ab.h) <= 1;
          const trayWok = pt && at && Math.abs(pt.w - at.w) <= 1;
          if (boardWok) pass(`${size.id}.boardSize`, `board ${ab.w}x${ab.h} matches prod ${pb.w}x${pb.h}`);
          else fail(`${size.id}.boardSize`, `preview board ${JSON.stringify(ab)} vs prod ${JSON.stringify(pb)}`);
          if (trayWok) pass(`${size.id}.trayWidth`, `tray width ${at.w} matches prod ${pt.w}`);
          else fail(`${size.id}.trayWidth`, `preview tray ${JSON.stringify(at)} vs prod ${JSON.stringify(pt)}`);
        }
        if (c.id === 'w15-b7' && !load.playDisabled) fail(`${size.id}-w15.playDisabled`, 'Play should be disabled at 15 off');
        metrics[`${size.id}-${c.id}`] = { load, info: { white: info.white, black: info.black, whiteCount: info.whiteCount, blackCount: info.blackCount, overflow: info.overflow, trayBox: info.trayBox, boardBox: info.boardBox, cubeBox: info.cubeBox, overlapsCube: info.overlapsCube, empties: info.empties } };
      }
    } finally {
      await context.close();
    }
  }

  // --- PR plan sizes: 1, 5, 10, 15 each side ---
  for (const size of PLAN_SIZES) {
    const { context, page } = await newContext(browser, size);
    try {
      const cases = [
        { id: 'w1-b1', w: 1, b: 1, play: true },
        { id: 'w5-b5', w: 5, b: 5, play: true },
        { id: 'w10-b10', w: 10, b: 10, play: true },
        { id: 'w15-b5', w: 15, b: 5, play: false },
        { id: 'w5-b15', w: 5, b: 15, play: false },
      ];
      for (const c of cases) {
        const pos = makePosition({ whiteOff: c.w, blackOff: c.b });
        await loadPosition(page, PREVIEW, pos, { play: c.play });
        const info = await inspectTray(page);
        const prefix = `plan-${size.id}-${c.id}`;
        await shotsForInspect(page, prefix, info, size);
        evalStack(`${size.id}-${c.id}`, info, c.w, c.b);
        metrics[prefix] = { white: info.white, black: info.black, whiteCount: info.whiteCount, blackCount: info.blackCount, overflow: info.overflow, tray: info.trayBox };
      }
    } finally {
      await context.close();
    }
  }

  // --- Cube owned corners + centered already covered ---
  {
    const size = BASELINE_SIZES[0];
    const { context, page } = await newContext(browser, size);
    try {
      for (const owner of ['white', 'black']) {
        const pos = makePosition({ whiteOff: 7, blackOff: 7, cubeOwner: owner, cubeExponent: 1 });
        await loadPosition(page, PREVIEW, pos, { play: true });
        const info = await inspectTray(page);
        const prefix = `cube-owned-${owner}`;
        await shotsForInspect(page, prefix, info, size);
        if (info.overlapsCube.length) fail(`cubeOwned.${owner}`, `cube covers checker ${JSON.stringify(info.overlapsCube)}`);
        else pass(`cubeOwned.${owner}`, `owned-corner cube (${owner}) does not cover a checker; cube ${JSON.stringify(info.cubeBox)}`);
        evalStack(`cubeOwned-${owner}`, info, 7, 7);
        metrics[prefix] = { cube: info.cubeBox, overlaps: info.overlapsCube, white: info.white, black: info.black };
      }
    } finally {
      await context.close();
    }
  }

  // --- Legal target highlight + bear-off animation ---
  {
    const size = BASELINE_SIZES[0];
    const { context, page } = await newContext(browser, size, { prefs: { confirmMove: true, autoMoveWhenForced: false, showMoveHints: true } });
    try {
      // 7 off already, 1 on point 1, 7 on point 6; dice 1-3 so 1 bears off
      const points = emptyPoints();
      points[1] = { player: 'white', count: 1 };
      points[6] = { player: 'white', count: 7 };
      distribute(points, 'black', [24, 23, 22, 21, 20, 19], 8);
      const pos = makePosition({ whiteOff: 7, blackOff: 7, dice: [1, 3], placements: points });
      await loadPosition(page, PREVIEW, pos, { play: true });
      let info = await inspectTray(page);
      await shotsForInspect(page, 'anim-before', info, size);
      const beforeWhite = info.whiteCount;
      // select point 1 for legal-target highlight
      await page.getByTestId('point-1').tap({ timeout: 5000 });
      await page.waitForTimeout(600);
      info = await inspectTray(page);
      await shot(page, 'legal-target-after-select.png');
      const trayClip = padClip(info.trayBox, 8, size.viewport.width, size.viewport.height);
      if (trayClip) await shot(page, 'legal-target-tray.png', trayClip);
      if (info.greenKids.length) pass('legalTarget', `green tray highlight after selecting point 1: ${JSON.stringify(info.greenKids[0])}`);
      else fail('legalTarget', `no green border on tray after selecting point 1. border=${info.greenBorder} body=${info.bodyText.slice(0, 200)}`);
      metrics.legalTarget = { greenKids: info.greenKids, greenBorder: info.greenBorder, white: info.whiteCount };

      // complete the bear-off by tapping the tray
      const tray = page.getByRole('button', { name: /Bear off/i }).first();
      const flightPromise = page.locator('[data-testid^="checker-flight"]').first().waitFor({ state: 'visible', timeout: 4000 }).catch(() => null);
      await tray.click({ timeout: 5000 }).catch(async () => {
        // fallback: click tray box
        if (info.trayBox) {
          await page.mouse.click(info.trayBox.x + info.trayBox.w / 2, info.trayBox.y + info.trayBox.h * 0.75);
        }
      });
      const flightEl = await flightPromise;
      if (flightEl) {
        await shot(page, 'anim-flight.png');
        pass('animation.flight', 'checker-flight element appeared');
      } else {
        note('animation.flight: no checker-flight testid seen (may have been too fast)');
      }
      await page.waitForTimeout(1800);
      info = await inspectTray(page);
      await shotsForInspect(page, 'anim-after', info, size);
      if (info.whiteCount === beforeWhite + 1) pass('animation.land', `white stack grew ${beforeWhite} → ${info.whiteCount}, even=${info.white.even} span=${info.white.span}`);
      else fail('animation.land', `expected white ${beforeWhite + 1} after bear-off, got ${info.whiteCount}. body=${info.bodyText.slice(0, 240)}`);
      if (info.overflow.length) fail('animation.overflow', JSON.stringify(info.overflow));
      metrics.animation = { beforeWhite, afterWhite: info.whiteCount, white: info.white, flightsEnd: info.flights };
    } finally {
      await context.close();
    }
  }

  // --- RTL Hebrew ---
  {
    const size = BASELINE_SIZES[0];
    const { context, page } = await newContext(browser, size, { lang: 'he' });
    try {
      await loadShare(page, PREVIEW, 'w7-b7', { play: true });
      const info = await inspectTray(page);
      await shotsForInspect(page, 'rtl-he-w7-b7', info, size);
      if (info.dir === 'rtl' || info.lang === 'he') pass('rtl.dir', `dir=${info.dir} lang=${info.lang}`);
      else fail('rtl.dir', `expected rtl/he, got dir=${info.dir} lang=${info.lang}`);
      evalStack('rtl-w7-b7', info, 7, 7);
      metrics.rtl = { dir: info.dir, lang: info.lang, tray: info.trayBox, white: info.white, black: info.black };
    } finally {
      await context.close();
    }
  }

  // --- Learn lessons that show a bear-off tray ---
  {
    const size = BASELINE_SIZES[0];
    const { context, page } = await newContext(browser, size);
    try {
      for (const lesson of ['bearing-off', 'pip-count']) {
        await page.goto(`${PREVIEW}/learn/${lesson}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(1800);
        await dismissChrome(page);
        // start / continue if needed
        for (const label of [/Start/i, /Continue/i, /התחל/, /Begin/i, /Play/i]) {
          const b = page.getByText(label).first();
          if (await b.count()) {
            try { await b.click({ timeout: 1500 }); await page.waitForTimeout(800); } catch {}
          }
        }
        const info = await inspectTray(page);
        const prefix = `learn-${lesson}`;
        await shot(page, `${prefix}-full.png`);
        if (info.boardBox) {
          const boardClip = padClip(info.boardBox, 8, size.viewport.width, size.viewport.height);
          if (boardClip) await shot(page, `${prefix}-board.png`, boardClip);
        }
        if (info.trayBox) {
          const trayClip = padClip(info.trayBox, 6, size.viewport.width, size.viewport.height);
          if (trayClip) await shot(page, `${prefix}-tray.png`, trayClip);
        }
        const hasTray = !!info.trayBox || info.whiteCount + info.blackCount > 0;
        if (hasTray) {
          if (info.overflow.length) fail(`learn.${lesson}.overflow`, JSON.stringify(info.overflow));
          else pass(`learn.${lesson}`, `tray visible, white=${info.whiteCount} black=${info.blackCount} evenW=${info.white.even} evenB=${info.black.even}`);
        } else {
          note(`learn.${lesson}: no tray on first screen (body=${info.bodyText.slice(0, 180)})`);
        }
        metrics[prefix] = { url: page.url(), hasTray, white: info.whiteCount, black: info.blackCount, overflow: info.overflow, body: info.bodyText.slice(0, 300) };
      }
    } finally {
      await context.close();
    }
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify({ sha: SHA, preview: PREVIEW, findings, metrics }, null, 2));
  fs.writeFileSync(path.join(OUT, 'qa.log'), logLines.join('\n') + '\n');
  log('SUMMARY pass', findings.pass.length, 'fail', findings.fail.length);
  for (const f of findings.fail) log('  FAIL', f.id, f.msg);
}

main().catch((err) => { console.error(err); process.exit(1); });
