import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';

type Props = {
  icon: string;
  title: string;
  subtitle: string;
  delay?: number;
  accent?: 'gold' | 'green' | 'default';
  fullWidth?: boolean;
};

const ACCENTS = {
  gold: { bg: BRAND.accent, text: BRAND.bg, sub: '#4A2A10', border: BRAND.accentBright },
  green: { bg: '#1A2A14', text: '#A0D080', sub: '#6A9A50', border: '#4A6A30' },
  default: { bg: BRAND.surface, text: BRAND.accent, sub: BRAND.accentDim, border: BRAND.surfaceBorder },
};

export const FeaturePill: React.FC<Props> = ({
  icon,
  title,
  subtitle,
  delay = 0,
  accent = 'default',
  fullWidth = false,
}) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const colors = ACCENTS[accent];

  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, stiffness: 120 },
  });
  const x = interpolate(progress, [0, 1], [-60, 0]);
  const opacity = interpolate(progress, [0, 1], [0, 1]);

  return (
    <div
      style={{
        display: 'flex',
        alignItems: 'center',
        gap: 18,
        padding: '18px 28px',
        borderRadius: 16,
        border: `2px solid ${colors.border}`,
        backgroundColor: colors.bg,
        transform: `translateX(${x}px)`,
        opacity,
        width: fullWidth ? '100%' : undefined,
        maxWidth: fullWidth ? 920 : 520,
        minWidth: 300,
      }}
    >
      <div style={{ fontSize: 32, width: 40, textAlign: 'center', flexShrink: 0 }}>{icon}</div>
      <div style={{ flex: 1 }}>
        <div
          style={{
            fontSize: 20,
            fontWeight: 700,
            color: colors.text,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: 0.3,
          }}
        >
          {title}
        </div>
        <div
          style={{
            fontSize: 14,
            color: colors.sub,
            fontFamily: 'Inter, sans-serif',
            marginTop: 4,
            lineHeight: 1.35,
          }}
        >
          {subtitle}
        </div>
      </div>
    </div>
  );
};
