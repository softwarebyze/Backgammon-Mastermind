import type { BoardPointData } from '../brand/initial-board';
import { loadFont } from '@remotion/google-fonts/Inter';
import { linearTiming, TransitionSeries } from '@remotion/transitions';
import { fade } from '@remotion/transitions/fade';
import { AbsoluteFill, Img, interpolate, spring, staticFile, useCurrentFrame, useVideoConfig } from 'remotion';

import { INITIAL_POINTS } from '../brand/initial-board';
import { BRAND } from '../brand/palette';
import { BackgammonBoard } from '../components/backgammon-board';
import { DiceRoll } from '../components/dice-roll';
import { GlowText } from '../components/glow-text';
import { SceneBackdrop } from '../components/scene-layout';
import { fitBoardWidth } from '../lib/board-layout';

loadFont('normal', { weights: ['400', '600', '700', '800'], subsets: ['latin'] });

const FPS = 30;
const TRANSITION = 10;
const HOOK = Math.round(2.8 * FPS);
const ROLL = Math.round(3.4 * FPS);
const TUTOR = Math.round(3.6 * FPS);
const ANYWHERE = Math.round(2.6 * FPS);
const CTA = Math.round(3.6 * FPS);

/**
 * Reels overlay the username/caption at the bottom and the header at the top,
 * and the profile grid crops the center 1080×1350. Keep copy inside both.
 */
const SAFE_TOP = 300;
const SAFE_BOTTOM = 460;

/** Opening 3-1 played the standard way: 8/5 6/5 makes the 5-point. */
const AFTER_31: BoardPointData[] = INITIAL_POINTS.map((point, index) => {
  if (index === 8)
    return { player: 'white', count: 2 };
  if (index === 6)
    return { player: 'white', count: 4 };
  if (index === 5)
    return { player: 'white', count: 2 };
  return point;
});

function SafeScene({ children, gap = 40 }: { children: React.ReactNode; gap?: number }) {
  return (
    <SceneBackdrop pulse={false}>
      <AbsoluteFill
        style={{
          justifyContent: 'center',
          alignItems: 'center',
          gap,
          paddingTop: SAFE_TOP,
          paddingBottom: SAFE_BOTTOM,
          paddingLeft: 56,
          paddingRight: 56,
        }}
      >
        {children}
      </AbsoluteFill>
    </SceneBackdrop>
  );
}

function Subline({ children, delay = 8 }: { children: string; delay?: number }) {
  return (
    <GlowText size={40} weight={500} color={BRAND.textMuted} delay={delay} lineHeight={1.3}>
      {children}
    </GlowText>
  );
}

function useBoardWidth(maxHeightRatio: number) {
  const { width, height } = useVideoConfig();
  return fitBoardWidth({ videoWidth: width, videoHeight: height, maxWidthRatio: 0.92, maxHeightRatio });
}

/** First frame must read on its own: board and headline are visible at frame 0. */
function HookScene() {
  const boardWidth = useBoardWidth(0.3);
  return (
    <SafeScene gap={48}>
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 92,
          fontWeight: 800,
          lineHeight: 1.05,
          color: BRAND.text,
          textAlign: 'center',
          letterSpacing: -1.5,
        }}
      >
        Learn backgammon
        <br />
        <span style={{ color: BRAND.accentBright }}>on a real board.</span>
      </div>
      <BackgammonBoard width={boardWidth} animateEntrance={false} animateCheckers={false} />
    </SafeScene>
  );
}

function RollScene() {
  const boardWidth = useBoardWidth(0.28);
  return (
    <SafeScene gap={36}>
      <GlowText size={76} weight={800} lineHeight={1.08}>You rolled 3-1.</GlowText>
      <DiceRoll size={120} gap={24} die1={3} die2={1} />
      <BackgammonBoard width={boardWidth} animateEntrance={false} legalPoints={[5]} highlightPoints={[8, 6]} />
      <Subline>Every legal move, highlighted.</Subline>
    </SafeScene>
  );
}

function TutorScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const boardWidth = useBoardWidth(0.28);
  const badge = spring({ frame: frame - 14, fps, config: { damping: 15, stiffness: 120 } });

  return (
    <SafeScene gap={36}>
      <GlowText size={76} weight={800} lineHeight={1.08}>The tutor's move:</GlowText>
      <div
        style={{
          fontFamily: 'Inter, sans-serif',
          fontSize: 64,
          fontWeight: 800,
          color: BRAND.bg,
          backgroundColor: BRAND.accentBright,
          padding: '14px 36px',
          borderRadius: 20,
          opacity: badge,
          transform: `scale(${interpolate(badge, [0, 1], [0.85, 1])})`,
        }}
      >
        8/5 6/5
      </div>
      <BackgammonBoard width={boardWidth} animateEntrance={false} animateCheckers={false} points={AFTER_31} legalPoints={[5]} />
      <Subline delay={20}>Blunder? It shows the stronger move.</Subline>
    </SafeScene>
  );
}

function AnywhereScene() {
  const rows = ['iPhone & iPad', 'Android', 'Web browser', '17 languages'];
  return (
    <SafeScene gap={28}>
      <GlowText size={76} weight={800} lineHeight={1.08}>Play anywhere.</GlowText>
      {rows.map((label, index) => (
        <GlowText key={label} size={52} weight={600} color={index === 3 ? BRAND.accentBright : BRAND.text} delay={6 + index * 5}>
          {label}
        </GlowText>
      ))}
    </SafeScene>
  );
}

function CtaScene() {
  const frame = useCurrentFrame();
  const { fps } = useVideoConfig();
  const pop = spring({ frame, fps, config: { damping: 16, stiffness: 90 } });

  return (
    <SafeScene gap={36}>
      <Img
        src={staticFile('display-logo.png')}
        style={{ width: 220, height: 220, borderRadius: 48, opacity: pop, transform: `scale(${interpolate(pop, [0, 1], [0.9, 1])})` }}
      />
      <GlowText size={64} weight={800}>Backgammon Mastermind</GlowText>
      <GlowText size={48} weight={600} color={BRAND.accentBright} delay={8}>Play free in your browser</GlowText>
      <div
        style={{
          marginTop: 12,
          fontFamily: 'Inter, sans-serif',
          fontSize: 44,
          fontWeight: 700,
          color: BRAND.text,
          border: `3px solid ${BRAND.accent}`,
          borderRadius: 999,
          padding: '16px 48px',
          opacity: interpolate(frame, [16, 28], [0, 1], { extrapolateLeft: 'clamp', extrapolateRight: 'clamp' }),
        }}
      >
        Link in bio
      </div>
    </SafeScene>
  );
}

export const InstagramLaunch: React.FC = () => {
  const transition = <TransitionSeries.Transition presentation={fade()} timing={linearTiming({ durationInFrames: TRANSITION })} />;
  return (
    <TransitionSeries>
      <TransitionSeries.Sequence durationInFrames={HOOK}>
        <HookScene />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={ROLL}>
        <RollScene />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={TUTOR}>
        <TutorScene />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={ANYWHERE}>
        <AnywhereScene />
      </TransitionSeries.Sequence>
      {transition}
      <TransitionSeries.Sequence durationInFrames={CTA}>
        <CtaScene />
      </TransitionSeries.Sequence>
    </TransitionSeries>
  );
};

export const INSTAGRAM_LAUNCH_DURATION = HOOK + ROLL + TUTOR + ANYWHERE + CTA - TRANSITION * 4;

/** 4:5 grid cover — the hook frame, laid out for the feed crop. */
export const InstagramCover: React.FC = () => {
  const { width, height } = useVideoConfig();
  const boardWidth = fitBoardWidth({ videoWidth: width, videoHeight: height, maxWidthRatio: 0.9, maxHeightRatio: 0.4 });
  return (
    <SceneBackdrop pulse={false}>
      <AbsoluteFill style={{ justifyContent: 'center', alignItems: 'center', gap: 56, padding: 64 }}>
        <div
          style={{
            fontFamily: 'Inter, sans-serif',
            fontSize: 96,
            fontWeight: 800,
            lineHeight: 1.05,
            color: BRAND.text,
            textAlign: 'center',
            letterSpacing: -1.5,
          }}
        >
          Learn backgammon
          <br />
          <span style={{ color: BRAND.accentBright }}>on a real board.</span>
        </div>
        <BackgammonBoard width={boardWidth} animateEntrance={false} animateCheckers={false} />
        <div style={{ fontFamily: 'Inter, sans-serif', fontSize: 40, fontWeight: 600, color: BRAND.textMuted }}>
          Play free in your browser
        </div>
      </AbsoluteFill>
    </SceneBackdrop>
  );
};
