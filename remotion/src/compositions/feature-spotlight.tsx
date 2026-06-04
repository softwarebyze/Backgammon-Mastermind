import { loadFont } from '@remotion/google-fonts/Inter';
import { LightLeak } from '@remotion/light-leaks';
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
  { emoji: '🎯', title: 'Move Hints', body: 'Legal moves glow on the board', showBoard: true },
  { emoji: '🧭', title: 'Direction Guide', body: 'See the path from start to home', showBoard: false },
  { emoji: '💾', title: 'Auto-Save', body: 'Resume your game anytime', showBoard: false },
  { emoji: '🎲', title: 'Roll & Play', body: 'Smooth dice, instant feedback', showDice: true },
] as const;

function FeatureBeat({
  emoji,
  title,
  body,
  index,
  showBoard,
  showDice,
}: {
  emoji: string;
  title: string;
  body: string;
  index: number;
  showBoard?: boolean;
  showDice?: boolean;
}) {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 14, stiffness: 100 } });
  const emojiScale = interpolate(progress, [0, 1], [0.6, 1]);
  const boardWidth = fitBoardWidth({
    videoWidth: width,
    videoHeight: height,
    maxWidthRatio: 0.88,
    maxHeightRatio: showBoard ? 0.42 : 0.35,
  });

  return (
    <CenteredScene gap={20} padding={56} pulse={index % 2 === 0}>
      {showBoard
        ? (
            <BackgammonBoard
              width={boardWidth}
              animateCheckers={false}
              legalPoints={[8, 6]}
              showMoveHintOn={8}
            />
          )
        : (
            <div
              style={{
                fontSize: 64,
                transform: `scale(${emojiScale})`,
                lineHeight: 1,
                filter: 'drop-shadow(0 6px 20px rgba(212, 168, 67, 0.35))',
              }}
            >
              {emoji}
            </div>
          )}
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
          letterSpacing: 4,
          fontWeight: 700,
          opacity: progress,
        }}
      >
        FREE ON iOS & ANDROID
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
            <FeatureBeat {...feature} index={index} />
          </TransitionSeries.Sequence>
        </React.Fragment>
      ))}
      <TransitionSeries.Overlay durationInFrames={14}>
        <LightLeak seed={99} hueShift={50} />
      </TransitionSeries.Overlay>
      <TransitionSeries.Sequence durationInFrames={BEAT}>
        <FinalBeat />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

export const FEATURE_SPOTLIGHT_DURATION
  = BEAT * (FEATURES.length + 1) - TRANSITION * (FEATURES.length - 1) + 16;
