/** Matches src/features/game/game-palette.ts + board-theme.ts */
export const BRAND = {
  bg: '#1E0C02',
  surface: '#2A1206',
  surfaceBorder: '#5A3A1A',
  text: '#F2EAD3',
  textMuted: '#A08060',
  accent: '#D4A843',
  accentDim: '#8B5E3C',
  accentBright: '#F0C060',
  control: '#8B1A1A',
} as const;

export const BOARD = {
  frame: { outer: '#120603', rim: '#2A0E03', bevel: '#6B3A22' },
  wood: { base: '#3D1A0A' },
  bar: {
    surface: '#2A1006',
    groove: '#1A0804',
    hinge: '#9A8870',
    hingeShadow: '#4A3828',
  },
  bearOff: { surface: '#1E0C04', border: '#5A3A1A' },
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

export type PointState = 'default' | 'selected' | 'legal';

export function getPointColors(pointIndex: number, state: PointState = 'default') {
  if (state === 'selected') {
    return BOARD.points.selected;
  }
  if (state === 'legal') {
    return BOARD.points.legal;
  }
  return pointIndex % 2 === 0 ? BOARD.points.dark : BOARD.points.light;
}
