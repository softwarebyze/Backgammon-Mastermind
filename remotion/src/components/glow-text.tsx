import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';

type Props = {
  children: string;
  size?: number;
  delay?: number;
  color?: string;
  letterSpacing?: number;
  weight?: number;
  lineHeight?: number;
};

export const GlowText: React.FC<Props> = ({
  children,
  size = 48,
  delay = 0,
  color = BRAND.accent,
  letterSpacing = 3,
  weight = 800,
  lineHeight = 1.15,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 90 },
  });
  const y = interpolate(progress, [0, 1], [24, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);
  const glow = interpolate(Math.sin((frame - delay) / 18), [-1, 1], [0.25, 0.55]);

  return (
    <div
      style={{
        fontSize: size,
        fontWeight: weight,
        color,
        letterSpacing,
        lineHeight,
        fontFamily: 'Inter, sans-serif',
        textAlign: 'center',
        transform: `translateY(${y}px)`,
        opacity,
        textShadow: `0 0 32px rgba(212, 168, 67, ${glow}), 0 3px 10px rgba(0,0,0,0.45)`,
      }}
    >
      {children}
    </div>
  );
};
