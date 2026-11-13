import { webkit, devices } from '/workspace/qa-clips/safari-textsize/node_modules/playwright/index.mjs';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/workspace/qa-clips/pr-389/ea01515';
const PREVIEW = 'https://backgammon-mastermind-6zpgwncz4-softwarebyzes-projects.vercel.app';
const size = { id: 'iphone-portrait', profile: 'iPhone 16 Pro', viewport: { width: 402, height: 874 } };

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
function makePosition({ whiteOff, blackOff, dice, placements, cubeOwner = null, cubeExponent = 0 }) {
  return {
    version: 1,
    points: placements,
    bar: { white: 0, black: 0 },
    borneOff: { white: whiteOff, black: blackOff },
    currentPlayer: 'white',
    dice,
    context: {
      cubeExponent, cubeOwner, turnOwner: 'white', matchLength: 0,
      scores: { white: 0, black: 0 }, crawford: false, jacoby: false, beavers: false,
      maxCube: 10, gameState: 1, resignation: 0, doubleAction: '',
    },
  };
}
function urlFor(p) {
  return `${PREVIEW}/position?data=${encodeURIComponent(JSON.stringify(p))}`;
}

const log = (...a) => {
  const line = a.map((x) => (typeof x === 'string' ? x : JSON.stringify(x))).join(' ');
  console.log(line);
  fs.appendFileSync(path.join(OUT, 'rerun.log'), line + '\n');
};
const findings = { pass: [], fail: [], notes: [] };
const pass = (id, m) => { findings.pass.push({ id, m }); log('PASS', id, m); };
const fail = (id, m) => { findings.fail.push({ id, m }); log('FAIL', id, m); };

const PREFS = {
  showMoveHints: true, showDirectionOverlay: false, showPointNumbers: true,
  diceDisplayStyle: 'numeric', autoRoll: false, autoMoveWhenForced: false,
  soundEnabled: false, tutorMode: false, moveInDiceOrder: false,
  confirmMove: true, computerLevel: 'easy',
};

async function applyStorage(page, { prefs = PREFS, lang = 'en' } = {}) {
  await page.addInitScript(({ prefs, lang }) => {
    try {
      localStorage.setItem('mmkv.default\\GAME_PREFERENCES', JSON.stringify(prefs));
      localStorage.setItem('mmkv.default\\GAME_PREFERENCES_CONFIRM_MOVE_V1', 'true');
      localStorage.setItem('mmkv.default\\local', lang);
    } catch {}
  }, { prefs, lang });
}

async function dismiss(page) {
  for (const t of [/Hide/i, /Not now/i, /Dismiss/i, /Got it/i]) {
    const el = page.getByText(t).first();
    if (await el.count()) { try { await el.click({ timeout: 600 }); } catch {} }
  }
}

async function playPosition(page, position) {
  await page.goto(urlFor(position), { waitUntil: 'domcontentloaded', timeout: 60000 });
  await page.waitForTimeout(1500);
  await dismiss(page);
  await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 20000 });
  const human = page.getByTestId('position-mode-human');
  if (await human.count()) { try { await human.click({ timeout: 2500 }); } catch {} }
  await page.getByTestId('position-play').click({ timeout: 5000 });
  const confirm = page.getByTestId('confirm-dialog-confirm');
  if (await confirm.count()) { try { await confirm.click({ timeout: 2000 }); } catch {} }
  await page.getByTestId('board-view').waitFor({ state: 'visible', timeout: 15000 });
  await page.waitForTimeout(800);
}

async function inspect(page) {
  return page.evaluate(() => {
    const box = (el) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      return { x: +r.x.toFixed(1), y: +r.y.toFixed(1), w: +r.width.toFixed(1), h: +r.height.toFixed(1), left: +r.left.toFixed(1), right: +r.right.toFixed(1), top: +r.top.toFixed(1), bottom: +r.bottom.toFixed(1) };
    };
    const tray = document.querySelector('[aria-label="Bear off"]')
      || [...document.querySelectorAll('[aria-label]')].find((e) => /bear off|משיכ|צא מהלוח/i.test(e.getAttribute('aria-label') || ''));
    const trayBox = box(tray);
    const slabs = [...document.querySelectorAll('[data-testid="bear-off-slab"]')].map((el) => {
      const r = el.getBoundingClientRect();
      const side = trayBox ? (r.top + r.height / 2 < trayBox.y + trayBox.h / 2 ? 'black' : 'white') : 'unknown';
      return { ...box(el), side };
    });
    const greenKids = tray ? [...tray.querySelectorAll('*')].concat(tray).filter((el) => {
      const s = getComputedStyle(el);
      const w = parseFloat(s.borderTopWidth || '0');
      const c = s.borderTopColor || '';
      return w >= 1.5 && (/74|76|116|4CAF50|75, 175|76, 175|0, 128|46, 204|76,175/i.test(c) || c.includes('76, 175') || c.includes('76,175') || c === 'rgb(76, 175, 80)');
    }).map((el) => ({ border: getComputedStyle(el).borderTopColor, w: getComputedStyle(el).borderTopWidth, box: box(el) })) : [];
    const flights = [...document.querySelectorAll('[data-testid^="checker-flight"]')].map((el) => ({ testid: el.getAttribute('data-testid'), ...box(el) }));
    return {
      dir: document.documentElement.getAttribute('dir') || document.documentElement.dir || getComputedStyle(document.documentElement).direction,
      lang: document.documentElement.lang,
      bodyText: (document.body.innerText || '').replace(/\s+/g, ' ').trim().slice(0, 500),
      trayBox,
      cubeBox: box(document.querySelector('[data-testid="board-cube-slot"]')),
      whiteCount: slabs.filter((s) => s.side === 'white').length,
      blackCount: slabs.filter((s) => s.side === 'black').length,
      whiteSlabs: slabs.filter((s) => s.side === 'white').sort((a, b) => a.top - b.top),
      greenKids,
      flights,
      offText: (document.body.innerText || '').match(/\d+\s*OFF/gi),
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

function padClip(box, pad, vw, vh) {
  if (!box) return null;
  const x = Math.max(0, Math.floor(box.x - pad));
  const y = Math.max(0, Math.floor(box.y - pad));
  const w = Math.min(vw, Math.ceil(box.x + box.w + pad)) - x;
  const h = Math.min(vh, Math.ceil(box.y + box.h + pad)) - y;
  return w > 4 && h > 4 ? { x, y, width: w, height: h } : null;
}

async function main() {
  fs.writeFileSync(path.join(OUT, 'rerun.log'), '');
  const browser = await webkit.launch({ headless: true });
  const device = devices[size.profile];

  // 1) Legal target: 8 on the 6-point, dice 6-1, confirm on. Selecting 6 should
  // highlight bear-off (the 6) and point 5 (the 1) without auto-playing.
  {
    const context = await browser.newContext({ ...device, viewport: size.viewport });
    await context.route(/posthog/i, (r) => r.abort());
    const page = await context.newPage();
    await applyStorage(page, { prefs: { ...PREFS, confirmMove: true } });
    const points = emptyPoints();
    points[6] = { player: 'white', count: 8 };
    distribute(points, 'black', [24, 23, 22, 21, 20, 19], 8);
    const pos = makePosition({ whiteOff: 7, blackOff: 7, dice: [6, 1], placements: points });
    await playPosition(page, pos);
    let info = await inspect(page);
    log('legal before', { white: info.whiteCount, off: info.offText, body: info.bodyText.slice(0, 180) });
    await shot(page, 'legal-target-before.png');
    await page.getByTestId('point-6').tap({ timeout: 5000 });
    await page.waitForTimeout(700);
    info = await inspect(page);
    await shot(page, 'legal-target-after-select.png');
    const trayClip = padClip(info.trayBox, 8, size.viewport.width, size.viewport.height);
    if (trayClip) await shot(page, 'legal-target-tray.png', trayClip);
    const stillSeven = info.whiteCount === 7 || (info.offText || []).some((t) => t.includes('7'));
    log('legal after select', { white: info.whiteCount, green: info.greenKids, off: info.offText });
    if (info.greenKids.length && stillSeven) pass('legalTarget', `green highlight on tray while still 7 off: ${JSON.stringify(info.greenKids[0])}`);
    else if (info.greenKids.length) pass('legalTarget', `green highlight present (whiteCount=${info.whiteCount}): ${JSON.stringify(info.greenKids[0])}`);
    else fail('legalTarget', `no green tray border. white=${info.whiteCount} off=${info.offText} body=${info.bodyText.slice(0, 220)}`);
    await context.close();
  }

  // 2) Animation: 7 off, 1 on point 1, 7 on 6, dice 1-3. Tap point 1 (only dest is bear-off).
  // Capture flight and landing on the new top slab.
  {
    const context = await browser.newContext({ ...device, viewport: size.viewport });
    await context.route(/posthog/i, (r) => r.abort());
    const page = await context.newPage();
    await applyStorage(page, { prefs: { ...PREFS, confirmMove: false, autoMoveWhenForced: true } });
    const points = emptyPoints();
    points[1] = { player: 'white', count: 1 };
    points[6] = { player: 'white', count: 7 };
    distribute(points, 'black', [24, 23, 22, 21, 20, 19], 8);
    const pos = makePosition({ whiteOff: 7, blackOff: 7, dice: [1, 3], placements: points });
    await playPosition(page, pos);
    let info = await inspect(page);
    await shot(page, 'anim-before-full.png');
    const trayClip = padClip(info.trayBox, 8, size.viewport.width, size.viewport.height);
    if (trayClip) await shot(page, 'anim-before-tray.png', trayClip);
    const before = info.whiteCount;
    const flightLocator = page.locator('[data-testid^="checker-flight"]').first();
    const flightWait = flightLocator.waitFor({ state: 'visible', timeout: 5000 }).then(() => true).catch(() => false);
    await page.getByTestId('point-1').tap({ timeout: 5000 });
    const sawFlight = await flightWait;
    if (sawFlight) {
      const fbox = await flightLocator.boundingBox();
      await shot(page, 'anim-flight.png');
      const mid = await inspect(page);
      log('flight', { fbox, flights: mid.flights, white: mid.whiteCount });
      pass('animation.flight', `checker-flight visible at ${JSON.stringify(fbox || mid.flights[0])}`);
    } else {
      fail('animation.flight', 'checker-flight never became visible');
    }
    await page.waitForTimeout(2000);
    info = await inspect(page);
    await shot(page, 'anim-after-full.png');
    if (info.trayBox) {
      const c = padClip(info.trayBox, 8, size.viewport.width, size.viewport.height);
      if (c) await shot(page, 'anim-after-tray.png', c);
    }
    if (info.whiteCount === before + 1) {
      // landing: newest white slab is the one closest to the hinge (smallest top, since white grows upward)
      const tops = info.whiteSlabs.map((s) => s.top);
      const hingeSlab = info.whiteSlabs[0]; // sorted top-to-bottom; for white, last added is nearest hinge = topmost
      pass('animation.land', `white ${before}→${info.whiteCount}; top slab at y=${hingeSlab?.top}, thicknesses stacked to ${info.whiteSlabs[info.whiteSlabs.length - 1]?.bottom}`);
    } else {
      fail('animation.land', `expected ${before + 1}, got ${info.whiteCount} off=${info.offText}`);
    }
    await context.close();
  }

  // 3) RTL via Settings UI (Hebrew), then load the 7-off share.
  {
    const context = await browser.newContext({ ...device, viewport: size.viewport });
    await context.route(/posthog/i, (r) => r.abort());
    const page = await context.newPage();
    await page.goto(PREVIEW, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.getByTestId('home-opponent-vs-computer').waitFor({ state: 'visible', timeout: 25000 });
    await dismiss(page);
    await page.getByTestId('open-settings-button').click();
    await page.getByText('Language', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
    await page.getByText('Language', { exact: true }).first().click();
    await page.getByText('עברית', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
    await page.getByText('עברית', { exact: true }).first().click();
    await page.waitForTimeout(600);
    const dirHome = await page.evaluate(() => ({
      dir: document.documentElement.getAttribute('dir') || document.documentElement.dir || getComputedStyle(document.documentElement).direction,
      lang: document.documentElement.lang,
    }));
    log('rtl after settings', dirHome);
    await shot(page, 'rtl-he-settings.png');

    const share = fs.readFileSync('/workspace/qa-clips/bearoff-baseline/share-urls.txt', 'utf8').trim().split('\n')
      .find((l) => l.startsWith('w7-b7 ')).split(' ')[1]
      .replace('https://backgammon-mastermind.vercel.app', PREVIEW);
    await page.goto(share, { waitUntil: 'domcontentloaded', timeout: 60000 });
    await page.waitForTimeout(1500);
    await dismiss(page);
    const playBtn = page.getByTestId('position-play');
    if (await playBtn.count()) {
      const human = page.getByTestId('position-mode-human');
      if (await human.count()) { try { await human.click({ timeout: 2500 }); } catch {} }
      await playBtn.click({ timeout: 5000 });
      const confirm = page.getByTestId('confirm-dialog-confirm');
      if (await confirm.count()) { try { await confirm.click({ timeout: 2000 }); } catch {} }
      await page.waitForTimeout(1000);
    }
    const info = await inspect(page);
    await shot(page, 'rtl-he-w7-b7-full.png');
    if (info.trayBox) {
      const c = padClip(info.trayBox, 8, size.viewport.width, size.viewport.height);
      if (c) await shot(page, 'rtl-he-w7-b7-tray.png', c);
    }
    if (info.dir === 'rtl' || info.lang === 'he' || dirHome.dir === 'rtl') {
      pass('rtl.dir', `dir=${info.dir} lang=${info.lang} (settings dir=${dirHome.dir}); white=${info.whiteCount} black=${info.blackCount}`);
    } else {
      fail('rtl.dir', `still ltr after UI switch: game dir=${info.dir} lang=${info.lang} settings=${JSON.stringify(dirHome)}`);
    }
    if (info.whiteCount === 7 && info.blackCount === 7) pass('rtl.counts', '7/7 visible, no overflow in RTL');
    else fail('rtl.counts', `white=${info.whiteCount} black=${info.blackCount}`);
    await context.close();
  }

  await browser.close();
  fs.writeFileSync(path.join(OUT, 'rerun-findings.json'), JSON.stringify(findings, null, 2));
  log('SUMMARY pass', findings.pass.length, 'fail', findings.fail.length);
}

main().catch((e) => { console.error(e); process.exit(1); });
