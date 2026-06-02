import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';

type Props = {
  icon: string;
  title: string;
  subtitle: string;
  delay?: number;
  accent?: 'gold' | 'green' | 'default';
};

const ACCENTS = {
  gold: { bg: BRAND.accent, text: BRAND.bg, sub: '#4A2A10', border: BRAND.accentBright },
  green: { bg: '#1A2A14', text: '#A0D080', sub: '#6A9A50', border: '#4A6A30' },
  default: { bg: BRAND.surface, text: BRAND.accent, sub: BRAND.accentDim, border: BRAND.accentDim },
};

export const FeaturePill: React.FC<Props> = ({
  icon,
  title,
  subtitle,
  delay = 0,
  accent = 'default',
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = ACCENTS[accent];

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, stiffness: 120 },
  });
  const x = interpolate(progress, [0, 1], [-80, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 16,
        padding: '16px 24px',
        borderRadius: 16,
        border: `2px solid ${colors.border}`,
        backgroundColor: colors.bg,
        transform: `translateX(${x}px)`,
        opacity,
        minWidth: 280,
      }}
    >
      <div style={{ fontSize: 28, width: 36, textAlign: 'center' }}>{icon}</div>
      <div>
        <div
          style={{
            fontSize: 18,
            fontWeight: 700,
            color: colors.text,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: 0.5,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 13,
            color: colors.sub,
            fontFamily: 'Inter, sans-serif',
            marginTop: 2,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};
