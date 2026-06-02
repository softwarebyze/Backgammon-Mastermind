import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';

const FACE_DOTS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.5], [0.72, 0.5], [0.28, 0.72], [0.72, 0.72]],
};

function Die({ value, size, rotation, offsetY }: { value: number; size: number; rotation: number; offsetY: number }) {
  const dots = FACE_DOTS[value] ?? FACE_DOTS[1];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.18,
        background: `linear-gradient(145deg, ${BRAND.text} 0%, #D4C4A0 100%)`,
        border: `2px solid ${BRAND.accentBright}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.5), inset 0 2px 4px rgba(255,255,255,0.4)',
        transform: `rotate(${rotation}deg) translateY(${offsetY}px)`,
        position: 'relative',
      }}
    >
      {dots.map(([x, y], i) => (
        <div
          key={i}
          style={{
            position: 'absolute',
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            width: size * 0.14,
            height: size * 0.14,
            borderRadius: '50%',
            backgroundColor: BRAND.bg,
            transform: 'translate(-50%, -50%)',
          }}
        />
      ))}
    </div>
  );
}

type Props = {
  size?: number;
  gap?: number;
  die1?: number;
  die2?: number;
};

export const DiceRoll: React.FC<Props> = ({ size = 64, gap = 16, die1 = 4, die2 = 2 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rollProgress = spring({ frame, fps, config: { damping: 12, stiffness: 100 } });
  const wobble = interpolate(rollProgress, [0, 0.6, 1], [720, 180, 0]);
  const bounce = interpolate(
    Math.sin(frame / 4),
    [-1, 1],
    [0, rollProgress > 0.8 ? 0 : -8],
  );

  const values = rollProgress > 0.7
    ? [die1, die2]
    : [
        ((Math.floor(frame / 3) % 6) + 1),
        ((Math.floor(frame / 4 + 2) % 6) + 1),
      ];

  return (
    <div style={{ display: 'flex', gap, alignItems: 'center', justifyContent: 'center' }}>
      <Die value={values[0]} size={size} rotation={wobble} offsetY={bounce} />
      <Die value={values[1]} size={size} rotation={-wobble * 0.8} offsetY={bounce * 0.6} />
    </div>
  );
};
