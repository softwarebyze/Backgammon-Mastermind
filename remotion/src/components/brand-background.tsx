import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

import { BRAND } from '../brand/palette';

type Props = {
  pulse?: boolean;
};

export const BrandBackground: React.FC<Props> = ({ pulse = true }) => {
  const frame = useCurrentFrame();
  const glow = pulse
    ? interpolate(Math.sin(frame / 20), [-1, 1], [0.15, 0.35])
    : 0.25;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 80% 60% at 50% 20%, rgba(212, 168, 67, ${glow}) 0%, transparent 70%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 60% 40% at 80% 90%, rgba(139, 30, 30, 0.12) 0%, transparent 60%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.04,
          backgroundImage:
            'repeating-linear-gradient(0deg, transparent, transparent 2px, rgba(212,168,67,0.3) 2px, rgba(212,168,67,0.3) 3px)',
        }}
      />
    </AbsoluteFill>
  );
};
