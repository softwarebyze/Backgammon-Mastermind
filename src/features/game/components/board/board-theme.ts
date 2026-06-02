export type PointPalette = {
  fill: string;
  stroke: string;
};

export const BOARD_THEME = {
  frame: {
    outer: '#120603',
    rim: '#2A0E03',
    bevel: '#6B3A22',
  },
  wood: {
    base: '#3D1A0A',
  },
  bar: {
    surface: '#2A1006',
    groove: '#1A0804',
    hinge: '#9A8870',
    hingeShadow: '#4A3828',
  },
  bearOff: {
    surface: '#1E0C04',
    border: '#5A3A1A',
  },
  points: {
    dark: { fill: '#7A1818', stroke: '#5C1010' },
    light: { fill: '#B89438', stroke: '#8A7028' },
    selected: { fill: '#C8A800', stroke: '#9A8200' },
    legal: { fill: '#3D7A42', stroke: '#2A5E2E' },
  },
  checker: {
    white: { highlight: '#FFFAF0', mid: '#F2EAD3', shadow: '#BBA070', rim: '#8A7048' },
    black: { highlight: '#4A4A68', mid: '#1E1E30', shadow: '#0A0A14', rim: '#5050A0' },
  },
} as const;

export function getPointPalette(
  pointIndex: number,
  state: 'default' | 'selected' | 'legal',
): PointPalette {
  if (state === 'selected') {
    return BOARD_THEME.points.selected;
  }
  if (state === 'legal') {
    return BOARD_THEME.points.legal;
  }
  const isDark = pointIndex % 2 === 0;
  return isDark ? BOARD_THEME.points.dark : BOARD_THEME.points.light;
}
