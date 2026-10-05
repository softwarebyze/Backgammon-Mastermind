import { loadFont } from '@remotion/google-fonts/Inter';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';
import { BackgammonBoard } from '../components/backgammon-board';
import { GlowText } from '../components/glow-text';
import { CenteredScene } from '../components/scene-layout';
import { fitBoardWidth } from '../lib/board-layout';

loadFont('normal', { weights: ['400', '600', '700', '800'], subsets: ['latin'] });

const FPS = 30;
const BEAT = 3 * FPS;
const TRANSITION = 12;

function TutorBeat() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 14, stiffness: 90 } });
  const boardWidth = fitBoardWidth({
    videoWidth: width,
    videoHeight: height,
    maxWidthRatio: 0.9,
    maxHeightRatio: 0.46,
  });

  return (
    <CenteredScene gap={22} padding={48}>
      <BackgammonBoard
        width={boardWidth}
        animateCheckers={false}
        legalPoints={[8, 6]}
        showMoveHintOn={8}
      />
      <GlowText size={32}>A stronger move</GlowText>
      <div
        style={{
          fontSize: 20,
          color: BRAND.textMuted,
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          maxWidth: 560,
          lineHeight: 1.45,
          opacity: interpolate(progress, [0.3, 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        The tutor stops the game and shows what to play instead.
      </div>
    </CenteredScene>
  );
}

function LessonsBeat() {
  const { width, height } = useVideoConfig();
  const boardWidth = fitBoardWidth({
    videoWidth: width,
    videoHeight: height,
    maxWidthRatio: 0.88,
    maxHeightRatio: 0.42,
  });

  return (
    <CenteredScene gap={20} padding={52} pulse={false}>
      <GlowText size={32}>Lessons</GlowText>
      <div
        style={{
          fontSize: 18,
          color: BRAND.textMuted,
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          maxWidth: 560,
          lineHeight: 1.45,
        }}
      >
        The board, direction, movement, hitting, bearing off, the pip count, and strategy.
      </div>
      <BackgammonBoard width={boardWidth} animateCheckers={false} />
    </CenteredScene>
  );
}

function CloseBeat() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 16, stiffness: 85 } });

  return (
    <CenteredScene gap={22} padding={56}>
      <Img
        src={staticFile('display-logo.png')}
        style={{
          width: 120,
          height: 120,
          borderRadius: 28,
          transform: `scale(${interpolate(progress, [0, 1], [0.92, 1])})`,
          opacity: progress,
        }}
      />
      <GlowText size={32}>Backgammon Mastermind</GlowText>
      <div
        style={{
          fontSize: 18,
          color: BRAND.textMuted,
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          opacity: progress,
        }}
      >
        Learn, then play.
      </div>
    </CenteredScene>
  );
}

export const TutorSpotlight: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={BEAT}>
        <LessonsBeat />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION })}
      />
      <TransitionSeries.Sequence durationInFrames={BEAT}>
        <TutorBeat />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={BEAT}>
        <CloseBeat />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

export const TUTOR_SPOTLIGHT_DURATION = BEAT * 3 - TRANSITION;
