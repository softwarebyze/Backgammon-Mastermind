import { loadFont } from '@remotion/google-fonts/Inter';
import { LightLeak } from '@remotion/light-leaks';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { wipe } from '@remotion/transitions/wipe';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { BRAND } from '../brand/palette';
import { BackgammonBoard } from '../components/BackgammonBoard';
import { BrandBackground } from '../components/BrandBackground';
import { DiceRoll } from '../components/DiceRoll';
import { GlowText } from '../components/GlowText';

loadFont('normal', { weights: ['400', '700', '800'], subsets: ['latin'] });

const FPS = 30;
const INTRO = 5 * FPS;
const GAMEPLAY = 6 * FPS;
const FEATURES = 5 * FPS;
const OUTRO = 4 * FPS;
const TRANSITION = 15;

function IntroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 16, stiffness: 70 } });

  return (
    <AbsoluteFill>
      <BrandBackground />
      <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', padding: 80 }}>
        <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 24 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            <Img
              src={staticFile('display-logo.png')}
              style={{
                width: 80,
                height: 80,
                borderRadius: 18,
                border: `2px solid ${BRAND.accent}`,
              }}
            />
            <GlowText size={52} letterSpacing={5}>
              BACKGAMMON
            </GlowText>
          </div>
          <div
            style={{
              fontSize: 28,
              color: BRAND.text,
              fontFamily: 'Inter, sans-serif',
              fontWeight: 400,
              opacity: interpolate(progress, [0.3, 1], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
              lineHeight: 1.4,
            }}
          >
            The backgammon app built for
            <br />
            <span style={{ color: BRAND.accent, fontWeight: 700 }}>players who want to improve.</span>
          </div>
        </div>
        <div style={{ flex: 1, display: 'flex', justifyContent: 'center' }}>
          <BackgammonBoard scale={1.3} />
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function GameplayScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const highlight = spring({ frame: frame - 30, fps, config: { damping: 14, stiffness: 100 } });

  const features = [
    { label: 'Smart move hints', x: 120, y: 100 },
    { label: 'Direction overlay', x: 900, y: 180 },
    { label: 'Pip count tracker', x: 200, y: 480 },
    { label: 'Resume saved games', x: 820, y: 520 },
  ];

  return (
    <AbsoluteFill>
      <BrandBackground pulse={false} />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center' }}>
        <BackgammonBoard scale={1.5} />
        <div style={{ position: 'absolute', bottom: 60 }}>
          <DiceRoll size={56} die1={6} die2={1} />
        </div>
      </AbsoluteFill>
      {features.map((f, i) => {
        const delay = i * 12;
        const p = spring({ frame: frame - delay - 20, fps, config: { damping: 16, stiffness: 120 } });
        return (
          <div
            key={f.label}
            style={{
              position: 'absolute',
              left: f.x,
              top: f.y,
              opacity: p,
              transform: `scale(${interpolate(p, [0, 1], [0.8, 1])})`,
              padding: '10px 18px',
              borderRadius: 10,
              backgroundColor: 'rgba(42, 18, 6, 0.92)',
              border: `1px solid ${BRAND.accent}`,
              color: BRAND.accent,
              fontSize: 14,
              fontWeight: 600,
              fontFamily: 'Inter, sans-serif',
              boxShadow: '0 4px 20px rgba(0,0,0,0.4)',
            }}
          >
            {f.label}
          </div>
        );
      })}
      <div
        style={{
          position: 'absolute',
          top: 40,
          left: '50%',
          transform: 'translateX(-50%)',
          opacity: highlight,
        }}
      >
        <GlowText size={32}>Beautiful. Intuitive. Fast.</GlowText>
      </div>
    </AbsoluteFill>
  );
}

function ModesScene() {
  return (
    <AbsoluteFill>
      <BrandBackground />
      <AbsoluteFill style={{ flexDirection: 'row', alignItems: 'center', justifyContent: 'center', gap: 48, padding: 60 }}>
        <div
          style={{
            flex: 1,
            maxWidth: 420,
            padding: 32,
            borderRadius: 20,
            backgroundColor: BRAND.accent,
            border: `2px solid ${BRAND.accentBright}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>🤖</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: BRAND.bg, fontFamily: 'Inter, sans-serif' }}>
            vs Computer
          </div>
          <div style={{ fontSize: 16, color: '#4A2A10', marginTop: 8, fontFamily: 'Inter, sans-serif' }}>
            Practice against AI anytime
          </div>
        </div>
        <div
          style={{
            flex: 1,
            maxWidth: 420,
            padding: 32,
            borderRadius: 20,
            backgroundColor: BRAND.surface,
            border: `2px solid ${BRAND.accentDim}`,
            textAlign: 'center',
          }}
        >
          <div style={{ fontSize: 48, marginBottom: 16 }}>👥</div>
          <div style={{ fontSize: 28, fontWeight: 800, color: BRAND.accent, fontFamily: 'Inter, sans-serif' }}>
            2 Players
          </div>
          <div style={{ fontSize: 16, color: BRAND.accentDim, marginTop: 8, fontFamily: 'Inter, sans-serif' }}>
            Pass & play on one device
          </div>
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
  );
}

function OutroScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const progress = spring({ frame, fps, config: { damping: 16, stiffness: 80 } });

  return (
    <AbsoluteFill>
      <BrandBackground />
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 32 }}>
        <Img
          src={staticFile('display-logo.png')}
          style={{
            width: 120,
            height: 120,
            borderRadius: 24,
            border: `3px solid ${BRAND.accent}`,
            transform: `scale(${interpolate(progress, [0, 1], [0.7, 1])})`,
            boxShadow: '0 0 80px rgba(212, 168, 67, 0.5)',
          }}
        />
        <GlowText size={44}>Backgammon Mastermind</GlowText>
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
        <div
          style={{
            display: 'flex',
            gap: 20,
            marginTop: 16,
            opacity: progress,
          }}
        >
          {['App Store', 'Google Play'].map(store => (
            <div
              key={store}
              style={{
                padding: '14px 32px',
                borderRadius: 12,
                backgroundColor: BRAND.surface,
                border: `1px solid ${BRAND.surfaceBorder}`,
                color: BRAND.text,
                fontSize: 16,
                fontWeight: 600,
                fontFamily: 'Inter, sans-serif',
              }}
            >
              {store}
            </div>
          ))}
        </div>
      </AbsoluteFill>
    </AbsoluteFill>
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
      <TransitionSeries.Overlay durationInFrames={24}>
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
