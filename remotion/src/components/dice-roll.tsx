import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

const FACE_DOTS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.5], [0.72, 0.5], [0.28, 0.72], [0.72, 0.72]],
};

function Die({
  value,
  size,
  playerColor,
  rotation,
  lift,
}: {
  value: number;
  size: number;
  playerColor: 'white' | 'black';
  rotation: number;
  lift: number;
}) {
  const isWhite = playerColor === 'white';
  const dots = FACE_DOTS[value] ?? FACE_DOTS[1];

  return (
    <div
      style={{
        width: size,
        height: size,
        borderRadius: size * 0.16,
        backgroundColor: isWhite ? '#F2EAD3' : '#1E1E30',
        border: `2px solid ${isWhite ? '#BBA070' : '#5050A0'}`,
        boxShadow: '0 6px 20px rgba(0,0,0,0.45), inset 0 1px 3px rgba(255,255,255,0.25)',
        transform: `rotate(${rotation}deg) translateY(${lift}px)`,
        position: 'relative',
      }}
    >
      {dots.map(([x, y]) => (
        <div
          key={`${x}-${y}`}
          style={{
            position: 'absolute',
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            width: size * 0.13,
            height: size * 0.13,
            borderRadius: '50%',
            backgroundColor: isWhite ? '#2A1A08' : '#E0E0FF',
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
  playerColor?: 'white' | 'black';
};

export const DiceRoll: React.FC<Props> = ({
  size = 64,
  gap = 14,
  die1 = 4,
  die2 = 2,
  playerColor = 'white',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const rollProgress = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const settling = rollProgress > 0.75;
  const wobble = settling ? 0 : interpolate(rollProgress, [0, 1], [18, 4]);
  const lift = settling ? 0 : interpolate(Math.sin(frame / 3), [-1, 1], [-6, 0]);

  const values = settling
    ? [die1, die2]
    : [
        (Math.floor(frame / 3) % 6) + 1,
        (Math.floor(frame / 4 + 2) % 6) + 1,
      ];

  return (
    <div style={{ display: 'flex', gap, alignItems: 'center', justifyContent: 'center' }}>
      <Die value={values[0]} size={size} playerColor={playerColor} rotation={wobble} lift={lift} />
      <Die
        value={values[1]}
        size={size}
        playerColor={playerColor}
        rotation={-wobble * 0.7}
        lift={lift * 0.5}
      />
    </div>
  );
};
