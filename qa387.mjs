import { webkit, devices } from 'playwright';
import fs from 'node:fs';
import path from 'node:path';

const OUT = '/workspace/qa-clips/pr-387/7a35aa4';
const PROD = 'https://backgammon-mastermind.vercel.app';
const PR = 'https://backgammon-mastermind-c1k6wxt0j-softwarebyzes-projects.vercel.app';

const LANGS = {
  en: { label: 'English', rtl: false },
  de: { label: 'Deutsch', rtl: false },
  es: { label: 'Español', rtl: false },
  he: { label: 'עברית', rtl: true },
  ar: { label: 'العربية', rtl: true },
  ru: { label: 'Русский', rtl: false },
};

const VIEWPORTS = {
  '402x681': { width: 402, height: 681, device: 'iPhone 16 Pro' },
  '390x844': { width: 390, height: 844, device: 'iPhone 14' },
  '390x664': { width: 390, height: 664, device: 'iPhone 14' },
  '852x260': { width: 852, height: 260, device: null },
  '667x375': { width: 667, height: 375, device: 'iPhone SE (3rd gen) landscape' },
};

const SEGMENT_IDS = [
  'home-opponent-vs-computer',
  'home-opponent-vs-human',
  'home-computer-level-easy',
  'home-computer-level-medium',
  'home-computer-level-hard',
  'home-computer-level-expert',
  'home-format-single',
  'home-format-match',
];

function scaleTag(s) {
  return String(Math.round(s * 100));
}

async function waitHome(page) {
  await page.getByTestId('home-opponent-vs-computer').waitFor({ state: 'visible', timeout: 25000 });
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}
  await page.waitForTimeout(800);
  const single = page.getByTestId('home-format-single');
  if (await single.count()) {
    try { await single.click({ timeout: 2000 }); } catch {}
    await page.waitForTimeout(200);
  }
}

async function applyZoom(page, scale) {
  if (scale !== 1) {
    await page.addStyleTag({ content: `html { zoom: ${scale}; }` });
  }
  try { await page.evaluate(() => document.fonts && document.fonts.ready); } catch {}
  await page.waitForTimeout(900);
}

async function setLanguage(page, url, lang) {
  if (!lang || lang === 'en') return;
  const label = LANGS[lang].label;
  await page.getByTestId('open-settings-button').click({ timeout: 8000 });
  await page.getByText('Language', { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText('Language', { exact: true }).first().click();
  await page.getByText(label, { exact: true }).first().waitFor({ state: 'visible', timeout: 10000 });
  await page.getByText(label, { exact: true }).first().click();
  await page.waitForTimeout(500);
  await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
  await waitHome(page);
}

async function measure(page, scale) {
  return page.evaluate((args) => {
    const { segmentIds, expectedZoom } = args;
    const vw = window.innerWidth;
    const vh = window.innerHeight;
    const de = document.documentElement;
    const zoomRaw = getComputedStyle(de).zoom;
    const zoom = parseFloat(zoomRaw) || expectedZoom || 1;

    const midWordBreaksFor = (el) => {
      const breaks = [];
      const walker = document.createTreeWalker(el, NodeFilter.SHOW_TEXT);
      while (walker.nextNode()) {
        const node = walker.currentNode;
        const t = node.textContent || '';
        const re = /\S+/g;
        let m;
        while ((m = re.exec(t))) {
          const range = document.createRange();
          range.setStart(node, m.index);
          range.setEnd(node, m.index + m[0].length);
          const rects = [...range.getClientRects()].filter((r) => r.width > 0.5 && r.height > 0.5);
          if (rects.length > 1) {
            const lines = [];
            for (const r of rects) {
              const hit = lines.find((l) => Math.abs(l.top - r.top) < 2);
              if (hit) hit.width += r.width;
              else lines.push({ top: r.top, left: r.left, width: r.width, height: r.height });
            }
            if (lines.length > 1) {
              breaks.push({
                word: m[0],
                lines: lines.length,
                rects: lines.map((r) => ({
                  t: +r.top.toFixed(1), l: +r.left.toFixed(1),
                  w: +r.width.toFixed(1), h: +r.height.toFixed(1),
                })),
              });
            }
          }
        }
      }
      return breaks;
    };

    const deepestTextEl = (el) => {
      const text = (el.innerText || '').trim();
      if (!text) return el;
      const kids = [...el.querySelectorAll('*')];
      for (let i = kids.length - 1; i >= 0; i--) {
        const k = kids[i];
        if ((k.innerText || '').trim() === text && k.children.length === 0) return k;
      }
      return el;
    };

    const inspectEl = (el, label) => {
      if (!el) return null;
      const r = el.getBoundingClientRect();
      const textEl = deepestTextEl(el);
      const style = getComputedStyle(textEl);
      const fontSizeCss = parseFloat(style.fontSize) || null;
      const textRect = textEl.getBoundingClientRect();
      const midWordBreaks = midWordBreaksFor(el);
      const text = (el.innerText || '').replace(/\s+/g, ' ').trim();
      const lineRects = [...(textEl.getClientRects?.() || [textRect])].filter((x) => x.width > 0.5);
      const lines = [];
      for (const lr of lineRects) {
        if (!lines.find((l) => Math.abs(l.top - lr.top) < 2)) {
          lines.push({ top: lr.top, height: lr.height });
        }
      }
      const clientW = textEl.clientWidth;
      const scrollW = textEl.scrollWidth;
      const textOverflow = style.textOverflow;
      const overflowX = style.overflowX || style.overflow;
      const hasEllipsisChar = /…|\.\.\./.test(text);
      const overflowPx = +(Math.max(0, scrollW - clientW)).toFixed(2);
      const overflowClip = overflowPx > 0.5;
      const ellipsized = hasEllipsisChar || (textOverflow === 'ellipsis' && overflowClip);
      const overflowPillLeft = +(Math.max(0, r.left - textRect.left)).toFixed(1);
      const overflowPillRight = +(Math.max(0, textRect.right - r.right)).toFixed(1);
      return {
        label,
        testID: el.getAttribute('data-testid'),
        text,
        left: +r.left.toFixed(1),
        right: +r.right.toFixed(1),
        top: +r.top.toFixed(1),
        bottom: +r.bottom.toFixed(1),
        width: +r.width.toFixed(1),
        height: +r.height.toFixed(1),
        clipLeft: r.left < -0.5,
        clipRight: r.right > vw + 0.5,
        overflowLeftPx: +Math.max(0, -r.left).toFixed(1),
        overflowRightPx: +Math.max(0, r.right - vw).toFixed(1),
        fontSizeCss,
        fontSizeOnScreen: fontSizeCss != null ? +(fontSizeCss * zoom).toFixed(2) : null,
        textLeft: +textRect.left.toFixed(1),
        textRight: +textRect.right.toFixed(1),
        textHeight: +textRect.height.toFixed(1),
        overflowPillLeft,
        overflowPillRight,
        overflowPill: overflowPillLeft > 1 || overflowPillRight > 1,
        midWordBreaks,
        lineCount: lines.length,
        wrapsAtSpace: lines.length > 1 && midWordBreaks.length === 0,
        clientW,
        scrollW,
        overflowPx,
        overflowClip,
        ellipsized,
        textOverflow,
        overflowX,
      };
    };

    const byTest = (id) => document.querySelector(`[data-testid="${id}"]`);
    const named = [];
    const add = (el, label) => {
      const info = inspectEl(el, label);
      if (info) named.push(info);
    };

    add(byTest('home-screen'), 'home-screen');
    add(byTest('home-start-game'), 'start-game');
    add(byTest('home-doubling-cube'), 'doubling-cube-switch');
    add(byTest('learn-button'), 'learn-to-play');
    add(byTest('position-setup-button'), 'set-up-position');
    add(byTest('game-clock-button'), 'game-clock');
    add(document.querySelector('img'), 'logo-img');
    add(byTest('open-settings-button'), 'settings-gear');

    const segments = [];
    for (const id of segmentIds) {
      const el = byTest(id);
      if (!el) continue;
      const info = inspectEl(el, id);
      segments.push(info);
      named.push(info);
    }

    const learn = named.find((n) => n.label === 'learn-to-play');
    const setup = named.find((n) => n.label === 'set-up-position');
    const levels = segments.filter((s) => (s.testID || '').startsWith('home-computer-level-'));
    let levelRow = null;
    if (levels.length) {
      const left = Math.min(...levels.map((s) => s.left));
      const right = Math.max(...levels.map((s) => s.right));
      const top = Math.min(...levels.map((s) => s.top));
      const bottom = Math.max(...levels.map((s) => s.bottom));
      levelRow = {
        left: +left.toFixed(1),
        right: +right.toFixed(1),
        top: +(top - 8).toFixed(1),
        bottom: +(bottom + 8).toFixed(1),
        width: +(right - left).toFixed(1),
        height: +(bottom - top + 16).toFixed(1),
      };
    }

    let crossingCount = 0;
    for (const el of document.querySelectorAll('body *')) {
      const r = el.getBoundingClientRect();
      if (r.width < 2 || r.height < 2) continue;
      if (r.left < -1 || r.right > vw + 1) crossingCount++;
    }

    return {
      innerWidth: vw,
      innerHeight: vh,
      dir: de.getAttribute('dir') || de.dir || getComputedStyle(de).direction,
      lang: de.lang,
      scrollWidth: de.scrollWidth,
      clientWidth: de.clientWidth,
      extraScrollX: de.scrollWidth - de.clientWidth,
      htmlZoom: zoomRaw,
      zoom,
      named,
      segments,
      levelRow,
      clips: named.filter((n) => n.clipLeft || n.clipRight).map((n) =>
        `${n.label}${n.clipLeft ? ' L' + n.overflowLeftPx : ''}${n.clipRight ? ' R' + n.overflowRightPx : ''}`,
      ),
      midWord: segments.filter((s) => s.midWordBreaks.length).map((s) => ({
        id: s.testID, text: s.text, breaks: s.midWordBreaks,
      })),
      overflowPills: segments.filter((s) => s.overflowPill).map((s) => ({
        id: s.testID, text: s.text, L: s.overflowPillLeft, R: s.overflowPillRight,
      })),
      ellipsized: segments.filter((s) => s.ellipsized).map((s) => ({
        id: s.testID, text: s.text, overflowPx: s.overflowPx, textOverflow: s.textOverflow,
      })),
      overflowClipped: segments.filter((s) => s.overflowClip).map((s) => ({
        id: s.testID, text: s.text, clientW: s.clientW, scrollW: s.scrollW, overflowPx: s.overflowPx,
      })),
      stackedLearnSetup: !!(learn && setup && Math.abs(learn.top - setup.top) > 20),
      crossingCount,
      hasDoublingCube: !!byTest('home-doubling-cube'),
      gearLeft: named.find((n) => n.label === 'settings-gear')?.left,
    };
  }, { segmentIds: SEGMENT_IDS, expectedZoom: scale });
}

async function runCase(context, { site, url, vpName, scale, lang, setLang }) {
  const page = await context.newPage();
  await page.route('**/*posthog*', (route) => route.abort());
  const langTag = lang && lang !== 'en' ? `-${lang}` : '';
  const tag = `${site}-${vpName}-zoom-${scaleTag(scale)}${langTag}`;
  const shot = path.join(OUT, `${tag}.png`);
  let result;
  try {
    await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 45000 });
    await waitHome(page);
    if (setLang) await setLanguage(page, url, lang);
    await applyZoom(page, scale);
    const metrics = await measure(page, scale);
    await page.screenshot({ path: shot, fullPage: false });
    result = { tag, site, url, viewport: vpName, scale, lang: lang || 'en', ok: true, shot, metrics };
    const m = metrics;
    const mid = m.midWord.map((x) => `${x.id}:${x.breaks.map((b) => b.word).join(',')}`).join(';') || '-';
    const fonts = (m.segments || [])
      .filter((s) => (s.testID || '').startsWith('home-computer-level-'))
      .map((s) => `${(s.testID || '').replace('home-computer-level-', '')}=${s.text}@${s.fontSizeCss}→${s.fontSizeOnScreen}px/${s.lineCount}L`)
      .join(', ');
    console.log(
      `${tag} scroll ${m.scrollWidth}/${m.clientWidth} (Δ${m.extraScrollX}) dir=${m.dir} stacked=${m.stackedLearnSetup} clips=[${m.clips.join('; ')}] midWord=[${mid}] ellipsis=${m.ellipsized.length} overflowClip=${m.overflowClipped.length} overflowPills=${m.overflowPills.length} fonts=[${fonts}]`,
    );
  } catch (e) {
    try { await page.screenshot({ path: shot, fullPage: false }); } catch {}
    result = { tag, site, url, viewport: vpName, scale, lang: lang || 'en', ok: false, error: String(e.message || e), shot };
    console.log(`${tag} FAIL ${e.message || e}`);
  } finally {
    await page.close();
  }
  return result;
}

async function makeContext(browser, vpName) {
  const cfg = VIEWPORTS[vpName];
  const device = cfg.device ? devices[cfg.device] : null;
  return browser.newContext({
    ...(device || {
      userAgent: devices['iPhone 14'].userAgent,
      isMobile: true,
      hasTouch: true,
      deviceScaleFactor: 3,
    }),
    viewport: { width: cfg.width, height: cfg.height },
  });
}

async function main() {
  fs.mkdirSync(OUT, { recursive: true });
  const browser = await webkit.launch({ headless: true });
  const results = [];

  // English: prod + pr, all listed viewports, zooms 100/115/125/150
  for (const vpName of ['402x681', '390x844', '390x664', '852x260', '667x375']) {
    const context = await makeContext(browser, vpName);
    for (const [site, url] of [['prod', PROD], ['pr387', PR]]) {
      for (const scale of [1, 1.15, 1.25, 1.5]) {
        results.push(await runCase(context, { site, url, vpName, scale, lang: 'en', setLang: false }));
      }
    }
    await context.close();
  }

  // Locales on 402 and 390, all zooms. Set language once per context.
  for (const vpName of ['402x681', '390x844']) {
    for (const lang of ['de', 'es', 'he', 'ar', 'ru']) {
      const context = await makeContext(browser, vpName);
      const first = await runCase(context, { site: 'pr387', url: PR, vpName, scale: 1, lang, setLang: true });
      results.push(first);
      if (!first.ok) {
        await context.close();
        continue;
      }
      for (const scale of [1.15, 1.25, 1.5]) {
        results.push(await runCase(context, { site: 'pr387', url: PR, vpName, scale, lang, setLang: false }));
      }
      await context.close();
    }
  }

  // Russian also at 150% on the SE landscape viewport that previously failed
  {
    const context = await makeContext(browser, '667x375');
    const first = await runCase(context, { site: 'pr387', url: PR, vpName: '667x375', scale: 1, lang: 'ru', setLang: true });
    results.push(first);
    if (first.ok) {
      results.push(await runCase(context, { site: 'pr387', url: PR, vpName: '667x375', scale: 1.5, lang: 'ru', setLang: false }));
    }
    await context.close();
  }

  fs.writeFileSync(path.join(OUT, 'metrics.json'), JSON.stringify({ preview: PR, results }, null, 2));
  const slim = results.map((r) => ({
    tag: r.tag, site: r.site, viewport: r.viewport, scale: r.scale, lang: r.lang,
    ok: r.ok, error: r.error, shot: r.shot,
    clips: r.metrics?.clips,
    extraScrollX: r.metrics?.extraScrollX,
    stacked: r.metrics?.stackedLearnSetup,
    dir: r.metrics?.dir,
    langAttr: r.metrics?.lang,
    midWord: r.metrics?.midWord,
    overflowPills: r.metrics?.overflowPills,
    ellipsized: r.metrics?.ellipsized,
    overflowClipped: r.metrics?.overflowClipped,
    crossingCount: r.metrics?.crossingCount,
    hasDoublingCube: r.metrics?.hasDoublingCube,
    levelRow: r.metrics?.levelRow,
    segments: (r.metrics?.segments || []).map((s) => ({
      id: s.testID, text: s.text, fontSizeCss: s.fontSizeCss,
      fontSizeOnScreen: s.fontSizeOnScreen, lineCount: s.lineCount,
      wrapsAtSpace: s.wrapsAtSpace, midWordBreaks: s.midWordBreaks,
      overflowPill: s.overflowPill, clipLeft: s.clipLeft, clipRight: s.clipRight,
      ellipsized: s.ellipsized, overflowClip: s.overflowClip,
      clientW: s.clientW, scrollW: s.scrollW, overflowPx: s.overflowPx,
      textOverflow: s.textOverflow,
    })),
  }));
  fs.writeFileSync(path.join(OUT, 'summary.json'), JSON.stringify(slim, null, 2));
  console.log(`\nWrote ${results.length} cases to ${OUT}`);
  await browser.close();
}

main().catch((e) => { console.error(e); process.exit(1); });
