import { loadFont } from '@remotion/google-fonts/Inter';
import { LightLeak } from '@remotion/light-leaks';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';
import { Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';
import { BackgammonBoard } from '../components/backgammon-board';
import { CalloutBadge } from '../components/callout-badge';
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
              border: `2px solid ${BRAND.accent}`,
              boxShadow: '0 8px 28px rgba(0,0,0,0.4)',
            }}
          />
          <GlowText size={48} letterSpacing={4}>
            BACKGAMMON
          </GlowText>
        </div>
        <div
          style={{
            fontSize: 30,
            color: BRAND.text,
            fontFamily: 'Inter, sans-serif',
            fontWeight: 400,
            lineHeight: 1.45,
            opacity: interpolate(progress, [0.25, 1], [0, 1], {
              extrapolateLeft: 'clamp',
              extrapolateRight: 'clamp',
            }),
          }}
        >
          The backgammon app built for
          <br />
          <span style={{ color: BRAND.accent, fontWeight: 700 }}>players who want to improve.</span>
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

  const callouts = [
    { label: 'Smart move hints', left: '8%', top: '18%' },
    { label: 'Direction overlay', right: '8%', top: '22%' },
    { label: 'Pip count tracker', left: '10%', bottom: '16%' },
    { label: 'Resume saved games', right: '10%', bottom: '18%' },
  ];

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
        <GlowText size={36}>Beautiful. Intuitive. Fast.</GlowText>
      </div>

      <div style={{ position: 'relative', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 28 }}>
        <BackgammonBoard
          width={boardWidth}
          legalPoints={[8, 6]}
          showMoveHintOn={8}
        />
        <DiceRoll size={Math.round(boardWidth * 0.08)} die1={6} die2={1} />
      </div>

      {callouts.map((c, i) => (
        <div
          key={c.label}
          style={{
            position: 'absolute',
            left: 'left' in c ? c.left : undefined,
            right: 'right' in c ? c.right : undefined,
            top: 'top' in c ? c.top : undefined,
            bottom: 'bottom' in c ? c.bottom : undefined,
          }}
        >
          <CalloutBadge label={c.label} delay={16 + i * 10} />
        </div>
      ))}
    </CenteredScene>
  );
}

function ModesScene() {
  const { width } = useVideoConfig();
  const cardMax = Math.min(440, width * 0.38);

  return (
    <CenteredScene gap={40} padding={64}>
      <GlowText size={34}>Two ways to play</GlowText>
      <div style={{ display: 'flex', gap: 40, justifyContent: 'center', width: '100%' }}>
        <div
          style={{
            flex: 1,
            maxWidth: cardMax,
            padding: 36,
            borderRadius: 22,
            backgroundColor: BRAND.accent,
            border: `2px solid ${BRAND.accentBright}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>🤖</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: BRAND.bg, fontFamily: 'Inter, sans-serif' }}>
            vs Computer
          </div>
          <div style={{ fontSize: 17, color: '#4A2A10', marginTop: 10, fontFamily: 'Inter, sans-serif' }}>
            Practice against AI anytime
          </div>
        </div>
        <div
          style={{
            flex: 1,
            maxWidth: cardMax,
            padding: 36,
            borderRadius: 22,
            backgroundColor: BRAND.surface,
            border: `2px solid ${BRAND.surfaceBorder}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 52, marginBottom: 16 }}>👥</div>
          <div style={{ fontSize: 30, fontWeight: 800, color: BRAND.accent, fontFamily: 'Inter, sans-serif' }}>
            2 Players
          </div>
          <div style={{ fontSize: 17, color: BRAND.accentDim, marginTop: 10, fontFamily: 'Inter, sans-serif' }}>
            Pass & play on one device
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
          borderRadius: 26,
          border: `3px solid ${BRAND.accent}`,
          transform: `scale(${interpolate(progress, [0, 1], [0.75, 1])})`,
          boxShadow: '0 0 64px rgba(212, 168, 67, 0.5)',
        }}
      />
      <GlowText size={40}>Backgammon Mastermind</GlowText>
      <div
        style={{
          fontSize: 22,
          color: BRAND.textMuted,
          fontFamily: 'Inter, sans-serif',
          letterSpacing: 2,
        }}
      >
        Available on iOS & Android
      </div>
      <div style={{ display: 'flex', gap: 20, marginTop: 8, opacity: progress }}>
        {['App Store', 'Google Play'].map(store => (
          <div
            key={store}
            style={{
              padding: '14px 36px',
              borderRadius: 14,
              backgroundColor: BRAND.surface,
              border: `1px solid ${BRAND.surfaceBorder}`,
              color: BRAND.text,
              fontSize: 17,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
            }}
          >
            {store}
          </div>
        ))}
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
        presentation={wipe({ direction: 'from-left' })}
        timing={linearTiming({ durationInFrames: TRANSITION })}
      />
      <TransitionSeries.Sequence durationInFrames={GAMEPLAY}>
        <GameplayScene />
      </TransitionSeries.Sequence>
      <TransitionSeries.Overlay durationInFrames={20}>
        <LightLeak seed={7} hueShift={35} />
      </TransitionSeries.Overlay>
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
