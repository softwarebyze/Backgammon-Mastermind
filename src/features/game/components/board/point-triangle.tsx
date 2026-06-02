import type { PointPalette } from './board-theme';
import * as React from 'react';
import Svg, { Polygon } from 'react-native-svg';

type Props = {
  isTop: boolean;
  width: number;
  height: number;
  palette: PointPalette;
};

/**
 * Flat point triangles — no heavy vertical gradient (fixes white-on-cream clash).
 */
export function PointTriangle({ isTop, width, height, palette }: Props) {
  if (width <= 0 || height <= 0) {
    return null;
  }

  const points = isTop
    ? `0,0 ${width},0 ${width / 2},${height}`
    : `0,${height} ${width},${height} ${width / 2},0`;

  return (
    <Svg
      width={width}
      height={height}
      style={{ position: 'absolute', [isTop ? 'top' : 'bottom']: 0, left: 0 }}
    >
      <Polygon
        points={points}
        fill={palette.fill}
        stroke={palette.stroke}
        strokeWidth={0.75}
      />
    </Svg>
  );
}
