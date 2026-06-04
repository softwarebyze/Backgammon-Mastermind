import { BOARD } from '../brand/palette';

type Props = {
  player: 'white' | 'black';
  size: number;
  showHint?: boolean;
};

export function CheckerPiece({ player, size, showHint }: Props) {
  const colors = player === 'white' ? BOARD.checker.white : BOARD.checker.black;
  const cx = size / 2;
  const cy = size / 2;
  const radius = size / 2 - 2;
  const innerRadius = size * 0.27;
  const gradId = `checker-${player}-${size}`;

  return (
    <g>
      {showHint && (
        <circle
          cx={cx}
          cy={cy}
          r={radius + 2}
          fill="none"
          stroke="rgba(212, 168, 67, 0.65)"
          strokeWidth={2}
        />
      )}
      <circle cx={cx} cy={cy + 1.5} r={radius} fill="rgba(0,0,0,0.35)" />
      <defs>
        <radialGradient id={gradId} cx="38%" cy="32%" r="62%">
          <stop offset="0%" stopColor={colors.highlight} />
          <stop offset="55%" stopColor={colors.mid} />
          <stop offset="100%" stopColor={colors.shadow} />
        </radialGradient>
      </defs>
      <circle
        cx={cx}
        cy={cy}
        r={radius}
        fill={`url(#${gradId})`}
        stroke={colors.rim}
        strokeWidth={1.5}
      />
      <circle
        cx={cx}
        cy={cy}
        r={innerRadius}
        fill="none"
        stroke={player === 'white' ? 'rgba(255,255,255,0.65)' : 'rgba(140,140,210,0.45)'}
        strokeWidth={1.25}
      />
      <circle
        cx={cx - radius * 0.25}
        cy={cy - radius * 0.3}
        r={radius * 0.18}
        fill={player === 'white' ? 'rgba(255,255,255,0.35)' : 'rgba(255,255,255,0.12)'}
      />
    </g>
  );
}
