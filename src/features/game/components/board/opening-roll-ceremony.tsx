import type { RefObject } from 'react';
import type { ViewStyle } from 'react-native';
import type { AnimatedStyle } from 'react-native-reanimated';
import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { DiceDisplayStyle } from '@/lib/game-preferences/types';
import type { GameState, Player } from '@/lib/game/types';
import { useEffect, useRef, useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withSpring,
  withTiming,
} from 'react-native-reanimated';

import { GAME_PALETTE } from '@/features/game/game-palette';
import {
  setOpeningCeremonyVisible,
  setOpeningTraySlots,
  useOpeningTraySlots,
} from '@/features/game/opening-ceremony-gate';
import { useGamePreferences } from '@/lib/game-preferences/use-game-preferences';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

/** Tray die face size in DiceDisplay — fly scale target. */
const TRAY_DIE_SIZE = 44;

function playerName(player: Player): string {
  return translate(player === 'white' ? 'game.review.player_white' : 'game.review.player_black');
}

type Props = {
  state: GameState;
  dimensions: BoardDimensions;
  /** Duolingo-style: tap the ceremony (not only the footer button) to roll. */
  onRoll?: () => void;
  canRoll?: boolean;
};

const DOT_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.5], [0.72, 0.5], [0.28, 0.72], [0.72, 0.72]],
};

/** Pure white / indigo black — never tint the winner orange. */
function dieColors(player: Player) {
  return player === 'white'
    ? { bg: '#FFFFFF', border: '#E8E0D0', ink: '#1A1208' }
    : { bg: '#16162A', border: '#6B6BB8', ink: '#E8E8FF' };
}

function CeremonyDie({
  value,
  player,
  displayStyle,
  size,
  isWinner = false,
  isLoser = false,
}: {
  value: number;
  player: Player;
  displayStyle: DiceDisplayStyle;
  size: number;
  isWinner?: boolean;
  isLoser?: boolean;
}) {
  const colors = dieColors(player);
  const scale = useSharedValue(0.6);
  const opacity = useSharedValue(0);

  useEffect(() => {
    opacity.value = withTiming(isLoser ? 0.72 : 1, { duration: 220 });
    scale.value = withSpring(isWinner ? 1.12 : 1.04, { damping: 12, stiffness: 200 });
  }, [value, isWinner, isLoser, opacity, scale]);

  const style = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  return (
    <Animated.View
      style={[
        styles.die,
        style,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
          backgroundColor: colors.bg,
          borderColor: isWinner ? GAME_PALETTE.accent : colors.border,
          borderWidth: isWinner ? 3.5 : 2.5,
          shadowColor: isWinner ? GAME_PALETTE.accent : '#000',
          shadowOpacity: isWinner ? 0.55 : 0.35,
        },
      ]}
    >
      {displayStyle === 'numbers'
        ? (
            <Text style={[styles.dieText, { color: colors.ink, fontSize: size * 0.48 }]}>
              {value}
            </Text>
          )
        : (
            <View style={StyleSheet.absoluteFill}>
              {(DOT_LAYOUTS[value] ?? DOT_LAYOUTS[1]!).map(([x, y]) => (
                <View
                  key={`${x}-${y}`}
                  style={{
                    position: 'absolute',
                    left: `${x * 100}%`,
                    top: `${y * 100}%`,
                    width: size * 0.16,
                    height: size * 0.16,
                    marginLeft: -size * 0.08,
                    marginTop: -size * 0.08,
                    borderRadius: size * 0.08,
                    backgroundColor: colors.ink,
                  }}
                />
              ))}
            </View>
          )}
    </Animated.View>
  );
}

function WaitingSlot({ size }: { size: number }) {
  return (
    <View style={[styles.waiting, { width: size, height: size, borderRadius: size * 0.22 }]}>
      <Text style={[styles.waitingText, { fontSize: size * 0.36 }]}>?</Text>
    </View>
  );
}

const REVEAL_HOLD_MS = 2400;
const FLY_MS = 620;

type Stage = 'rolling' | 'reveal' | 'fly' | 'exit';

/**
 * Opening roll ceremony — dice live inside the callout card, tap-anywhere to roll,
 * then dice fly down past the board into the tray (rendered above the clipped board).
 */
export function OpeningRollCeremony({ state, dimensions, onRoll, canRoll = false }: Props) {
  const { preferences } = useGamePreferences();
  const [stage, setStage] = useState<Stage>('rolling');
  const [revealDice, setRevealDice] = useState<{ white: number; black: number } | null>(null);
  const prevPhase = useRef(state.phase);

  // Sync phase→reveal during render so we never paint a blank frame (the flicker).
  const phase = state.phase;
  if (prevPhase.current === 'opening-roll' && phase !== 'opening-roll' && state.dice[0] > 0 && state.dice[1] > 0) {
    if (stage === 'rolling' && revealDice === null) {
      const dice = { white: state.dice[0], black: state.dice[1] };
      setRevealDice(dice);
      setStage('reveal');
    }
  }
  else if (prevPhase.current !== 'opening-roll' && phase === 'opening-roll' && stage !== 'rolling') {
    setStage('rolling');
    setRevealDice(null);
  }
  prevPhase.current = phase;

  const showing = stage !== 'exit'
    && (phase === 'opening-roll' || stage === 'reveal' || stage === 'fly');

  useEffect(() => {
    setOpeningCeremonyVisible(showing);
    return () => {
      setOpeningCeremonyVisible(false);
      setOpeningTraySlots(null);
    };
  }, [showing]);

  // Reveal → fly → exit. Timers are keyed only on revealDice so entering `fly`
  // does not clear the exit timer (that bug left the gate stuck and hid tray dice).
  useEffect(() => {
    if (!revealDice) {
      return;
    }
    const flyTimer = setTimeout(() => setStage('fly'), REVEAL_HOLD_MS);
    const exitTimer = setTimeout(() => setStage('exit'), REVEAL_HOLD_MS + FLY_MS + 80);
    return () => {
      clearTimeout(flyTimer);
      clearTimeout(exitTimer);
    };
  }, [revealDice]);

  if (!showing) {
    return null;
  }

  return (
    <OpeningStage
      state={state}
      dimensions={dimensions}
      stage={stage === 'rolling' && revealDice ? 'reveal' : stage}
      revealDice={revealDice}
      diceStyle={preferences.diceDisplayStyle}
      onRoll={onRoll}
      canRoll={canRoll && stage === 'rolling' && phase === 'opening-roll'}
    />
  );
}

function DieSide({
  value,
  player,
  size,
  diceStyle,
  winner,
  dieRef,
  flyStyle,
  hideLabel = false,
}: {
  value: number | null;
  player: Player;
  size: number;
  diceStyle: DiceDisplayStyle;
  winner: Player | null;
  dieRef?: RefObject<View | null>;
  flyStyle?: AnimatedStyle<ViewStyle>;
  hideLabel?: boolean;
}) {
  return (
    <View style={styles.side}>
      <View ref={dieRef} collapsable={false}>
        <Animated.View style={flyStyle}>
          {value !== null
            ? (
                <CeremonyDie
                  value={value}
                  player={player}
                  displayStyle={diceStyle}
                  size={size}
                  isWinner={winner === player}
                  isLoser={winner !== null && winner !== player}
                />
              )
            : <WaitingSlot size={size} />}
        </Animated.View>
      </View>
      {!hideLabel && (
        <Text style={[styles.label, winner === player && styles.labelWinner]}>
          {playerName(player)}
        </Text>
      )}
    </View>
  );
}

function ceremonyCopy(
  state: GameState,
  winner: Player | null,
  revealDice: { white: number; black: number } | null,
) {
  if (winner && revealDice) {
    return {
      headline: translate('game.opening.goes_first', { player: playerName(winner) }),
      subhead: translate('game.opening.compare', {
        winner: playerName(winner),
        high: winner === 'white' ? revealDice.white : revealDice.black,
        low: winner === 'white' ? revealDice.black : revealDice.white,
      }),
    };
  }
  return {
    headline: translate('game.opening.who_goes_first'),
    subhead: state.currentPlayer === 'white' && state.openingRolls.white === null
      ? translate('game.opening.your_roll')
      : translate('game.opening.waiting_roll', { player: playerName(state.currentPlayer) }),
  };
}

function useDieFlyStyle() {
  const tx = useSharedValue(0);
  const ty = useSharedValue(0);
  const scale = useSharedValue(1);
  const opacity = useSharedValue(1);
  const style = useAnimatedStyle(() => ({
    transform: [
      { translateX: tx.value },
      { translateY: ty.value },
      { scale: scale.value },
    ],
    opacity: opacity.value,
  }));
  return { tx, ty, scale, opacity, style };
}

type DieFly = ReturnType<typeof useDieFlyStyle>;

type DieRefs = {
  black: RefObject<View | null>;
  white: RefObject<View | null>;
};

function windowCenter(node: View, onCenter: (c: { x: number; y: number } | null) => void) {
  node.measureInWindow((...box: number[]) => {
    const w = box[2] ?? 0;
    const h = box[3] ?? 0;
    if (w <= 0 || h <= 0) {
      onCenter(null);
      return;
    }
    onCenter({ x: (box[0] ?? 0) + w / 2, y: (box[1] ?? 0) + h / 2 });
  });
}

/**
 * Fly each ceremony die into the measured tray slot.
 * Tray order is [whiteDie, blackDie] (see applyOpeningDieRoll → applyDiceRoll).
 * Ceremony layout is Black | White, so black → tray.right, white → tray.left.
 */
function useCeremonyFly(stage: Stage, dieSize: number, dieRefs: DieRefs) {
  const tray = useOpeningTraySlots();
  const black = useDieFlyStyle();
  const white = useDieFlyStyle();
  const cardOpacity = useSharedValue(1);
  const scrimOpacity = useSharedValue(1);
  const vsOpacity = useSharedValue(1);
  const started = useRef(false);
  const live = useRef({ black, white, dieRefs, cardOpacity, scrimOpacity, vsOpacity });
  live.current = { black, white, dieRefs, cardOpacity, scrimOpacity, vsOpacity };

  useEffect(() => {
    if (stage !== 'fly') {
      started.current = false;
      return;
    }
    if (!tray || started.current) {
      return;
    }

    const targetScale = TRAY_DIE_SIZE / dieSize;
    const ease = Easing.inOut(Easing.cubic);
    let attempts = 0;
    const {
      black: blackAnim,
      white: whiteAnim,
      dieRefs: refs,
      cardOpacity: cardOp,
      scrimOpacity: scrimOp,
      vsOpacity: vsOp,
    } = live.current;

    const flyDie = (
      from: { x: number; y: number },
      target: { x: number; y: number },
      anim: DieFly,
    ) => {
      anim.tx.value = withTiming(target.x - from.x, { duration: FLY_MS, easing: ease });
      anim.ty.value = withTiming(target.y - from.y, { duration: FLY_MS, easing: ease });
      anim.scale.value = withTiming(targetScale, { duration: FLY_MS, easing: ease });
      anim.opacity.value = 1;
    };

    const tryFly = () => {
      const blackNode = refs.black.current;
      const whiteNode = refs.white.current;
      if (!blackNode || !whiteNode) {
        if (attempts++ < 8) {
          requestAnimationFrame(tryFly);
        }
        return;
      }

      let pending = 2;
      const done = () => {
        pending -= 1;
        if (pending === 0) {
          started.current = true;
        }
      };

      windowCenter(blackNode, (from) => {
        if (!from) {
          if (attempts++ < 8) {
            requestAnimationFrame(tryFly);
          }
          return;
        }
        flyDie(from, tray.right, blackAnim);
        done();
      });
      windowCenter(whiteNode, (from) => {
        if (!from) {
          if (attempts++ < 8) {
            requestAnimationFrame(tryFly);
          }
          return;
        }
        flyDie(from, tray.left, whiteAnim);
        done();
      });
      cardOp.value = withTiming(0, { duration: FLY_MS * 0.35 });
      scrimOp.value = withTiming(0, { duration: FLY_MS * 0.45 });
      vsOp.value = withTiming(0, { duration: FLY_MS * 0.25 });
    };

    tryFly();
  }, [stage, tray, dieSize]);

  return {
    blackStyle: black.style,
    whiteStyle: white.style,
    cardStyle: useAnimatedStyle(() => ({ opacity: cardOpacity.value })),
    scrimStyle: useAnimatedStyle(() => ({ opacity: scrimOpacity.value })),
    vsStyle: useAnimatedStyle(() => ({ opacity: vsOpacity.value })),
  };
}

function OpeningStage({
  state,
  dimensions,
  stage,
  revealDice,
  diceStyle,
  onRoll,
  canRoll,
}: {
  state: GameState;
  dimensions: BoardDimensions;
  stage: Stage;
  revealDice: { white: number; black: number } | null;
  diceStyle: DiceDisplayStyle;
  onRoll?: () => void;
  canRoll: boolean;
}) {
  const size = Math.min(Math.max(dimensions.checkerSize * 1.7, 52), 64);
  const showReveal = (stage === 'reveal' || stage === 'fly') && revealDice;
  const whiteValue = showReveal ? revealDice.white : state.openingRolls.white;
  const blackValue = showReveal ? revealDice.black : state.openingRolls.black;
  const winner: Player | null = showReveal
    ? (revealDice.white > revealDice.black ? 'white' : 'black')
    : null;
  const blackRef = useRef<View>(null);
  const whiteRef = useRef<View>(null);
  const dieRefs = useRef({ black: blackRef, white: whiteRef }).current;
  const { blackStyle, whiteStyle, cardStyle, scrimStyle, vsStyle } = useCeremonyFly(
    stage,
    size,
    dieRefs,
  );
  const { headline, subhead } = ceremonyCopy(state, winner, revealDice);
  const hideLabels = stage === 'fly';

  const body = (
    <>
      <Animated.View style={[styles.scrim, scrimStyle]} pointerEvents="none" />
      <View style={styles.card} pointerEvents="none">
        <Animated.View style={[styles.cardFill, cardStyle]} />
        <Animated.View style={[{ alignItems: 'center', gap: 6, zIndex: 1 }, cardStyle]}>
          <Text style={styles.headline}>{headline}</Text>
          <Text style={styles.subhead}>{subhead}</Text>
        </Animated.View>
        <View style={styles.pair}>
          <DieSide
            value={blackValue}
            player="black"
            size={size}
            diceStyle={diceStyle}
            winner={winner}
            dieRef={blackRef}
            flyStyle={blackStyle}
            hideLabel={hideLabels}
          />
          <Animated.Text style={[styles.vs, vsStyle]}>vs</Animated.Text>
          <DieSide
            value={whiteValue}
            player="white"
            size={size}
            diceStyle={diceStyle}
            winner={winner}
            dieRef={whiteRef}
            flyStyle={whiteStyle}
            hideLabel={hideLabels}
          />
        </View>
      </View>
    </>
  );

  if (canRoll && onRoll) {
    return (
      <Pressable
        style={styles.root}
        onPress={onRoll}
        accessibilityRole="button"
        accessibilityLabel={translate('game.opening.your_roll')}
      >
        {body}
      </Pressable>
    );
  }

  return (
    <View style={styles.root} pointerEvents="none">
      {body}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    ...StyleSheet.absoluteFill,
    zIndex: 20,
  },
  scrim: {
    ...StyleSheet.absoluteFill,
    backgroundColor: 'rgba(12, 4, 0, 0.55)',
  },
  card: {
    position: 'absolute',
    left: 16,
    right: 16,
    top: '16%',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingTop: 14,
    paddingBottom: 18,
    gap: 10,
    zIndex: 2,
    overflow: 'visible',
  },
  cardFill: {
    ...StyleSheet.absoluteFill,
    borderRadius: 16,
    backgroundColor: 'rgba(30, 14, 4, 0.96)',
    borderWidth: 1.5,
    borderColor: GAME_PALETTE.accent,
  },
  headline: {
    color: GAME_PALETTE.text,
    fontSize: 22,
    letterSpacing: 0.2,
    textAlign: 'center',
    ...interFont('bold'),
  },
  subhead: {
    color: GAME_PALETTE.accent,
    fontSize: 14,
    textAlign: 'center',
    ...interFont('semibold'),
  },
  pair: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 16,
    zIndex: 3,
  },
  side: { alignItems: 'center', gap: 8 },
  label: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    letterSpacing: 0.6,
    textTransform: 'uppercase',
    ...interFont('semibold'),
  },
  labelWinner: { color: GAME_PALETTE.accent },
  vs: {
    color: GAME_PALETTE.textMuted,
    fontSize: 13,
    marginBottom: 22,
    ...interFont('semibold'),
  },
  die: {
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 4 },
    shadowRadius: 8,
    elevation: 8,
  },
  dieText: { ...interFont('bold') },
  waiting: {
    borderWidth: 2.5,
    borderStyle: 'dashed',
    borderColor: GAME_PALETTE.accent,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(0,0,0,0.25)',
  },
  waitingText: { color: GAME_PALETTE.accent, ...interFont('bold') },
});
