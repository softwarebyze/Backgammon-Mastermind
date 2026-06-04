import type { CSSProperties, ReactNode } from 'react';
import { AbsoluteFill } from 'remotion';

import { BrandBackground } from './brand-background';

type CenteredProps = {
  children: ReactNode;
  gap?: number;
  padding?: number;
  pulse?: boolean;
  style?: CSSProperties;
};

export function SceneBackdrop({
  children,
  pulse = true,
}: {
  children: ReactNode;
  pulse?: boolean;
}) {
  return (
    <AbsoluteFill>
      <BrandBackground pulse={pulse} />
      {children}
    </AbsoluteFill>
  );
}

export function CenteredScene({
  children,
  gap = 28,
  padding = 48,
  pulse = true,
  style,
}: CenteredProps) {
  return (
    <SceneBackdrop pulse={pulse}>
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          gap,
          padding,
          ...style,
        }}
      >
        {children}
      </AbsoluteFill>
    </SceneBackdrop>
  );
}

export function SplitScene({
  children,
  padding = 64,
  pulse = true,
}: {
  children: ReactNode;
  padding?: number;
  pulse?: boolean;
}) {
  return (
    <SceneBackdrop pulse={pulse}>
      <AbsoluteFill
        style={{
          flexDirection: 'row',
          alignItems: 'center',
          padding,
          gap: 48,
        }}
      >
        {children}
      </AbsoluteFill>
    </SceneBackdrop>
  );
}
