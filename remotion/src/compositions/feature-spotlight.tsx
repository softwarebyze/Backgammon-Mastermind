import { loadFont } from '@remotion/google-fonts/Inter';
import { LightLeak } from '@remotion/light-leaks';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';
import { BackgammonBoard } from '../components/BackgammonBoard';
import { BrandBackground } from '../components/BrandBackground';
import { DiceRoll } from '../components/DiceRoll';
import { GlowText } from '../components/GlowText';

loadFont('normal', { weights: ['400', '700', '800'], subsets: ['latin'] });

const FPS = 30;
const BEAT = 3 * FPS;
const TRANSITION = 10;

const FEATURES = [
  { emoji: '🎯', title: 'Move Hints', body: 'Legal moves glow on the board' },
  { emoji: '🧭', title: 'Direction Guide', body: 'See the path from start to home' },
  { emoji: '💾', title: 'Auto-Save', body: 'Resume your game anytime' },
  { emoji: '🎲', title: 'Roll & Play', body: 'Smooth dice, instant feedback' },
];

function FeatureBeat({ emoji, title, body, index }: { emoji: string; title: string; body: string; index: number }) {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const emojiScale = interpolate(progress, [0, 1], [0, 1.2]);
  const emojiFinal = interpolate(progress, [0.8, 1], [1.2, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' });

  return (
    <AbsoluteFill>
      <BrandBackground pulse={index % 2 === 0} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 24, padding: 48 }}>
        <div
          style={{
            fontSize: 80,
            transform: `scale(${emojiScale * emojiFinal})`,
            filter: 'drop-shadow(0 8px 24px rgba(212, 168, 67, 0.4))',
          }}
        >
          {emoji}
        </div>
        <GlowText size={36}>{title}</GlowText>
        <div
          style={{
            fontSize: 18,
            color: BRAND.textMuted,
            fontFamily: 'Inter, sans-serif',
            textAlign: 'center',
            maxWidth: 400,
            lineHeight: 1.5,
            opacity: interpolate(progress, [0.4, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          {body}
        </div>
        {index === 3 && (
          <div style={{ marginTop: 20 }}>
            <DiceRoll size={52} die1={3} die2={3} />
          </div>
        )}
        {index === 0 && (
          <div style={{ marginTop: 12 }}>
            <BackgammonBoard scale={0.55} animateCheckers={false} />
          </div>
        )}
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function FinalBeat() {
  return (
    <AbsoluteFill>
      <BrandBackground />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 20 }}>
        <GlowText size={32}>Backgammon Mastermind</GlowText>
        <div
          style={{
            fontSize: 16,
            color: BRAND.accent,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: 3,
            fontWeight: 700,
          }}
        >
          FREE ON iOS & ANDROID
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const FeatureSpotlight: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={BEAT}>
        <FeatureBeat {...FEATURES[0]} index={0} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION })}
      />
      <TransitionSeries.Sequence durationInFrames={BEAT}>
        <FeatureBeat {...FEATURES[1]} index={1} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION })}
      />
      <TransitionSeries.Sequence durationInFrames={BEAT}>
        <FeatureBeat {...FEATURES[2]} index={2} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION })}
      />
      <TransitionSeries.Sequence durationInFrames={BEAT}>
        <FeatureBeat {...FEATURES[3]} index={3} />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={16}>
        <LightLeak seed={99} hueShift={50} />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence durationInFrames={BEAT}>
        <FinalBeat />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

export const FEATURE_SPOTLIGHT_DURATION = BEAT * (FEATURES.length + 1) - TRANSITION * (FEATURES.length - 1) + 16;
