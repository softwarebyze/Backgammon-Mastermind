import type { DiceDisplayStyle } from '@/lib/game-preferences/types';
import { useEffect, useRef } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { GAME_PALETTE } from '@/features/game/game-palette';

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
};

const DOUBLE_DIE_SLOTS = ['slot-a', 'slot-b', 'slot-c', 'slot-d'] as const;

const DOT_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.5], [0.72, 0.5], [0.28, 0.72], [0.72, 0.72]],
};

function diceKey(dice: [number, number]): string {
  return `${dice[0]},${dice[1]}`;
}

function hasRolledDice(dice: [number, number]): boolean {
  return dice[0] !== 0 || dice[1] !== 0;
}

/** Gentle settle pulse on a new roll — no flashing random values. */
function useDiceRollAnimation(dice: [number, number], animateRoll: boolean) {
  const lastKey = useRef<string | null>(null);
  const dieScale = useSharedValue(1);

  useEffect(() => {
    const key = diceKey(dice);
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
  }, [dice, animateRoll, dieScale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ scale: dieScale.value }],
  }));

  return { containerStyle };
}

function DieDots({ value, dotColor }: { value: number; dotColor: string }) {
  const layout = DOT_LAYOUTS[value] ?? DOT_LAYOUTS[1]!;
  return (
    <View style={StyleSheet.absoluteFill}>
      {layout.map(([x, y]) => (
        <View
          key={`${x}-${y}`}
          style={{
            position: 'absolute',
            left: `${x * 100}%`,
            top: `${y * 100}%`,
            width: 7,
            height: 7,
            marginLeft: -3.5,
            marginTop: -3.5,
            borderRadius: 4,
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
  emphasized = false,
}: {
  value: number;
  used: boolean;
  playerColor: PlayerColor;
  displayStyle: DiceDisplayStyle;
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

  return (
    <View
      style={[
        styles.die,
        {
          backgroundColor: bg,
          borderColor: emphasized ? GAME_PALETTE.accent : border,
          borderWidth: emphasized ? 3 : 2,
          opacity: used ? 0.4 : 1,
        },
        emphasized && styles.dieEmphasized,
      ]}
    >
      {displayStyle === 'dots'
        ? <DieDots value={value} dotColor={fg} />
        : (
            <Text style={[styles.dieText, { color: fg }]}>
              {value}
            </Text>
          )}
    </View>
  );
}

/** Empty slot; tinted so the opening tray reads white-left / black-right before rolling. */
function EmptyDiePlaceholder({ playerColor }: { playerColor?: PlayerColor }) {
  return (
    <View
      style={[
        styles.die,
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
}: {
  dice: [number, number];
  remainingDice: number[];
  playerColor: PlayerColor;
  slotColors?: readonly [PlayerColor, PlayerColor];
  emphasis?: 0 | 1 | null;
  displayStyle: DiceDisplayStyle;
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
      />
    ));
  }

  return (
    <>
      {diceStates[0]!.value === 0
        ? <EmptyDiePlaceholder playerColor={slotColors?.[0]} />
        : (
            <DieFace
              value={diceStates[0]!.value}
              used={diceStates[0]!.used}
              playerColor={leftColor}
              displayStyle={displayStyle}
              emphasized={emphasis === 0}
            />
          )}
      {diceStates[1]!.value === 0
        ? <EmptyDiePlaceholder playerColor={slotColors?.[1]} />
        : (
            <DieFace
              value={diceStates[1]!.value}
              used={diceStates[1]!.used}
              playerColor={rightColor}
              displayStyle={displayStyle}
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
}: Props) {
  const { containerStyle } = useDiceRollAnimation(dice, animateRoll);

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      <DiceFaces
        dice={dice}
        remainingDice={remainingDice}
        playerColor={playerColor}
        slotColors={slotColors}
        emphasis={emphasis}
        displayStyle={displayStyle}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    gap: 8,
    alignItems: 'center',
    minHeight: 44,
  },
  die: {
    width: 44,
    height: 44,
    borderRadius: 10,
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
    fontSize: 22,
    fontWeight: '800',
  },
});
