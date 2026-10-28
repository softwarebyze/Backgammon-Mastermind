import Svg, { Circle, Line, Path, Rect } from 'react-native-svg';

/** A miniature board and starting stacks rather than an abstract layout icon. */
export function StandardSetupIcon() {
  return (
    <Svg width={28} height={22} viewBox="0 0 28 22" accessible={false}>
      <Rect x={1} y={1} width={26} height={20} rx={2} fill="#2A1408" stroke="#CBB8A7" />
      <Line x1={14} y1={1} x2={14} y2={21} stroke="#CBB8A7" />
      <Path d="M3 2H7L5 10Z M8 20H12L10 12Z M16 2H20L18 10Z M21 20H25L23 12Z" fill="#B79538" />
      <Path d="M8 2H12L10 10Z M3 20H7L5 12Z M21 2H25L23 10Z M16 20H20L18 12Z" fill="#8B2424" />
      {[4, 7].map(y => <Circle key={y} cx={5} cy={y} r={1.7} fill="#F2EAD3" />)}
      {[14, 17].map(y => <Circle key={y} cx={23} cy={y} r={1.7} fill="#1E1E30" stroke="#BBA070" strokeWidth={0.6} />)}
    </Svg>
  );
}
