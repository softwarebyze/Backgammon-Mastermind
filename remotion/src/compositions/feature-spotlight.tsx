import { loadFont } from '@remotion/google-fonts/Inter';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import * as React from 'react';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';
import { BackgammonBoard } from '../components/backgammon-board';
import { DiceRoll } from '../components/dice-roll';
import { GlowText } from '../components/glow-text';
import { CenteredScene } from '../components/scene-layout';
import { fitBoardWidth } from '../lib/board-layout';

loadFont('normal', { weights: ['400', '600', '700', '800'], subsets: ['latin'] });

const FPS = 30;
const BEAT = 3 * FPS;
const TRANSITION = 10;

const FEATURES = [
  { title: 'Lessons', body: 'The rules, on the board you play on.', showBoard: true },
  { title: 'Tutor', body: 'Stops on a blunder and shows a stronger move.', showBoard: true },
  { title: 'Strategy', body: 'Running, blitz, priming, holding, or back game.', showBoard: true },
  { title: 'Two ways to play', body: 'Against the computer, or pass and play.', showDice: true, showBoard: true },
] as const;

function FeatureBeat({
  title,
  body,
  showBoard,
  showDice,
}: {
  title: string;
  body: string;
  showBoard?: boolean;
  showDice?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const boardWidth = fitBoardWidth({
    videoWidth: width,
    videoHeight: height,
    maxWidthRatio: 0.88,
    maxHeightRatio: showBoard ? 0.42 : 0.35,
  });

  return (
    <CenteredScene gap={20} padding={56} pulse={false}>
      {showBoard
        ? (
            <BackgammonBoard
              width={boardWidth}
              animateCheckers={false}
              legalPoints={[8, 6]}
              showMoveHintOn={8}
            />
          )
        : null}
      <GlowText size={34}>{title}</GlowText>
      <div
        style={{
          fontSize: 19,
          color: BRAND.textMuted,
          fontFamily: 'Inter, sans-serif',
          textAlign: 'center',
          maxWidth: 520,
          lineHeight: 1.5,
          opacity: interpolate(progress, [0.35, 1], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
        }}
      >
        {body}
      </div>
      {showDice && (
        <DiceRoll size={Math.round(width * 0.09)} die1={3} die2={3} />
      )}
    </CenteredScene>
  );
}

function FinalBeat() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 16, stiffness: 85 } });

  return (
    <CenteredScene gap={24} padding={64}>
      <Img
        src={staticFile('display-logo.png')}
        style={{
          width: 100,
          height: 100,
          borderRadius: 22,
          border: `2px solid ${BRAND.accent}`,
          transform: `scale(${interpolate(progress, [0, 1], [0.8, 1])})`,
          opacity: progress,
        }}
      />
      <GlowText size={34}>Backgammon Mastermind</GlowText>
      <div
        style={{
          fontSize: 17,
          color: BRAND.accent,
          fontFamily: 'Inter, sans-serif',
          fontWeight: 600,
          opacity: progress,
        }}
      >
        iOS and Android
      </div>
    </CenteredScene>
  );
}

export const FeatureSpotlight: React.FC = () => {
  return (
    <TransitionSeries>
      {FEATURES.map((feature, index) => (
        <React.Fragment key={feature.title}>
          {index > 0 && (
            <TransitionSeries.Transition
              presentation={fade()}
              timing={linearTiming({ durationInFrames: TRANSITION })}
            />
          )}
          <TransitionSeries.Sequence durationInFrames={BEAT}>
            <FeatureBeat {...feature} />
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
      <TransitionSeries.Sequence durationInFrames={BEAT}>
        <FinalBeat />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

export const FEATURE_SPOTLIGHT_DURATION
  = BEAT * (FEATURES.length + 1) - TRANSITION * (FEATURES.length - 1) + 16;
