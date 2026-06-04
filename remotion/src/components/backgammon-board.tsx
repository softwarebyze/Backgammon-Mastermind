import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { BOARD } from '../brand/palette';

type Props = {
  scale?: number;
  animateCheckers?: boolean;
};

const CHECKER_POSITIONS: Array<{ x: number; y: number; color: 'white' | 'black' }> = [
  { x: 0.08, y: 0.72, color: 'white' },
  { x: 0.08, y: 0.62, color: 'white' },
  { x: 0.08, y: 0.52, color: 'white' },
  { x: 0.22, y: 0.72, color: 'black' },
  { x: 0.22, y: 0.62, color: 'black' },
  { x: 0.36, y: 0.28, color: 'white' },
  { x: 0.36, y: 0.18, color: 'white' },
  { x: 0.5, y: 0.72, color: 'black' },
  { x: 0.64, y: 0.28, color: 'white' },
  { x: 0.64, y: 0.18, color: 'white' },
  { x: 0.78, y: 0.72, color: 'black' },
  { x: 0.78, y: 0.62, color: 'black' },
  { x: 0.92, y: 0.28, color: 'white' },
  { x: 0.92, y: 0.18, color: 'white' },
];

function Point({ x, dark, height }: { x: number; dark: boolean; height: 'top' | 'bottom' }) {
  const w = 6.5;
  const h = 38;
  const color = dark ? BOARD.pointDark : BOARD.pointLight;
  const points
    = height === 'top'
      ? `${x},0 ${x + w},${h} ${x - w},${h}`
      : `${x},100 ${x + w},${100 - h} ${x - w},${100 - h}`;

  return <polygon points={points} fill={color} opacity={0.92} />;
}

export const BackgammonBoard: React.FC<Props> = ({
  scale = 1,
  animateCheckers = true,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const entrance = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const boardScale = interpolate(entrance, [0, 1], [0.85, 1]) * scale;
  const boardOpacity = interpolate(entrance, [0, 1], [0, 1]);

  return (
    <div
      style={{
        transform: `scale(${boardScale})`,
        opacity: boardOpacity,
        filter: 'drop-shadow(0 24px 48px rgba(0,0,0,0.6))',
      }}
    >
      <svg viewBox="0 0 520 360" width={520} height={360}>
        <rect x={0} y={0} width={520} height={360} rx={12} fill={BOARD.frame} />
        <rect x={6} y={6} width={508} height={348} rx={8} fill={BOARD.rim} />
        <rect x={12} y={12} width={496} height={336} rx={6} fill={BOARD.wood} />

        {Array.from({ length: 12 }, (_, i) => {
          const x = 28 + i * 38 + (i >= 6 ? 28 : 0);
          return (
            <g key={i}>
              <Point x={x} dark={i % 2 === 0} height="top" />
              <Point x={x} dark={i % 2 !== 0} height="bottom" />
            </g>
          );
        })}

        <rect x={248} y={12} width={24} height={336} rx={2} fill="#1A0804" />
        <rect x={252} y={12} width={16} height={336} fill="#2A1006" />

        <rect x={492} y={12} width={16} height={336} rx={3} fill="#1E0C04" stroke="#5A3A1A" strokeWidth={1} />

        {CHECKER_POSITIONS.map((c, i) => {
          const delay = i * 2;
          const checkerSpring = animateCheckers
            ? spring({
                frame: frame - delay,
                fps,
                config: { damping: 14, stiffness: 120 },
              })
            : 1;
          const cx = 28 + c.x * 464;
          const cy = c.y * 336 + 12;
          const r = 14 * checkerSpring;
          const fill = c.color === 'white' ? BOARD.checkerWhite : BOARD.checkerBlack;
          const stroke = c.color === 'white' ? '#8A7048' : '#5050A0';

          return (
            <g key={i} opacity={checkerSpring}>
              <circle cx={cx} cy={cy + 2} r={r} fill="rgba(0,0,0,0.35)" />
              <circle cx={cx} cy={cy} r={r} fill={fill} stroke={stroke} strokeWidth={1.5} />
              <ellipse cx={cx - 3} cy={cy - 4} rx={r * 0.35} ry={r * 0.2} fill="rgba(255,255,255,0.25)" />
            </g>
          );
        })}
      </svg>
    </div>
  );
};
