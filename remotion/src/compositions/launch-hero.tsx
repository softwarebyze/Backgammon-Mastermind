import { loadFont } from '@remotion/google-fonts/Inter';
import { LightLeak } from '@remotion/light-leaks';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { slide } from '@remotion/transitions/slide';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';
import { BackgammonBoard } from '../components/backgammon-board';
import { DiceRoll } from '../components/dice-roll';
import { FeaturePill } from '../components/feature-pill';
import { GlowText } from '../components/glow-text';
import { CenteredScene } from '../components/scene-layout';
import { fitBoardWidth } from '../lib/board-layout';

loadFont('normal', { weights: ['400', '600', '700', '800'], subsets: ['latin'] });

const FPS = 30;
const SCENE = 4 * FPS;
const TRANSITION = 12;

function LogoScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const logoSpring = spring({ frame, fps, config: { damping: 14, stiffness: 80 } });
  const scale = interpolate(logoSpring, [0, 1], [0.6, 1]);
  const glow = interpolate(Math.sin(frame / 14), [-1, 1], [0.35, 0.75]);

  return (
    <CenteredScene gap={36} padding={56}>
      <div
        style={{
          transform: `scale(${scale})`,
          borderRadius: 32,
          border: `3px solid ${BRAND.accent}`,
          overflow: 'hidden',
          boxShadow: `0 0 72px rgba(212, 168, 67, ${glow}), 0 10px 40px rgba(0,0,0,0.5)`,
        }}
      >
        <Img src={staticFile('display-logo.png')} style={{ width: 200, height: 200 }} />
      </div>
      <GlowText size={42} letterSpacing={8}>
        BACKGAMMON
      </GlowText>
      <div
        style={{
          fontSize: 20,
          color: BRAND.accentDim,
          letterSpacing: 6,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          opacity: interpolate(logoSpring, [0.4, 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        MASTERMIND
      </div>
    </CenteredScene>
  );
}

function BoardScene() {
  const { width, height } = useVideoConfig();
  const boardWidth = fitBoardWidth({ videoWidth: width, videoHeight: height, maxWidthRatio: 0.94, maxHeightRatio: 0.48 });

  return (
    <CenteredScene gap={32} padding={40}>
      <BackgammonBoard width={boardWidth} showMoveHintOn={8} />
      <DiceRoll size={Math.round(boardWidth * 0.09)} die1={5} die2={3} />
      <GlowText size={24} color={BRAND.textMuted} letterSpacing={2} weight={500}>
        Roll. Move. Dominate.
      </GlowText>
    </CenteredScene>
  );
}

function FeaturesScene() {
  return (
    <CenteredScene gap={16} padding={48} pulse={false}>
      <GlowText size={32} delay={0}>
        Play Your Way
      </GlowText>
      <div style={{ width: '100%', maxWidth: 920, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FeaturePill icon="🤖" title="vs Computer" subtitle="Sharpen skills against AI" delay={6} accent="gold" fullWidth />
        <FeaturePill icon="👥" title="2 Players" subtitle="Pass & play on one device" delay={12} fullWidth />
        <FeaturePill icon="💡" title="Move Hints" subtitle="Glow shows legal moves" delay={18} accent="green" fullWidth />
        <FeaturePill icon="▶️" title="Resume Anytime" subtitle="Pick up where you left off" delay={24} fullWidth />
      </div>
    </CenteredScene>
  );
}

function CtaScene() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const ctaSpring = spring({ frame: frame - 8, fps, config: { damping: 16, stiffness: 90 } });
  const btnScale = interpolate(ctaSpring, [0, 1], [0.85, 1]);
  const boardWidth = fitBoardWidth({ videoWidth: width, videoHeight: height, maxWidthRatio: 0.88, maxHeightRatio: 0.32 });

  return (
    <CenteredScene gap={28} padding={52}>
      <BackgammonBoard width={boardWidth} animateCheckers={false} />
      <GlowText size={30} color={BRAND.text} letterSpacing={1} weight={700}>
        Master the board
      </GlowText>
      <div
        style={{
          fontSize: 20,
          color: BRAND.accentDim,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: 0.5,
        }}
      >
        one move at a time
      </div>
      <div
        style={{
          transform: `scale(${btnScale})`,
          opacity: ctaSpring,
          marginTop: 12,
          padding: '20px 56px',
          borderRadius: 18,
          backgroundColor: BRAND.accent,
          border: `2px solid ${BRAND.accentBright}`,
          boxShadow: '0 10px 36px rgba(212, 168, 67, 0.45)',
        }}
      >
        <span
          style={{
            fontSize: 22,
            fontWeight: 700,
            color: BRAND.bg,
            fontFamily: 'Inter, sans-serif',
            letterSpacing: 0.5,
          }}
        >
          Download Free
        </span>
      </div>
    </CenteredScene>
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
      <TransitionSeries.Overlay durationInFrames={18}>
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
