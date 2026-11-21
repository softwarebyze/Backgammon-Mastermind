import { chromium, devices } from '/workspace/pw/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/workspace/qa-clips/pr-389/9e36ee4';
const PREVIEW = 'https://backgammon-mastermind-1pxvx4vzs-softwarebyzes-projects.vercel.app';
const PROD = 'https://backgammon-mastermind.vercel.app';
const SHA = '9e36ee4';

fs.mkdirSync(OUT, { recursive: true });

const WHITE_FILL = 'rgb(242, 234, 211)'; // #F2EAD3
const WHITE_SEP = 'rgb(176, 148, 104)'; // #B09468
const WHITE_RIM = 'rgb(255, 250, 240)'; // #FFFAF0
const BLACK_FILL = 'rgb(48, 48, 90)'; // #30305A
const BLACK_RIM = 'rgb(80, 80, 160)'; // #5050A0
const BLACK_SEP = 'rgb(16, 16, 28)'; // #10101C

const FOCUS_SIZES = [
  { id: 'iphone-portrait', profile: 'iPhone 16 Pro', viewport: { width: 402, height: 874 }, dpr: 3 },
  { id: 'iphone-landscape', profile: 'iPhone 16 Pro', viewport: { width: 874, height: 402 }, dpr: 3 },
  { id: 'ipad-portrait', profile: 'iPad Pro 11', viewport: { width: 1032, height: 1376 }, dpr: 2 },
  { id: 'ipad-landscape', profile: 'iPad Pro 11', viewport: { width: 1376, height: 1032 }, dpr: 2 },
  { id: 'desktop', profile: null, viewport: { width: 1440, height: 900 }, dpr: 1 },
];

const COMPARE_SIZES = [
  { id: 'iphone-portrait-402x874', profile: 'iPhone 16 Pro', viewport: { width: 402, height: 874 }, dpr: 3 },
  { id: 'iphone-landscape-852x393', profile: 'iPhone 16 Pro', viewport: { width: 852, height: 393 }, dpr: 3 },
  { id: 'iphone-landscape-874x402', profile: 'iPhone 16 Pro', viewport: { width: 874, height: 402 }, dpr: 3 },
  { id: 'ipad-portrait-820x1180', profile: 'iPad Pro 11', viewport: { width: 820, height: 1180 }, dpr: 2 },
  { id: 'ipad-portrait-1032x1376', profile: 'iPad Pro 11', viewport: { width: 1032, height: 1376 }, dpr: 2 },
  { id: 'ipad-landscape-1180x820', profile: 'iPad Pro 11', viewport: { width: 1180, height: 820 }, dpr: 2 },
  { id: 'ipad-landscape-1376x1032', profile: 'iPad Pro 11', viewport: { width: 1376, height: 1032 }, dpr: 2 },
  { id: 'desktop-1440x900', profile: null, viewport: { width: 1440, height: 900 }, dpr: 1 },
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

const official = {};
for (const line of fs.readFileSync(path.join(OUT, 'share-urls-upstream.txt'), 'utf8').split('\n')) {
  const m = line.match(/^(w[\w-]+)\s+(https?:\/\/\S+)/);
  if (m) official[m[1]] = m[2];
}

const CASES = [
  { id: 'w0-b0', whiteOff: 0, blackOff: 0, play: true },
  { id: 'w0-b7', whiteOff: 0, blackOff: 7, play: true },
  { id: 'w1-b1', whiteOff: 1, blackOff: 1, play: true, official: 'w1-b1' },
  { id: 'w7-b7', whiteOff: 7, blackOff: 7, play: true, official: 'w7-b7' },
  { id: 'w15-b15', whiteOff: 15, blackOff: 15, play: false, official: 'w15-b15' },
];

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

async function inspectTray(page) {
  return page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return {
        x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1),
        left: +r.left.toFixed(1), right: +r.right.toFixed(1), top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1),
      };
    };
    const tray = document.querySelector('[aria-label="Bear off"]')
      || [...document.querySelectorAll('[aria-label]')].find((e) =>
        /bear off|מש|atrás|malen|Porta fuori|Taş topla|빼내기|إخراج/i.test(e.getAttribute('aria-label') || ''));
    const board = document.querySelector('[data-testid="board-view"]') || document.querySelector('[data-testid="board-playing-surface"]');
    const cube = document.querySelector('[data-testid="board-cube-slot"]')
      || document.querySelector('[data-testid="doubling-cube"]')
      || [...document.querySelectorAll('[data-testid]')].find((e) => /cube/i.test(e.getAttribute('data-testid') || ''));
    const trayBox = box(tray);
    const midY = trayBox ? trayBox.y + trayBox.h / 2 : 0;
    const colorOf = (el) => {
      const s = getComputedStyle(el);
      return { fill: s.backgroundColor, rim: s.borderTopColor, separator: s.borderBottomColor, borderTopW: s.borderTopWidth, borderBottomW: s.borderBottomWidth, radius: s.borderRadius };
    };
    const slabs = [...document.querySelectorAll('[data-testid="bear-off-slab"]')].map((el) => {
      const r = el.getBoundingClientRect();
      const side = trayBox ? (r.top + r.height / 2 < midY ? 'black' : 'white') : 'unknown';
      return { ...box(el), side, thickness: +r.height.toFixed(2), colors: colorOf(el) };
    });
    const empties = [...document.querySelectorAll('[data-testid="bear-off-empty-slot"]')].map((el) => {
      const r = el.getBoundingClientRect();
      const side = trayBox ? (r.top + r.height / 2 < midY ? 'black' : 'white') : 'unknown';
      const s = getComputedStyle(el);
      return { ...box(el), side, borderStyle: s.borderStyle, borderColor: s.borderColor };
    });
    const overflow = [];
    const root = tray || document.body;
    const seen = new Set();
    for (const el of root.querySelectorAll('*')) {
      const raw = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim();
      if (/^\+\d+$/.test(raw)) {
        const r = el.getBoundingClientRect();
        const k = `${raw}@${r.top.toFixed(0)}`;
        if (!seen.has(k)) {
          seen.add(k);
          overflow.push({ text: raw, fontSize: getComputedStyle(el).fontSize, side: trayBox ? (r.top + r.height / 2 < midY ? 'black' : 'white') : 'unknown' });
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
    const analyze = (side) => {
      const arr = bySide(side);
      if (!arr.length) return { count: 0, groups: [], thickness: 0, uniform: true };
      const thicknesses = arr.map((s) => s.thickness);
      const thick = thicknesses[0];
      const uniform = thicknesses.every((t) => Math.abs(t - thick) <= 0.6);
      const groups = [[arr[0]]];
      const gaps = [];
      for (let i = 1; i < arr.length; i++) {
        const gap = +(arr[i].top - arr[i - 1].bottom).toFixed(2);
        gaps.push(gap);
        if (gap > 1.2) groups.push([arr[i]]);
        else groups[groups.length - 1].push(arr[i]);
      }
      const groupSizes = groups.map((g) => g.length);
      const expectedGroups = Math.ceil(arr.length / 5);
      const groupsOk = groupSizes.length === expectedGroups && groupSizes.every((n, i) => (i < expectedGroups - 1 ? n === 5 : n === ((arr.length - 1) % 5) + 1 || n === 5));
      const first = arr[0];
      const last = arr[arr.length - 1];
      return {
        count: arr.length,
        thickness: thick,
        uniform,
        gaps,
        groupSizes,
        expectedGroups,
        groupsOk,
        firstTop: first.top,
        lastBottom: last.bottom,
        span: +(last.bottom - first.top).toFixed(1),
        colors: first.colors,
        left: first.left,
        width: first.w,
        nearWhole: arr.every((s) => Math.abs(s.y - Math.round(s.y)) <= 0.6 && Math.abs(s.h - Math.round(s.h)) <= 0.6 || s.h < 4),
      };
    };
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
      white: analyze('white'),
      black: analyze('black'),
      whiteCount: slabs.filter((s) => s.side === 'white').length,
      blackCount: slabs.filter((s) => s.side === 'black').length,
      overlapsCube,
      flights: [...document.querySelectorAll('[data-testid^="checker-flight"]')].map((el) => ({ testid: el.getAttribute('data-testid'), ...box(el) })),
    };
  });
}

function judgeStack(info, side, expected, trayBox) {
  const st = info[side];
  const issues = [];
  if (st.count !== expected) issues.push(`count ${st.count} != ${expected}`);
  if (expected > 0 && !st.uniform) issues.push(`thickness not uniform ${JSON.stringify(info.slabs.filter((s) => s.side === side).map((s) => s.thickness))}`);
  if (expected > 0 && !st.groupsOk) issues.push(`groups ${JSON.stringify(st.groupSizes)} expected groups-of-five ending with remainder`);
  if (info.overflow.length) issues.push(`overflow ${JSON.stringify(info.overflow)}`);
  if (trayBox && expected > 0) {
    const mid = trayBox.x + trayBox.w / 2;
    const slabMid = st.left + st.width / 2;
    if (Math.abs(slabMid - mid) > 3) issues.push(`slab not centred in tray (slabMid=${slabMid.toFixed?.(1) ?? slabMid} trayMid=${mid.toFixed(1)})`);
    // stacked from the outer edge
    if (side === 'black') {
      const inset = st.firstTop - trayBox.top;
      if (inset > 80) issues.push(`black stack not at outer (top) edge, inset=${inset.toFixed(1)}`);
    } else {
      const inset = trayBox.bottom - st.lastBottom;
      if (inset > 80) issues.push(`white stack not at outer (bottom) edge, inset=${inset.toFixed(1)}`);
    }
  }
  return issues;
}

function colorClose(a, b) {
  const pa = (a || '').match(/\d+/g);
  const pb = (b || '').match(/\d+/g);
  if (!pa || !pb || pa.length < 3 || pb.length < 3) return false;
  return Math.abs(+pa[0] - +pb[0]) <= 8 && Math.abs(+pa[1] - +pb[1]) <= 8 && Math.abs(+pa[2] - +pb[2]) <= 8;
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
  const trayClip = padClip(info.trayBox, 8, vw, vh);
  if (trayClip) await shot(page, `${prefix}-tray.png`, trayClip);
}

async function newContext(browser, size, extra = {}) {
  const device = size.profile ? devices[size.profile] : {};
  const context = await browser.newContext({
    ...device,
    viewport: size.viewport,
    deviceScaleFactor: size.dpr || device.deviceScaleFactor || 1,
  });
  await context.route(/posthog/i, (route) => route.abort());
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
    ...(extra.prefs || {}),
  };
  const lang = extra.lang || 'en';
  await context.addInitScript(({ prefs, lang }) => {
    try {
      localStorage.setItem('mmkv.default\\GAME_PREFERENCES', JSON.stringify(prefs));
      localStorage.setItem('mmkv.default\\local', lang);
    } catch {}
  }, { prefs, lang });
  const page = await context.newPage();
  page.on('pageerror', (e) => {
    const m = String(e.message);
    if (/posthog|access control checks/i.test(m)) return;
    log('PAGEERROR', m.slice(0, 240));
  });
  return { context, page };
}

async function loadPosition(page, origin, cse, { play }) {
  let url;
  if (cse.official && official[cse.official] && origin === PREVIEW) {
    url = official[cse.official];
  } else {
    url = positionUrl(origin, makePosition({ whiteOff: cse.whiteOff, blackOff: cse.blackOff }));
  }
  log('goto', cse.id, origin, play ? 'play' : 'editor');
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1400);
  await dismissChrome(page);
  await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 25000 });
  await page.waitForTimeout(250);
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
    try {
      await playBtn.click({ timeout: 5000 });
      const confirm = page.getByTestId('confirm-dialog-confirm');
      if (await confirm.count()) { try { await confirm.click({ timeout: 2000 }); } catch {} }
      await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 15000 });
      await page.waitForTimeout(700);
      played = true;
    } catch (e) {
      log('play-failed', String(e).slice(0, 200));
    }
  }
  return { url, played, playDisabled };
}

const metrics = { sha: SHA, preview: PREVIEW, sizes: {}, specials: {} };

async function runCase(browser, size, cse, origin, prefix) {
  const { context, page } = await newContext(browser, size);
  try {
    const load = await loadPosition(page, origin, cse, { play: cse.play });
    const info = await inspectTray(page);
    await shotsForInspect(page, prefix, info, size);
    return { load, info };
  } finally {
    await context.close();
  }
}

async function main() {
  const browser = await chromium.launch({ headless: true });

  // 1) Focus visual cases on preview
  for (const size of FOCUS_SIZES) {
    for (const cse of CASES) {
      const prefix = `after-${size.id}-${cse.id}`;
      log('===', prefix);
      const { load, info } = await runCase(browser, size, cse, PREVIEW, prefix);
      const rec = { size: size.id, viewport: size.viewport, case: cse.id, load, board: info.boardBox, tray: info.trayBox, cube: info.cubeBox, overflow: info.overflow, white: info.white, black: info.black, empties: info.empties, overlapsCube: info.overlapsCube, body: info.bodyText.slice(0, 220) };
      metrics.sizes[prefix] = rec;

      if (!info.trayBox) {
        fail(`${prefix}.tray`, 'no bear-off tray found');
        continue;
      }
      const wi = judgeStack(info, 'white', cse.whiteOff, info.trayBox);
      const bi = judgeStack(info, 'black', cse.blackOff, info.trayBox);
      if (wi.length) fail(`${prefix}.white`, wi.join('; '));
      else pass(`${prefix}.white`, `${info.white.count} slabs, thickness=${info.white.thickness}, groups=${JSON.stringify(info.white.groupSizes)}`);
      if (bi.length) fail(`${prefix}.black`, bi.join('; '));
      else pass(`${prefix}.black`, `${info.black.count} slabs, thickness=${info.black.thickness}, groups=${JSON.stringify(info.black.groupSizes)}`);
      if (info.overflow.length) fail(`${prefix}.plusN`, JSON.stringify(info.overflow));
      else pass(`${prefix}.plusN`, 'no +N');
      if (info.overlapsCube.length) fail(`${prefix}.cube`, JSON.stringify(info.overlapsCube));
      else pass(`${prefix}.cube`, 'slabs clear of cube');

      if (cse.id === 'w0-b0' || cse.id === 'w0-b7') {
        const emptySides = cse.id === 'w0-b0' ? ['white', 'black'] : ['white'];
        for (const side of emptySides) {
          const slot = info.empties.find((e) => e.side === side);
          if (!slot) { fail(`${prefix}.empty.${side}`, 'no dashed placeholder'); continue; }
          const dashed = /dash/i.test(slot.borderStyle || '');
          const outerOk = side === 'black'
            ? (slot.top - info.trayBox.top) < 80
            : (info.trayBox.bottom - slot.bottom) < 80;
          if (!dashed) fail(`${prefix}.empty.${side}`, `borderStyle=${slot.borderStyle}`);
          else if (!outerOk) fail(`${prefix}.empty.${side}`, `not at outer edge ${JSON.stringify(slot)}`);
          else pass(`${prefix}.empty.${side}`, `dashed ${slot.w}x${slot.h} at ${side} outer edge`);
        }
      }

      if (cse.whiteOff >= 1 && info.white.colors) {
        const c = info.white.colors;
        if (colorClose(c.fill, WHITE_FILL) && colorClose(c.separator, WHITE_SEP)) pass(`${prefix}.whiteColor`, `${c.fill} / sep ${c.separator}`);
        else fail(`${prefix}.whiteColor`, JSON.stringify(c));
      }
      if (cse.blackOff >= 1 && info.black.colors) {
        const c = info.black.colors;
        if (colorClose(c.fill, BLACK_FILL) && (colorClose(c.rim, BLACK_RIM) || colorClose(c.separator, BLACK_SEP))) pass(`${prefix}.blackColor`, `${c.fill} / rim ${c.rim}`);
        else fail(`${prefix}.blackColor`, JSON.stringify(c));
      }
    }
  }

  // 2) Production vs preview board/tray size, plus stills for compares
  const sizeCompare = [];
  for (const size of COMPARE_SIZES) {
    const cse = { id: 'w7-b7', whiteOff: 7, blackOff: 7, play: true, official: 'w7-b7' };
    const prod = await runCase(browser, size, { ...cse, official: null }, PROD, `prod-${size.id}-w7-b7`);
    const prev = await runCase(browser, size, cse, PREVIEW, `cmp-${size.id}-w7-b7`);
    const pw = prod.info.boardBox, pb = prev.info.boardBox;
    const tw = prod.info.trayBox, tb = prev.info.trayBox;
    const diffs = [];
    const cmp = (label, a, b, keys) => {
      if (!a || !b) { diffs.push(`${label} missing`); return; }
      for (const k of keys) {
        if (Math.abs((a[k] ?? 0) - (b[k] ?? 0)) > 0.6) diffs.push(`${label}.${k} prod=${a[k]} preview=${b[k]}`);
      }
    };
    cmp('board', pw, pb, ['w', 'h']);
    cmp('tray', tw, tb, ['w', 'h']);
    const rec = { size: size.id, viewport: size.viewport, prodBoard: pw, previewBoard: pb, prodTray: tw, previewTray: tb, diffs };
    sizeCompare.push(rec);
    metrics.sizes[`compare-${size.id}`] = rec;
    if (diffs.length) fail(`size.${size.id}`, diffs.join('; '));
    else pass(`size.${size.id}`, `board ${pb?.w}x${pb?.h} tray ${tb?.w}x${tb?.h} matches production`);

    // also capture production 15-off on iPhone landscape for the before/after Zack asked for
    if (size.id === 'iphone-landscape-874x402' || size.id === 'iphone-portrait-402x874') {
      const cse15 = { id: 'w15-b15', whiteOff: 15, blackOff: 15, play: false, official: 'w15-b15' };
      await runCase(browser, size, { ...cse15, official: null }, PROD, `prod-${size.id}-w15-b15`);
      await runCase(browser, size, cse15, PREVIEW, `cmp-${size.id}-w15-b15`);
    }
  }
  metrics.sizeCompare = sizeCompare;

  // 3) Cube owned positions (15 off that side would crowd the corner more; use 15 + 7 in editor/play)
  {
    const size = FOCUS_SIZES[0];
    for (const { owner, name } of [
      { owner: null, name: 'cube-centered' },
      { owner: 'white', name: 'cube-owned-white' },
      { owner: 'black', name: 'cube-owned-black' },
    ]) {
      const { context, page } = await newContext(browser, size);
      try {
        const pos = makePosition({ whiteOff: 15, blackOff: 15, cubeOwner: owner, cubeExponent: owner ? 1 : 0 });
        // 15/15 stays in editor
        await page.goto(positionUrl(PREVIEW, pos), { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(1400);
        await dismissChrome(page);
        await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 25000 });
        const info = await inspectTray(page);
        await shotsForInspect(page, name, info, size);
        metrics.specials[name] = { cube: info.cubeBox, overlaps: info.overlapsCube, white: info.white, black: info.black };
        if (info.overlapsCube.length) fail(`${name}.overlap`, JSON.stringify(info.overlapsCube));
        else pass(`${name}`, `cube ${JSON.stringify(info.cubeBox)} clear of 15+15 slabs`);
        if (info.whiteCount !== 15 || info.blackCount !== 15) fail(`${name}.count`, `w=${info.whiteCount} b=${info.blackCount}`);
      } finally {
        await context.close();
      }
    }
    // Also owned cube in a live game with 7 off so the cube is definitely in the playing UI
    for (const owner of ['white', 'black']) {
      const name = `cube-live-${owner}`;
      const { context, page } = await newContext(browser, size);
      try {
        const pos = makePosition({ whiteOff: 7, blackOff: 7, cubeOwner: owner, cubeExponent: 1 });
        await page.goto(positionUrl(PREVIEW, pos), { waitUntil: 'domcontentloaded', timeout: 60000 });
        await page.waitForTimeout(1400);
        await dismissChrome(page);
        await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 25000 });
        const human = page.getByTestId('position-mode-human');
        if (await human.count()) { try { await human.click({ timeout: 2000 }); } catch {} }
        const playBtn = page.getByTestId('position-play');
        if (await playBtn.count() && !(await playBtn.isDisabled())) {
          await playBtn.click({ timeout: 5000 });
          const confirm = page.getByTestId('confirm-dialog-confirm');
          if (await confirm.count()) { try { await confirm.click({ timeout: 2000 }); } catch {} }
          await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 15000 });
          await page.waitForTimeout(700);
        }
        const info = await inspectTray(page);
        await shotsForInspect(page, name, info, size);
        metrics.specials[name] = { cube: info.cubeBox, overlaps: info.overlapsCube };
        if (info.overlapsCube.length) fail(`${name}.overlap`, JSON.stringify(info.overlapsCube));
        else pass(`${name}`, `live ${owner}-owned cube clear`);
      } finally {
        await context.close();
      }
    }
  }

  // 4) Tap + drag bear-off
  async function bearOffPosition() {
    const points = emptyPoints();
    points[1] = { player: 'white', count: 1 };
    points[6] = { player: 'white', count: 7 };
    distribute(points, 'black', [24, 23, 22, 21, 20, 19], 8);
    return makePosition({ whiteOff: 7, blackOff: 7, dice: [1, 3], placements: points });
  }
  async function playCustom(page, pos, prefsExtra = {}) {
    // prefs already in context
    await page.goto(positionUrl(PREVIEW, pos), { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1400);
    await dismissChrome(page);
    await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 25000 });
    const human = page.getByTestId('position-mode-human');
    if (await human.count()) { try { await human.click({ timeout: 2500 }); } catch {} }
    await page.getByTestId('position-play').click({ timeout: 5000 });
    const confirm = page.getByTestId('confirm-dialog-confirm');
    if (await confirm.count()) { try { await confirm.click({ timeout: 2000 }); } catch {} }
    await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 15000 });
    await page.waitForTimeout(800);
  }

  {
    const size = FOCUS_SIZES[0];
    const { context, page } = await newContext(browser, size, { prefs: { confirmMove: false, autoMoveWhenForced: true } });
    try {
      await playCustom(page, await bearOffPosition());
      let info = await inspectTray(page);
      await shotsForInspect(page, 'anim-tap-before', info, size);
      const before = info.whiteCount;
      const flightLocator = page.locator('[data-testid^="checker-flight"]').first();
      const flightWait = flightLocator.waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false);
      await page.getByTestId('point-1').tap({ timeout: 5000 });
      const sawFlight = await flightWait;
      if (sawFlight) {
        try { await shot(page, 'anim-tap-flight.png'); } catch {}
      }
      await page.waitForTimeout(1600);
      info = await inspectTray(page);
      await shotsForInspect(page, 'anim-tap-after', info, size);
      const landed = info.whiteCount === before + 1 || info.whiteCount === 8;
      metrics.specials.tap = { before, after: info.whiteCount, sawFlight, white: info.white, overlaps: info.overlapsCube };
      if (landed && !info.overlapsCube.length && info.white.groupsOk) pass('anim.tap', `7→${info.whiteCount}, flight=${sawFlight}, groups=${JSON.stringify(info.white.groupSizes)}, thickness=${info.white.thickness}`);
      else fail('anim.tap', `before=${before} after=${info.whiteCount} flight=${sawFlight} groups=${JSON.stringify(info.white)} overlaps=${JSON.stringify(info.overlapsCube)}`);
    } finally {
      await context.close();
    }
  }

  {
    const size = FOCUS_SIZES[0];
    const { context, page } = await newContext(browser, size, { prefs: { confirmMove: false, autoMoveWhenForced: false } });
    try {
      await playCustom(page, await bearOffPosition());
      let info = await inspectTray(page);
      await shotsForInspect(page, 'anim-drag-before', info, size);
      const before = info.whiteCount;
      const src = page.getByTestId('point-1');
      const tray = page.getByLabel(/Bear off/i).first();
      const flightLocator = page.locator('[data-testid^="checker-flight"]').first();
      const flightWait = flightLocator.waitFor({ state: 'visible', timeout: 6000 }).then(() => true).catch(() => false);
      let dragged = false;
      try {
        await src.dragTo(tray, { timeout: 8000, force: true });
        dragged = true;
      } catch (e) {
        log('dragTo-failed', String(e).slice(0, 180));
        try {
          const sb = await src.boundingBox();
          const tb = await tray.boundingBox();
          if (sb && tb) {
            await page.mouse.move(sb.x + sb.width / 2, sb.y + sb.height - 8);
            await page.mouse.down();
            await page.mouse.move(tb.x + tb.width / 2, tb.y + tb.height * 0.8, { steps: 24 });
            await page.mouse.up();
            dragged = true;
          }
        } catch (e2) {
          log('mouse-drag-failed', String(e2).slice(0, 180));
        }
      }
      const sawFlight = await flightWait;
      if (sawFlight) {
        try { await shot(page, 'anim-drag-flight.png'); } catch {}
      }
      await page.waitForTimeout(1600);
      info = await inspectTray(page);
      await shotsForInspect(page, 'anim-drag-after', info, size);
      const landed = info.whiteCount === before + 1 || info.whiteCount === 8;
      metrics.specials.drag = { before, after: info.whiteCount, dragged, sawFlight, white: info.white };
      if (landed && info.white.groupsOk) pass('anim.drag', `7→${info.whiteCount}, dragged=${dragged}, flight=${sawFlight}, groups=${JSON.stringify(info.white.groupSizes)}`);
      else fail('anim.drag', `before=${before} after=${info.whiteCount} dragged=${dragged} flight=${sawFlight} body=${info.bodyText.slice(0, 200)}`);
    } finally {
      await context.close();
    }
  }

  // 5) RTL Hebrew
  {
    const size = FOCUS_SIZES[0];
    const { context, page } = await newContext(browser, size, { lang: 'he' });
    try {
      await page.goto(PREVIEW, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1200);
      let dir = await page.evaluate(() => document.documentElement.getAttribute('dir') || document.documentElement.dir);
      if (dir !== 'rtl') {
        // Fall back to Settings → Language → עברית
        note(`RTL init script left dir=${dir}; trying Settings`);
        const gear = page.getByTestId('home-settings').or(page.getByLabel(/settings|הגדרות/i)).first();
        try {
          await gear.click({ timeout: 4000 });
          await page.waitForTimeout(600);
          const langRow = page.getByText(/Language|שפה/i).first();
          await langRow.click({ timeout: 4000 });
          await page.waitForTimeout(400);
          await page.getByText('עברית').first().click({ timeout: 4000 });
          await page.waitForTimeout(800);
        } catch (e) {
          log('settings-lang-failed', String(e).slice(0, 200));
        }
      }
      const cse = { id: 'w7-b7', whiteOff: 7, blackOff: 7, play: true, official: 'w7-b7' };
      await loadPosition(page, PREVIEW, cse, { play: true });
      const info = await inspectTray(page);
      await shotsForInspect(page, 'rtl-he-w7-b7', info, size);
      await shot(page, 'rtl-he-w7-b7-chrome.png');
      metrics.specials.rtl = { dir: info.dir, lang: info.lang, white: info.white, black: info.black, tray: info.trayBox, body: info.bodyText.slice(0, 200) };
      const visualOk = info.whiteCount === 7 && info.blackCount === 7 && !info.overflow.length && info.white.groupsOk && info.black.groupsOk;
      if (visualOk) pass('rtl', `dir=${info.dir} lang=${info.lang} 7+7 groups-of-five, no +N`);
      else fail('rtl', JSON.stringify({ dir: info.dir, lang: info.lang, w: info.white, b: info.black, overflow: info.overflow, body: info.bodyText.slice(0, 180) }));
    } finally {
      await context.close();
    }
  }

  // 6) Learn lessons
  for (const lesson of ['bearing-off', 'pip-count']) {
    const size = FOCUS_SIZES[0];
    const { context, page } = await newContext(browser, size);
    try {
      await page.goto(`${PREVIEW}/learn/${lesson}`, { waitUntil: 'domcontentloaded', timeout: 60000 });
      await page.waitForTimeout(1800);
      await dismissChrome(page);
      // some lessons start on a title card; try continue / start
      for (const t of [/Start/i, /Continue/i, /Next/i, /Begin/i, /Play/i, /Got it/i]) {
        const el = page.getByText(t).first();
        if (await el.count()) { try { await el.click({ timeout: 800 }); await page.waitForTimeout(500); } catch {} }
      }
      const info = await inspectTray(page);
      await shotsForInspect(page, `learn-${lesson}`, info, size);
      metrics.specials[`learn-${lesson}`] = { white: info.whiteCount, black: info.blackCount, overflow: info.overflow, tray: !!info.trayBox, body: info.bodyText.slice(0, 240) };
      const hasTray = !!info.trayBox || info.whiteCount + info.blackCount > 0;
      if (hasTray) {
        if (info.overflow.length) fail(`learn.${lesson}.overflow`, JSON.stringify(info.overflow));
        else pass(`learn.${lesson}`, `white=${info.whiteCount} black=${info.blackCount} groupsW=${JSON.stringify(info.white.groupSizes)} groupsB=${JSON.stringify(info.black.groupSizes)}`);
      } else {
        note(`learn.${lesson}: no tray on first screen (body=${info.bodyText.slice(0, 180)})`);
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
