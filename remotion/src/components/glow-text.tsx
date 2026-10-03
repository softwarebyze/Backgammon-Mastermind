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
  color = BRAND.text,
  letterSpacing = 0,
  weight = 600,
  lineHeight = 1.15,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 18, stiffness: 90 },
  });
  const y = interpolate(progress, [0, 1], [12, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

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
      }}
    >
      {children}
    </div>
  );
};
