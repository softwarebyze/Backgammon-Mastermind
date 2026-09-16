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

export function horseshoeMetrics(
  width: number,
  height: number,
  _player: HorseshoePlayer = 'white',
): HorseshoeMetrics {
  const pad = Math.max(4, width * 0.04);
  return {
    pad,
    topY: height * 0.22,
    botY: height * 0.78,
    leftX: pad + width * 0.08,
    rightX: width - pad - width * 0.14,
    curveX: pad,
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
