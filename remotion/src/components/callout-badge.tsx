import { interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';

type Props = {
  label: string;
  delay?: number;
};

export const CalloutBadge: React.FC<Props> = ({ label, delay = 0 }) => {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({
    frame: frame - delay,
    fps,
    config: { damping: 16, stiffness: 120 },
  });

  return (
    <div
      style={{
        opacity: progress,
        transform: `scale(${interpolate(progress, [0, 1], [0.85, 1])})`,
        padding: '12px 20px',
        borderRadius: 12,
        backgroundColor: 'rgba(42, 18, 6, 0.94)',
        border: `1.5px solid ${BRAND.accent}`,
        color: BRAND.accent,
        fontSize: 15,
        fontWeight: 600,
        fontFamily: 'Inter, sans-serif',
        letterSpacing: 0.3,
        boxShadow: '0 6px 24px rgba(0,0,0,0.45)',
        whiteSpace: 'nowrap',
      }}
    >
      {label}
    </div>
  );
};
