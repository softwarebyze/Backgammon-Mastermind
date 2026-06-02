import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';

type Props = {
  children: string;
  size?: number;
  delay?: number;
  color?: string;
  letterSpacing?: number;
  weight?: number;
};

export const GlowText: React.FC<Props> = ({
  children,
  size = 48,
  delay = 0,
  color = BRAND.accent,
  letterSpacing = 4,
  weight = 800,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 90 },
  });
  const y = interpolate(progress, [0, 1], [30, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const glow = interpolate(Math.sin((frame - delay) / 15), [-1, 1], [0.3, 0.7]);

  return (
    <div
      style={{
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        transform: `translateY(${y}px)`,
        opacity,
        textShadow: `0 0 40px rgba(212, 168, 67, ${glow}), 0 4px 12px rgba(0,0,0,0.5)`,
      }}
    >
      {children}
    </div>
  );
};
