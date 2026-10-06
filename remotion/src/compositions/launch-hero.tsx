import { loadFont } from '@remotion/google-fonts/Inter';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
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
  const logoSpring = spring({ frame, fps, config: { damping: 18, stiffness: 80 } });
  const opacity = interpolate(logoSpring, [0, 1], [0, 1]);

  return (
    <CenteredScene gap={28} padding={56} pulse={false}>
      <Img
        src={staticFile('display-logo.png')}
        style={{
          width: 168,
          height: 168,
          borderRadius: 36,
          opacity,
        }}
      />
      <GlowText size={40} weight={650}>
        Backgammon Mastermind
      </GlowText>
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
      <GlowText size={22} color={BRAND.textMuted} weight={500}>
        Learn the rules, then play.
      </GlowText>
    </CenteredScene>
  );
}

function FeaturesScene() {
  return (
    <CenteredScene gap={16} padding={48} pulse={false}>
      <GlowText size={28}>
        On the board
      </GlowText>
      <div style={{ width: '100%', maxWidth: 720, display: 'flex', flexDirection: 'column', gap: 12 }}>
        <FeaturePill title="Lessons" subtitle="Rules, on the board you play on" delay={6} fullWidth />
        <FeaturePill title="Tutor" subtitle="Stops on a blunder and shows a stronger move" delay={12} fullWidth />
        <FeaturePill title="Strategy" subtitle="Names the plan in front of you" delay={18} fullWidth />
        <FeaturePill title="Pass and play" subtitle="Two players, one device" delay={24} fullWidth />
      </div>
    </CenteredScene>
  );
}

function CtaScene() {
  const { width, height } = useVideoConfig();
  const boardWidth = fitBoardWidth({ videoWidth: width, videoHeight: height, maxWidthRatio: 0.88, maxHeightRatio: 0.42 });

  return (
    <CenteredScene gap={24} padding={52} pulse={false}>
      <BackgammonBoard width={boardWidth} animateCheckers={false} />
      <GlowText size={28}>
        Learn and play
      </GlowText>
      <div
        style={{
          fontSize: 18,
          color: BRAND.textMuted,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        Against the computer, or with someone beside you.
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
      <TransitionSeries.Sequence durationInFrames={SCENE}>
        <FeaturesScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION })}
      />
      <TransitionSeries.Sequence durationInFrames={SCENE}>
        <CtaScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

export const LAUNCH_HERO_DURATION = SCENE * 4 - TRANSITION * 2 + 20;
