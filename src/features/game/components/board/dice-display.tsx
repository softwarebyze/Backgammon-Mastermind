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
const ROLL_FRAMES = 7;
const ROLL_FRAME_MS = 55;

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

function useDiceRollAnimation(dice: [number, number]) {
  const [displayDice, setDisplayDice] = useState(dice);
  const [isRolling, setIsRolling] = useState(false);
  const lastKey = useRef(diceKey(dice));
  const shake = useSharedValue(0);

  useEffect(() => {
    const key = diceKey(dice);
    if (key === lastKey.current) {
      return;
    }
    lastKey.current = key;

    let frame = 0;
    let cancelled = false;
    let interval: ReturnType<typeof setInterval> | undefined;

    const finish = () => {
      if (cancelled) {
        return;
      }
      setDisplayDice(dice);
      setIsRolling(false);
    };

    const start = () => {
      if (cancelled) {
        return;
      }
      setIsRolling(true);
      shake.value = withSequence(
        withTiming(6, { duration: 45 }),
        withTiming(-6, { duration: 45 }),
        withTiming(4, { duration: 45 }),
        withTiming(0, { duration: 45 }),
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
        setDisplayDice([randomDie(), randomDie()]);
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
  }, [dice, shake]);

  const containerStyle = useAnimatedStyle(() => ({
    transform: [{ translateX: shake.value }],
  }));

  return { displayDice, isRolling, containerStyle };
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
          opacity: used ? 0.4 : isRolling ? 0.92 : 1,
          transform: [{ scale: isRolling ? 1.06 : 1 }],
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

function DiceDisplayAnimated({
  dice,
  remainingDice,
  playerColor,
  displayStyle = 'numbers',
}: Props) {
  const { displayDice, isRolling, containerStyle } = useDiceRollAnimation(dice);

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
  if (dice[0] === 0 && dice[1] === 0) {
    return null;
  }

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
  dieText: {
    fontSize: 22,
    fontWeight: '800',
  },
});
