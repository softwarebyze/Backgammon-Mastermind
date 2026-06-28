/** Backgammon bear-off path: across outer edge, curve around the side, home along the opposite outer edge. */
export function buildHorseshoePath(
  width: number,
  height: number,
  player: 'white' | 'black' = 'white',
): string {
  const pad = Math.max(4, width * 0.04);
  const topY = height * 0.22;
  const botY = height * 0.78;
  const leftX = pad + width * 0.08;
  const rightX = width - pad - width * 0.14;

  if (player === 'white') {
    return [
      `M ${rightX} ${topY}`,
      `L ${leftX} ${topY}`,
      `Q ${pad} ${height / 2} ${leftX} ${botY}`,
      `L ${rightX} ${botY}`,
    ].join(' ');
  }

  // Black: bottom-right → bottom-left → up the left side → home top-right
  return [
    `M ${rightX} ${botY}`,
    `L ${leftX} ${botY}`,
    `Q ${pad} ${height / 2} ${leftX} ${topY}`,
    `L ${rightX} ${topY}`,
  ].join(' ');
}
