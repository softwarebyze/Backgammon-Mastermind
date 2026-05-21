/**
 * Render icon-source.png with the standard 2-5-3-5 starting position.
 * Same layout as src/lib/game/constants.ts and backgammon.com board setup guide.
 */
import { Buffer } from 'node:buffer';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import sharp from 'sharp';

import { createInitialPoints } from '../src/lib/game/constants';

const scriptDir = fileURLToPath(new URL('.', import.meta.url));
const root = join(scriptDir, '..');
const outPath = join(root, 'assets', 'brand', 'icon-source.png');

const SIZE = 1024;
const FRAME = 48;
const BAR_W = 36;
const MID_H = 28;

const COLORS = {
  frame: '#3A1005',
  frameInner: '#4A1E07',
  bar: '#2A0E03',
  pointDark: '#8B1A1A',
  pointLight: '#D4A843',
  whiteChecker: '#F2EAD3',
  whiteCheckerBorder: '#BBA070',
  blackChecker: '#1E1E30',
  blackCheckerBorder: '#5050A0',
};

const TOP_LEFT = [13, 14, 15, 16, 17, 18];
const TOP_RIGHT = [19, 20, 21, 22, 23, 24];
const BOT_LEFT = [12, 11, 10, 9, 8, 7];
const BOT_RIGHT = [6, 5, 4, 3, 2, 1];

function pointColor(index: number) {
  return index % 2 === 0 ? COLORS.pointDark : COLORS.pointLight;
}

function checkerColors(player: 'white' | 'black') {
  return player === 'white'
    ? { fill: COLORS.whiteChecker, stroke: COLORS.whiteCheckerBorder }
    : { fill: COLORS.blackChecker, stroke: COLORS.blackCheckerBorder };
}

function triangleSvg(opts: {
  x: number;
  y: number;
  w: number;
  h: number;
  isTop: boolean;
  fill: string;
}) {
  const { x, y, w, h, isTop, fill } = opts;
  const points = isTop
    ? `${x},${y} ${x + w},${y} ${x + w / 2},${y + h}`
    : `${x},${y + h} ${x + w},${y + h} ${x + w / 2},${y}`;
  return `<polygon points="${points}" fill="${fill}" stroke="#2A0E03" stroke-width="1"/>`;
}

function checkerStackSvg(opts: {
  x: number;
  baseY: number;
  w: number;
  h: number;
  isTop: boolean;
  player: 'white' | 'black';
  count: number;
}) {
  const { x, baseY, w, h, isTop, player, count } = opts;
  if (count === 0)
    return '';

  const { fill, stroke } = checkerColors(player);
  const r = w * 0.36;
  const cx = x + w / 2;
  const maxStack = Math.min(count, 5);
  const step = Math.min(r * 1.65, (h - r * 2) / Math.max(maxStack - 1, 1));
  const parts: string[] = [];

  for (let i = 0; i < maxStack; i++) {
    const cy = isTop
      ? baseY + r + i * step
      : baseY + h - r - i * step;
    parts.push(
      `<circle cx="${cx}" cy="${cy}" r="${r}" fill="${fill}" stroke="${stroke}" stroke-width="2.5"/>`,
      `<circle cx="${cx}" cy="${cy}" r="${r * 0.28}" fill="none" stroke="${stroke}" stroke-width="1.5" opacity="0.6"/>`,
    );
  }

  return parts.join('');
}

function columnBlock(opts: {
  indices: number[];
  x0: number;
  y0: number;
  colW: number;
  pointH: number;
  isTop: boolean;
  points: ReturnType<typeof createInitialPoints>;
}) {
  const { indices, x0, y0, colW, pointH, isTop, points } = opts;
  return indices
    .map((index, i) => {
      const x = x0 + i * colW;
      const point = points[index];
      const tri = triangleSvg({
        x,
        y: y0,
        w: colW,
        h: pointH,
        isTop,
        fill: pointColor(index),
      });
      const checkers
        = point.player && point.count > 0
          ? checkerStackSvg({
              x,
              baseY: y0,
              w: colW,
              h: pointH,
              isTop,
              player: point.player,
              count: point.count,
            })
          : '';
      return tri + checkers;
    })
    .join('');
}

function buildSvg() {
  const points = createInitialPoints();
  const inner = SIZE - FRAME * 2;
  const colW = (inner - BAR_W) / 12;
  const pointH = (inner - MID_H) / 2;
  const leftX = FRAME;
  const rightX = FRAME + colW * 6 + BAR_W;
  const topY = FRAME;
  const botY = FRAME + pointH + MID_H;
  const barX = FRAME + colW * 6;
  const blockOpts = { colW, pointH, points };

  return `<?xml version="1.0" encoding="UTF-8"?>
<svg width="${SIZE}" height="${SIZE}" viewBox="0 0 ${SIZE} ${SIZE}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${SIZE}" height="${SIZE}" fill="${COLORS.frame}"/>
  <rect x="${FRAME - 6}" y="${FRAME - 6}" width="${inner + 12}" height="${inner + 12}" rx="12" fill="#5A2810"/>
  <rect x="${FRAME}" y="${FRAME}" width="${inner}" height="${inner}" rx="8" fill="${COLORS.frameInner}"/>
  ${columnBlock({ indices: TOP_LEFT, x0: leftX, y0: topY, isTop: true, ...blockOpts })}
  ${columnBlock({ indices: TOP_RIGHT, x0: rightX, y0: topY, isTop: true, ...blockOpts })}
  ${columnBlock({ indices: BOT_LEFT, x0: leftX, y0: botY, isTop: false, ...blockOpts })}
  ${columnBlock({ indices: BOT_RIGHT, x0: rightX, y0: botY, isTop: false, ...blockOpts })}
  <rect x="${barX}" y="${FRAME}" width="${BAR_W}" height="${inner}" fill="${COLORS.bar}"/>
  <rect x="${barX}" y="${FRAME + pointH}" width="${BAR_W}" height="${MID_H}" fill="#3A1005"/>
</svg>`;
}

async function main() {
  const svg = buildSvg();
  await sharp(Buffer.from(svg)).png().toFile(outPath);
  console.log('Wrote assets/brand/icon-source.png (standard 2-5-3-5 setup)');
  console.log('  white: 2@24, 5@13, 3@8, 5@6');
  console.log('  black: 2@1, 5@12, 3@17, 5@19');
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
