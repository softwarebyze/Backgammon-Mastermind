import type { DiceDisplayStyle } from '@/lib/game-preferences/types';
import * as React from 'react';
import { useEffect, useRef, useState } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

type Props = {
  dice: [number, number];
  remainingDice: number[];
  playerColor: 'white' | 'black';
  displayStyle?: DiceDisplayStyle;
};

const DOUBLE_DIE_SLOTS = ['slot-a', 'slot-b', 'slot-c', 'slot-d'] as const;
const EMPTY_DICE_KEY = '0,0';
const ROLL_FRAMES = 10;
const ROLL_FRAME_MS = 65;
const SHAKE_PX = 8;

const DOT_LAYOUTS: Record<number, Array<[number, number]>> = {
  1: [[0.5, 0.5]],
  2: [[0.28, 0.28], [0.72, 0.72]],
  3: [[0.28, 0.28], [0.5, 0.5], [0.72, 0.72]],
  4: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.72], [0.72, 0.72]],
  5: [[0.28, 0.28], [0.72, 0.28], [0.5, 0.5], [0.28, 0.72], [0.72, 0.72]],
  6: [[0.28, 0.28], [0.72, 0.28], [0.28, 0.5], [0.72, 0.5], [0.28, 0.72], [0.72, 0.72]],
};

function randomDie(): number {
  return Math.floor(Math.random() * 6) + 1;
}

function diceKey(dice: [number, number]): string {
  return `${dice[0]},${dice[1]}`;
}

function hasRolledDice(dice: [number, number]): boolean {
  return dice[0] !== 0 || dice[1] !== 0;
}

function useDiceRollAnimation(dice: [number, number]) {
  const [shuffleDice, setShuffleDice] = useState<[number, number] | null>(null);
  const lastKey = useRef<string | null>(null);
  const shake = useSharedValue(0);
  const dieScale = useSharedValue(1);
  const isRolling = shuffleDice !== null;
  const displayDice = isRolling ? shuffleDice : dice;

  useEffect(() => {
    const key = diceKey(dice);

    if (lastKey.current === null) {
      lastKey.current = key;
      return;
    }

    if (key === lastKey.current) {
      return;
    }

    const previousKey = lastKey.current;
    lastKey.current = key;

    if (!hasRolledDice(dice)) {
      dieScale.value = 1;
      const resetTimer = setTimeout(() => setShuffleDice(null), 0);
      return () => clearTimeout(resetTimer);
    }

    if (previousKey !== EMPTY_DICE_KEY && previousKey === key) {
      return;
    }

    let frame = 0;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const finish = () => {
      if (cancelled) {
        return;
      }
      setShuffleDice(null);
      dieScale.value = withTiming(1, { duration: 120 });
    };

    const start = () => {
      if (cancelled) {
        return;
      }
      setShuffleDice([randomDie(), randomDie()]);
      dieScale.value = withSequence(
        withTiming(1.12, { duration: 80 }),
        withTiming(1.06, { duration: ROLL_FRAMES * ROLL_FRAME_MS }),
      );
      shake.value = withSequence(
        withTiming(SHAKE_PX, { duration: 50 }),
        withTiming(-SHAKE_PX, { duration: 50 }),
        withTiming(SHAKE_PX * 0.6, { duration: 50 }),
        withTiming(-SHAKE_PX * 0.6, { duration: 50 }),
        withTiming(0, { duration: 80 }),
      );
      interval = setInterval(() => {
        frame += 1;
        if (frame >= ROLL_FRAMES) {
          if (interval) {
            clearInterval(interval);
          }
          finish();
          return;
        }
        setShuffleDice([randomDie(), randomDie()]);
      }, ROLL_FRAME_MS);
    };

    const startTimer = setTimeout(start, 0);

    return () => {
      cancelled = true;
      clearTimeout(startTimer);
      if (interval) {
        clearInterval(interval);
      }
    };
  }, [dice, shake, dieScale]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [
      { translateX: shake.value },
      { scale: dieScale.value },
    ],
  }));

  return { displayDice, isRolling, containerStyle, showDice: hasRolledDice(dice) || isRolling };
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
  isRolling,
}: {
  value: number;
  used: boolean;
  playerColor: 'white' | 'black';
  displayStyle: DiceDisplayStyle;
  isRolling: boolean;
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
          borderColor: border,
          opacity: used ? 0.4 : isRolling ? 0.95 : 1,
        },
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

function EmptyDiePlaceholder() {
  return <View style={[styles.die, styles.diePlaceholder]} />;
}

function DiceDisplayAnimated({
  dice,
  remainingDice,
  playerColor,
  displayStyle = 'numbers',
}: Props) {
  const { displayDice, isRolling, containerStyle, showDice } = useDiceRollAnimation(dice);

  if (!showDice) {
    return (
      <Animated.View style={[styles.container, containerStyle]}>
        <EmptyDiePlaceholder />
        <EmptyDiePlaceholder />
      </Animated.View>
    );
  }

  const remaining = [...remainingDice];
  const diceStates = displayDice.map((v) => {
    const idx = remaining.indexOf(v);
    if (idx !== -1) {
      remaining.splice(idx, 1);
      return { value: v, used: false };
    }
    return { value: v, used: true };
  });

  const isDoubles = displayDice[0] === displayDice[1];
  const totalRemaining = remainingDice.filter(v => v === dice[0]).length;

  return (
    <Animated.View style={[styles.container, containerStyle]}>
      {isDoubles
        ? (
            DOUBLE_DIE_SLOTS.map((slot, slotIndex) => (
              <DieFace
                key={slot}
                value={displayDice[0]}
                used={slotIndex >= totalRemaining}
                playerColor={playerColor}
                displayStyle={displayStyle}
                isRolling={isRolling}
              />
            ))
          )
        : (
            <>
              {diceStates[0] && (
                <DieFace
                  key="die-left"
                  value={diceStates[0].value}
                  used={diceStates[0].used}
                  playerColor={playerColor}
                  displayStyle={displayStyle}
                  isRolling={isRolling}
                />
              )}
              {diceStates[1] && (
                <DieFace
                  key="die-right"
                  value={diceStates[1].value}
                  used={diceStates[1].used}
                  playerColor={playerColor}
                  displayStyle={displayStyle}
                  isRolling={isRolling}
                />
              )}
            </>
          )}
    </Animated.View>
  );
}

export function DiceDisplay({ dice, remainingDice, playerColor, displayStyle = 'numbers' }: Props) {
  return (
    <DiceDisplayAnimated
      dice={dice}
      remainingDice={remainingDice}
      playerColor={playerColor}
      displayStyle={displayStyle}
    />
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
  diePlaceholder: {
    backgroundColor: 'rgba(80,60,40,0.25)',
    borderColor: 'rgba(90,70,50,0.35)',
    opacity: 0.5,
  },
  dieText: {
    fontSize: 22,
    fontWeight: '800',
  },
});
