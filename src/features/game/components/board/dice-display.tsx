import type { DiceDisplayStyle } from '@/lib/game-preferences/types';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  dice: [number, number];
  remainingDice: number[];
  playerColor: 'white' | 'black';
  displayStyle?: DiceDisplayStyle;
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
}: {
  value: number;
  used: boolean;
  playerColor: 'white' | 'black';
  displayStyle: DiceDisplayStyle;
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
          opacity: used ? 0.4 : 1,
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

export function DiceDisplay({ dice, remainingDice, playerColor, displayStyle = 'numbers' }: Props) {
  if (dice[0] === 0 && dice[1] === 0) {
    return null;
  }

  const remaining = [...remainingDice];
  const diceStates = dice.map((v) => {
    const idx = remaining.indexOf(v);
    if (idx !== -1) {
      remaining.splice(idx, 1);
      return { value: v, used: false };
    }
    return { value: v, used: true };
  });

  const isDoubles = dice[0] === dice[1];
  const totalRemaining = remainingDice.filter(v => v === dice[0]).length;

  return (
    <View style={styles.container}>
      {isDoubles
        ? (
            DOUBLE_DIE_SLOTS.map((slot, slotIndex) => (
              <DieFace
                key={slot}
                value={dice[0]}
                used={slotIndex >= totalRemaining}
                playerColor={playerColor}
                displayStyle={displayStyle}
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
                />
              )}
              {diceStates[1] && (
                <DieFace
                  key="die-right"
                  value={diceStates[1].value}
                  used={diceStates[1].used}
                  playerColor={playerColor}
                  displayStyle={displayStyle}
                />
              )}
            </>
          )}
    </View>
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
