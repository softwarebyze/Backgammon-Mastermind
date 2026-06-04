import { AbsoluteFill, interpolate, useCurrentFrame } from 'remotion';

import { BRAND } from '../brand/palette';

type Props = {
  pulse?: boolean;
};

export const BrandBackground: React.FC<Props> = ({ pulse = true }) => {
  const frame = useCurrentFrame();
  const glow = pulse
    ? interpolate(Math.sin(frame / 24), [-1, 1], [0.12, 0.28])
    : 0.2;

  return (
    <AbsoluteFill style={{ backgroundColor: BRAND.bg }}>
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 70% 50% at 50% 15%, rgba(212, 168, 67, ${glow}) 0%, transparent 65%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          background: `radial-gradient(ellipse 50% 35% at 15% 85%, rgba(122, 24, 24, 0.1) 0%, transparent 55%)`,
        }}
      />
      <div
        style={{
          position: 'absolute',
          inset: 0,
          opacity: 0.03,
          backgroundImage:
            'repeating-linear-gradient(90deg, transparent, transparent 3px, rgba(212,168,67,0.25) 3px, rgba(212,168,67,0.25) 4px)',
        }}
      />
    </AbsoluteFill>
  );
};
