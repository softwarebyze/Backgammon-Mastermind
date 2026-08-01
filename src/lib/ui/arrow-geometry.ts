export type Point2 = { x: number; y: number };

export type ArrowheadStyle = {
  length?: number;
  halfWidth?: number;
  inset?: number;
};

/** Unit vector from `from` toward `to`; falls back to east if degenerate. */
export function unitVector(from: Point2, to: Point2): Point2 {
  const dx = to.x - from.x;
  const dy = to.y - from.y;
  const len = Math.hypot(dx, dy);
  if (len < 1e-6) {
    return { x: 1, y: 0 };
  }
  return { x: dx / len, y: dy / len };
}

export type Arrowhead = {
  /** Line should end here (arrow base center). */
  lineEnd: Point2;
  /** SVG polygon `points` attribute for a filled arrowhead. */
  polygonPoints: string;
};

/**
 * Build a symmetric arrowhead at `tip`, pointing along `direction`.
 * Line stroke should end at `lineEnd` so the head sits flush on the path.
 */
export function buildArrowhead(
  tip: Point2,
  direction: Point2,
  style: ArrowheadStyle = {},
): Arrowhead {
  const { x: ux, y: uy } = direction;
  const length = style.length ?? 12;
  const halfWidth = style.halfWidth ?? 6;
  const inset = style.inset ?? 0;
  const px = -uy;
  const py = ux;
  const tipX = tip.x - ux * inset;
  const tipY = tip.y - uy * inset;
  const baseX = tipX - ux * length;
  const baseY = tipY - uy * length;
  return {
    lineEnd: { x: baseX, y: baseY },
    polygonPoints: [
      `${tipX},${tipY}`,
      `${baseX + px * halfWidth},${baseY + py * halfWidth}`,
      `${baseX - px * halfWidth},${baseY - py * halfWidth}`,
    ].join(' '),
  };
}

/** Arrowhead for the horseshoe direction overlay (path ends along outer edge, east). */
export function horseshoeArrowhead(
  width: number,
  height: number,
  player: 'white' | 'black' = 'white',
): Arrowhead {
  const pad = Math.max(4, width * 0.04);
  const topY = height * 0.22;
  const botY = height * 0.78;
  const rightX = width - pad - width * 0.14;

  if (player === 'white') {
    return buildArrowhead({ x: rightX, y: botY }, { x: 1, y: 0 }, { length: 14, halfWidth: 7.5 });
  }
  return buildArrowhead({ x: rightX, y: topY }, { x: 1, y: 0 }, { length: 14, halfWidth: 7.5 });
}
