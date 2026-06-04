import type { DiceDisplayStyle } from '@/lib/game-preferences/types';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

const DOTS_5: Array<[number, number]> = [
  [0.28, 0.28],
  [0.72, 0.28],
  [0.5, 0.5],
  [0.28, 0.72],
  [0.72, 0.72],
];

type Props = {
  value?: number;
  style: DiceDisplayStyle;
  size?: number;
  /** Pair preview e.g. 5 and 5 for settings picker */
  pair?: [number, number];
};

export function DieFacePreview({ value = 5, style, size = 36, pair }: Props) {
  if (pair) {
    return (
      <View style={previewStyles.pair}>
        <SingleDie value={pair[0]} displayStyle={style} size={size} />
        <SingleDie value={pair[1]} displayStyle={style} size={size} />
      </View>
    );
  }
  return <SingleDie value={value} displayStyle={style} size={size} />;
}

function SingleDie({
  value,
  displayStyle,
  size,
}: {
  value: number;
  displayStyle: DiceDisplayStyle;
  size: number;
}) {
  return (
    <View
      style={[
        previewStyles.die,
        {
          width: size,
          height: size,
          borderRadius: size * 0.22,
        },
      ]}
    >
      {displayStyle === 'dots'
        ? (
            <View style={StyleSheet.absoluteFill}>
              {DOTS_5.map(([x, y]) => (
                <View
                  key={`${x}-${y}`}
                  style={{
                    position: 'absolute',
                    left: `${x * 100}%`,
                    top: `${y * 100}%`,
                    width: size * 0.14,
                    height: size * 0.14,
                    marginLeft: -(size * 0.07),
                    marginTop: -(size * 0.07),
                    borderRadius: size * 0.07,
                    backgroundColor: '#2A1A08',
                  }}
                />
              ))}
            </View>
          )
        : (
            <Text style={[previewStyles.number, { fontSize: size * 0.48 }]}>
              {value}
            </Text>
          )}
    </View>
  );
}

const previewStyles = StyleSheet.create({
  pair: {
    flexDirection: 'row',
    gap: 6,
    alignItems: 'center',
  },
  die: {
    backgroundColor: '#F2EAD3',
    borderWidth: 1.5,
    borderColor: '#BBA070',
    justifyContent: 'center',
    alignItems: 'center',
  },
  number: {
    color: '#2A1A08',
    fontWeight: '800',
  },
});
