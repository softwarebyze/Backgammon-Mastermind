import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  dice: [number, number];
  remainingDice: number[];
  playerColor: 'white' | 'black';
};

function DieFace({ value, used, playerColor }: { value: number; used: boolean; playerColor: 'white' | 'black' }) {
  const isWhite = playerColor === 'white';
  return (
    <View
      style={[
        styles.die,
        {
          backgroundColor: used
            ? 'rgba(100,80,60,0.4)'
            : isWhite
              ? '#F2EAD3'
              : '#1E1E30',
          borderColor: used
            ? '#5A4030'
            : isWhite
              ? '#BBA070'
              : '#5050A0',
          opacity: used ? 0.4 : 1,
        },
      ]}
    >
      <Text
        style={[
          styles.dieText,
          {
            color: used ? '#7A6050' : isWhite ? '#2A1A08' : '#E0E0FF',
          },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

export function DiceDisplay({ dice, remainingDice, playerColor }: Props) {
  if (dice[0] === 0 && dice[1] === 0)
    return null;

  // Mark which dice values have been used
  const remaining = [...remainingDice];
  const diceStates = dice.map((v) => {
    const idx = remaining.indexOf(v);
    if (idx !== -1) {
      remaining.splice(idx, 1);
      return { value: v, used: false };
    }
    return { value: v, used: true };
  });

  // For doubles, show all 4
  const isDoubles = dice[0] === dice[1];
  const totalRemaining = remainingDice.filter(v => v === dice[0]).length;

  return (
    <View style={styles.container}>
      {isDoubles
        ? (
            <>
              {[0, 1, 2, 3].map(i => (
                <DieFace key={i} value={dice[0]} used={i >= totalRemaining} playerColor={playerColor} />
              ))}
            </>
          )
        : (
            diceStates.map((d, i) => (
              <DieFace key={i} value={d.value} used={d.used} playerColor={playerColor} />
            ))
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
