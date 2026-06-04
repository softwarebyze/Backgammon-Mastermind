/** Backgammon bear-off path: across top, curve down the left side, home along the bottom. */
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

  const isWhite = player === 'white';
  const startX = isWhite ? rightX : leftX;
  const endX = isWhite ? rightX : leftX;
  const startY = isWhite ? topY : botY;
  const endY = isWhite ? botY : topY;

  return [
    `M ${startX} ${startY}`,
    `L ${leftX} ${startY}`,
    `Q ${pad} ${height / 2} ${leftX} ${botY}`,
    `L ${endX} ${endY}`,
  ].join(' ');
}
