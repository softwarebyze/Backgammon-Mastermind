/** Backgammon bear-off path: across outer edge, curve around the side, home along the opposite outer edge. */
export type HorseshoePlayer = 'white' | 'black';

export type HorseshoeMetrics = {
  pad: number;
  topY: number;
  botY: number;
  leftX: number;
  rightX: number;
  curveX: number;
};

/**
 * White rides the outer cream lane; Black is inset so both directions can
 * show at once without stacking into one stroke.
 */
export function horseshoeMetrics(
  width: number,
  height: number,
  player: HorseshoePlayer = 'white',
): HorseshoeMetrics {
  const pad = Math.max(4, width * 0.04);
  const lane = player === 'white' ? 0 : 1;
  const inset = lane * Math.max(8, height * 0.055);
  return {
    pad,
    topY: height * 0.22 + inset,
    botY: height * 0.78 - inset,
    leftX: pad + width * 0.08 + lane * width * 0.028,
    rightX: width - pad - width * 0.14 - lane * width * 0.018,
    curveX: pad + lane * width * 0.04,
  };
}

export function buildHorseshoePath(
  width: number,
  height: number,
  player: HorseshoePlayer = 'white',
): string {
  const { topY, botY, leftX, rightX, curveX } = horseshoeMetrics(width, height, player);

  if (player === 'white') {
    return [
      `M ${rightX} ${topY}`,
      `L ${leftX} ${topY}`,
      `Q ${curveX} ${height / 2} ${leftX} ${botY}`,
      `L ${rightX} ${botY}`,
    ].join(' ');
  }

  // Black: bottom-right → bottom-left → up the left side → home top-right
  return [
    `M ${rightX} ${botY}`,
    `L ${leftX} ${botY}`,
    `Q ${curveX} ${height / 2} ${leftX} ${topY}`,
    `L ${rightX} ${topY}`,
  ].join(' ');
}
