import { loadFont } from '@remotion/google-fonts/Inter';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';
import { BackgammonBoard } from '../components/backgammon-board';
import { DiceRoll } from '../components/dice-roll';
import { GlowText } from '../components/glow-text';
import { CenteredScene, SplitScene } from '../components/scene-layout';
import { fitBoardWidth } from '../lib/board-layout';

loadFont('normal', { weights: ['400', '600', '700', '800'], subsets: ['latin'] });

const FPS = 30;
const INTRO = 5 * FPS;
const GAMEPLAY = 6 * FPS;
const FEATURES = 5 * FPS;
const OUTRO = 4 * FPS;
const TRANSITION = 15;

function IntroScene() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 16, stiffness: 70 } });
  const boardWidth = fitBoardWidth({
    videoWidth: width * 0.48,
    videoHeight: height,
    maxWidthRatio: 0.98,
    maxHeightRatio: 0.72,
  });

  return (
    <SplitScene padding={72}>
      <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 28, justifyContent: 'center' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Img
            src={staticFile('display-logo.png')}
            style={{
              width: 96,
              height: 96,
              borderRadius: 22,
            }}
          />
          <GlowText size={44} weight={650}>
            Backgammon Mastermind
          </GlowText>
        </div>
        <div
          style={{
            fontSize: 26,
            color: BRAND.textMuted,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            lineHeight: 1.4,
            opacity: interpolate(progress, [0.25, 1], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          Learn on the board.
          <br />
          Then play a real game.
        </div>
      </div>
      <div style={{ flex: 1, display: 'flex', justifyContent: 'center', alignItems: 'center' }}>
        <BackgammonBoard width={boardWidth} />
      </div>
    </SplitScene>
  );
}

function GameplayScene() {
  const frame = useCurrentFrame();
  const { fps, width, height } = useVideoConfig();
  const boardWidth = fitBoardWidth({ videoWidth: width, videoHeight: height, maxWidthRatio: 0.78, maxHeightRatio: 0.62 });
  const titleProgress = spring({ frame: frame - 12, fps, config: { damping: 14, stiffness: 100 } });

  return (
    <CenteredScene gap={0} padding={48} pulse={false}>
      <div
        style={{
          position: 'absolute',
          top: 48,
          opacity: titleProgress,
          transform: `translateY(${interpolate(titleProgress, [0, 1], [12, 0])}px)`,
        }}
      >
        <GlowText size={28}>A live board</GlowText>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <BackgammonBoard
          width={boardWidth}
          legalPoints={[8, 6]}
          showMoveHintOn={8}
        />
        <DiceRoll size={Math.round(boardWidth * 0.08)} die1={6} die2={1} />
      </div>
    </CenteredScene>
  );
}

function ModesScene() {
  const { width } = useVideoConfig();
  const cardMax = Math.min(440, width * 0.38);

  return (
    <CenteredScene gap={40} padding={64}>
      <GlowText size={28}>Two ways to play</GlowText>
      <div style={{ display: 'flex', gap: 28, justifyContent: 'center', width: '100%' }}>
        <div
          style={{
            flex: 1,
            maxWidth: cardMax,
            padding: '32px 28px',
            borderRadius: 16,
            backgroundColor: BRAND.surface,
            border: `1px solid ${BRAND.surfaceBorder}`,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 650, color: BRAND.text, fontFamily: 'Inter, sans-serif' }}>
            Computer
          </div>
          <div style={{ fontSize: 16, color: BRAND.textMuted, marginTop: 8, fontFamily: 'Inter, sans-serif', lineHeight: 1.4 }}>
            A full game, with a tutor if you blunder.
          </div>
        </div>
        <div
          style={{
            flex: 1,
            maxWidth: cardMax,
            padding: '32px 28px',
            borderRadius: 16,
            backgroundColor: BRAND.surface,
            border: `1px solid ${BRAND.surfaceBorder}`,
          }}
        >
          <div style={{ fontSize: 26, fontWeight: 650, color: BRAND.text, fontFamily: 'Inter, sans-serif' }}>
            Pass and play
          </div>
          <div style={{ fontSize: 16, color: BRAND.textMuted, marginTop: 8, fontFamily: 'Inter, sans-serif', lineHeight: 1.4 }}>
            Two players on one device.
          </div>
        </div>
      </div>
    </CenteredScene>
  );
}

function OutroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 16, stiffness: 80 } });

  return (
    <CenteredScene gap={28} padding={64}>
      <Img
        src={staticFile('display-logo.png')}
        style={{
          width: 128,
          height: 128,
          borderRadius: 28,
          transform: `scale(${interpolate(progress, [0, 1], [0.92, 1])})`,
        }}
      />
      <GlowText size={36}>Backgammon Mastermind</GlowText>
      <div
        style={{
          fontSize: 18,
          color: BRAND.textMuted,
          fontFamily: 'Inter, sans-serif',
        }}
      >
        iOS and Android
      </div>
    </CenteredScene>
  );
}

export const AppStorePreview: React.FC = () => {
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={INTRO}>
        <IntroScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION })}
      />
      <TransitionSeries.Sequence durationInFrames={GAMEPLAY}>
        <GameplayScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Sequence durationInFrames={FEATURES}>
        <ModesScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Transition
        presentation={fade()}
        timing={linearTiming({ durationInFrames: TRANSITION })}
      />
      <TransitionSeries.Sequence durationInFrames={OUTRO}>
        <OutroScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

export const APP_STORE_PREVIEW_DURATION = INTRO + GAMEPLAY + FEATURES + OUTRO - TRANSITION * 2 + 24;
