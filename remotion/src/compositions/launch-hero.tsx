import { loadFont } from '@remotion/google-fonts/Inter';
import { LightLeak } from '@remotion/light-leaks';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';
import { BackgammonBoard } from '../components/BackgammonBoard';
import { BrandBackground } from '../components/BrandBackground';
import { DiceRoll } from '../components/DiceRoll';
import { FeaturePill } from '../components/FeaturePill';
import { GlowText } from '../components/GlowText';

loadFont('normal', { weights: ['400', '700', '800'], subsets: ['latin'] });

const FPS = 30;
const SCENE = 4 * FPS;
const TRANSITION = 12;

function LogoScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const scale = interpolate(logoSpring, [0, 1], [0.5, 1]);
  const glow = interpolate(Math.sin(frame / 12), [-1, 1], [0.4, 0.9]);

  return (
    <AbsoluteFill>
      <BrandBackground />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          gap: 32,
        }}
      >
        <div
          style={{
            transform: `scale(${scale})`,
            borderRadius: 28,
            border: `3px solid ${BRAND.accent}`,
            overflow: 'hidden',
            boxShadow: `0 0 60px rgba(212, 168, 67, ${glow}), 0 8px 32px rgba(0,0,0,0.5)`,
          }}
        >
          <Img src={staticFile('display-logo.png')} style={{ width: 140, height: 140 }} />
        </div>
        <GlowText size={36} letterSpacing={6}>
          BACKGAMMON
        </GlowText>
        <div
          style={{
            fontSize: 16,
            color: BRAND.accentDim,
            letterSpacing: 3,
            fontFamily: 'Inter, sans-serif',
            opacity: interpolate(logoSpring, [0.5, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
          }}
        >
          MASTERMIND
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function BoardScene() {
  return (
    <AbsoluteFill>
      <BrandBackground />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 40 }}>
        <BackgammonBoard scale={1.1} />
        <DiceRoll size={72} die1={5} die2={3} />
        <GlowText size={22} color={BRAND.textMuted} letterSpacing={2} weight={400}>
          Roll. Move. Dominate.
        </GlowText>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function FeaturesScene() {
  return (
    <AbsoluteFill>
      <BrandBackground pulse={false} />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          gap: 14,
          padding: 40,
        }}
      >
        <GlowText size={28} delay={0}>
          Play Your Way
        </GlowText>
        <FeaturePill icon="🤖" title="vs Computer" subtitle="Sharpen skills against AI" delay={8} accent="gold" />
        <FeaturePill icon="👥" title="2 Players" subtitle="Pass & play on one device" delay={14} />
        <FeaturePill icon="💡" title="Move Hints" subtitle="Glow shows legal moves" delay={20} accent="green" />
        <FeaturePill icon="▶️" title="Resume Anytime" subtitle="Pick up where you left off" delay={26} />
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function CtaScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const ctaSpring = spring({ frame: frame - 10, fps, config: { damping: 16, stiffness: 90 } });
  const btnScale = interpolate(ctaSpring, [0, 1], [0.8, 1]);

  return (
    <AbsoluteFill>
      <BrandBackground />
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          gap: 36,
          padding: 48,
        }}
      >
        <BackgammonBoard scale={0.7} animateCheckers={false} />
        <GlowText size={26} color={BRAND.text} letterSpacing={1} weight={700}>
          Master the board
        </GlowText>
        <div
          style={{
            fontSize: 18,
            color: BRAND.accentDim,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: 1,
            textAlign: 'center',
          }}
        >
          one move at a time
        </div>
        <div
          style={{
            transform: `scale(${btnScale})`,
            opacity: ctaSpring,
            marginTop: 20,
            padding: '18px 48px',
            borderRadius: 16,
            backgroundColor: BRAND.accent,
            border: `2px solid ${BRAND.accentBright}`,
            boxShadow: '0 8px 32px rgba(212, 168, 67, 0.4)',
          }}
        >
          <span
            style={{
              fontSize: 20,
              fontWeight: 700,
              color: BRAND.bg,
              fontFamily: 'Inter, sans-serif',
              letterSpacing: 1,
            }}
          >
            Download Free
          </span>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

export const LaunchHero: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={SCENE}>
        <LogoScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION })}
      />
      <TransitionSeries.Sequence durationInFrames={SCENE}>
        <BoardScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={20}>
        <LightLeak seed={42} hueShift={45} />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence durationInFrames={SCENE}>
        <FeaturesScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={slide({ direction: 'from-bottom' })}
        timing={linearTiming({ durationInFrames: TRANSITION })}
      />
      <TransitionSeries.Sequence durationInFrames={SCENE}>
        <CtaScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

export const LAUNCH_HERO_DURATION = SCENE * 4 - TRANSITION * 2 + 20;
