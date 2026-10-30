import type { DiceDisplayStyle } from '@/lib/game-preferences/types';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  cancelAnimation,
  useAnimatedStyle,
  useReducedMotion,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GAME_PALETTE } from '@/features/game/game-palette';
import { TRAY_DIE_SIZE } from '@/features/game/hooks/use-board-dimensions';
import { diePips } from './die-pips';

type PlayerColor = 'white' | 'black';

type Props = {
  /** 0 in a slot = empty placeholder (opening roll before that side has rolled). */
  dice: [number, number];
  remainingDice: number[];
  playerColor: PlayerColor;
  /** Per-slot colors (opening roll: white die left, black die right). */
  slotColors?: readonly [PlayerColor, PlayerColor];
  /** Slot to ring with the accent (opening winner). */
  emphasis?: 0 | 1 | null;
  displayStyle?: DiceDisplayStyle;
  /** When false, dice values update instantly (review scrub, etc.). */
  animateRoll?: boolean;
  /** Die edge in px; scales dots, numerals and radius. Default matches the phone tray. */
  size?: number;
};

const DOUBLE_DIE_SLOTS = ['slot-a', 'slot-b', 'slot-c', 'slot-d'] as const;

function diceKey(dice: [number, number]): string {
  return `${dice[0]},${dice[1]}`;
}

function hasRolledDice(dice: [number, number]): boolean {
  return dice[0] !== 0 || dice[1] !== 0;
}

/** Gentle settle pulse on a new roll — no flashing random values. */
function useDiceRollAnimation(dice: [number, number], animateRoll: boolean) {
  const reducedMotion = useReducedMotion();
  const lastKey = useRef<string | null>(null);
  const dieScale = useSharedValue(1);

  useEffect(() => {
    const key = diceKey(dice);
    if (reducedMotion) {
      cancelAnimation(dieScale);
      dieScale.value = 1;
      lastKey.current = key;
      return;
    }
    if (!hasRolledDice(dice)) {
      lastKey.current = null;
      dieScale.value = 1;
      return;
    }
    if (key === lastKey.current || !animateRoll) {
      lastKey.current = key;
      return;
    }
    lastKey.current = key;
    dieScale.value = withSequence(
      withTiming(1.08, { duration: 160 }),
      withTiming(1, { duration: 220 }),
    );
  }, [dice, animateRoll, dieScale, reducedMotion]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dieScale.value }],
  }));

  return { containerStyle, reducedMotion };
}

function DieDots({ value, dotColor, size, border }: { value: number; dotColor: string; size: number; border: number }) {
  return (
    <View style={StyleSheet.absoluteFill}>
      {diePips(value, size, border).map(pip => (
        <View
          key={`${pip.left}-${pip.top}`}
          style={{
            position: 'absolute',
            left: pip.left,
            top: pip.top,
            width: pip.size,
            height: pip.size,
            borderRadius: pip.size / 2,
            backgroundColor: dotColor,
          }}
        />
      ))}
    </View>
  );
}

function DieFace({
  value,
  used,
  playerColor,
  displayStyle,
  size,
  emphasized = false,
}: {
  value: number;
  used: boolean;
  playerColor: PlayerColor;
  displayStyle: DiceDisplayStyle;
  size: number;
  emphasized?: boolean;
}) {
  const isWhite = playerColor === 'white';
  const bg = used
    ? 'rgba(100,80,60,0.4)'
    : isWhite
      ? '#F2EAD3'
      : '#1E1E30';
  const border = used
    ? '#5A4030'
    : isWhite
      ? '#BBA070'
      : '#5050A0';
  const fg = used ? '#7A6050' : isWhite ? '#2A1A08' : '#E0E0FF';
  const borderWidth = emphasized ? 3 : 2;

  return (
    <View
      style={[
        styles.die,
        dieBox(size),
        {
          backgroundColor: bg,
          borderColor: emphasized ? GAME_PALETTE.accent : border,
          borderWidth,
          opacity: used ? 0.4 : 1,
        },
        emphasized && styles.dieEmphasized,
      ]}
    >
      {displayStyle === 'dots'
        ? <DieDots value={value} dotColor={fg} size={size} border={borderWidth} />
        : (
            <Text style={[styles.dieText, { color: fg, fontSize: Math.round(size * 0.5) }]}>
              {value}
            </Text>
          )}
    </View>
  );
}

/** Empty slot; tinted so the opening tray reads white-left / black-right before rolling. */
function EmptyDiePlaceholder({ playerColor, size }: { playerColor?: PlayerColor; size: number }) {
  return (
    <View
      style={[
        styles.die,
        dieBox(size),
        styles.diePlaceholder,
        playerColor === 'white' && styles.diePlaceholderWhite,
        playerColor === 'black' && styles.diePlaceholderBlack,
      ]}
    />
  );
}

function DiceFaces({
  dice,
  remainingDice,
  playerColor,
  slotColors,
  emphasis,
  displayStyle,
  size,
}: {
  dice: [number, number];
  remainingDice: number[];
  playerColor: PlayerColor;
  slotColors?: readonly [PlayerColor, PlayerColor];
  emphasis?: 0 | 1 | null;
  displayStyle: DiceDisplayStyle;
  size: number;
}) {
  const remaining = [...remainingDice];
  const diceStates = dice.map((v) => {
    const idx = remaining.indexOf(v);
    if (idx !== -1) {
      remaining.splice(idx, 1);
      return { value: v, used: false };
    }
    return { value: v, used: true };
  });
  const isDoubles = dice[0] === dice[1] && dice[0] !== 0;
  const totalRemaining = remainingDice.filter(v => v === dice[0]).length;
  const leftColor = slotColors?.[0] ?? playerColor;
  const rightColor = slotColors?.[1] ?? playerColor;

  if (isDoubles && !slotColors) {
    return DOUBLE_DIE_SLOTS.map((slot, slotIndex) => (
      <DieFace
        key={slot}
        value={dice[0]}
        used={slotIndex >= totalRemaining}
        playerColor={playerColor}
        displayStyle={displayStyle}
        size={size}
      />
    ));
  }

  return (
    <>
      {diceStates[0]!.value === 0
        ? <EmptyDiePlaceholder playerColor={slotColors?.[0]} size={size} />
        : (
            <DieFace
              value={diceStates[0]!.value}
              used={diceStates[0]!.used}
              playerColor={leftColor}
              displayStyle={displayStyle}
              size={size}
              emphasized={emphasis === 0}
            />
          )}
      {diceStates[1]!.value === 0
        ? <EmptyDiePlaceholder playerColor={slotColors?.[1]} size={size} />
        : (
            <DieFace
              value={diceStates[1]!.value}
              used={diceStates[1]!.used}
              playerColor={rightColor}
              displayStyle={displayStyle}
              size={size}
              emphasized={emphasis === 1}
            />
          )}
    </>
  );
}

export function DiceDisplay({
  dice,
  remainingDice,
  playerColor,
  slotColors,
  emphasis = null,
  displayStyle = 'dots',
  animateRoll = true,
  size = TRAY_DIE_SIZE,
}: Props) {
  const { containerStyle, reducedMotion } = useDiceRollAnimation(dice, animateRoll);

  return (
    <Animated.View testID={reducedMotion ? 'dice-display-reduced-motion' : 'dice-display'} style={[styles.container, { minHeight: size }, containerStyle]}>
      <DiceFaces
        dice={dice}
        remainingDice={remainingDice}
        playerColor={playerColor}
        slotColors={slotColors}
        emphasis={emphasis}
        displayStyle={displayStyle}
        size={size}
      />
    </Animated.View>
  );
}

function dieBox(size: number) {
  return { width: size, height: size, borderRadius: Math.round(size * 0.23) };
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    minHeight: 44,
  },
  die: {
    borderWidth: 2,
    justifyContent: 'center',
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.5,
    shadowRadius: 3,
    elevation: 4,
  },
  dieEmphasized: {
    shadowColor: GAME_PALETTE.accent,
    shadowOpacity: 0.6,
    shadowRadius: 6,
  },
  diePlaceholder: {
    backgroundColor: 'rgba(80,60,40,0.25)',
    borderColor: 'rgba(90,70,50,0.35)',
    opacity: 0.5,
  },
  diePlaceholderWhite: {
    borderColor: '#BBA070',
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  diePlaceholderBlack: {
    borderColor: '#5050A0',
    borderStyle: 'dashed',
    opacity: 0.7,
  },
  dieText: {
    fontWeight: '800',
  },
});
