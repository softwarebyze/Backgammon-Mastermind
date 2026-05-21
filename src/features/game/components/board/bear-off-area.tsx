import * as React from 'react';
import { Text, View } from 'react-native';
import { CheckerToken } from './checker-token';

type Props = {
  whiteBorneOff: number;
  blackBorneOff: number;
  width: number;
  boardHeight: number;
  middleHeight: number;
  checkerSize: number;
};

export function BearOffArea({
  whiteBorneOff,
  blackBorneOff,
  width,
  boardHeight,
  middleHeight,
  checkerSize,
}: Props) {
  const halfHeight = (boardHeight - middleHeight) / 2;
  const small = checkerSize * 0.72;

  const renderStack = (count: number, player: 'white' | 'black', justify: 'flex-start' | 'flex-end') => {
    const visible = Math.min(count, 8);
    return (
      <View
        style={{
          height: halfHeight,
          alignItems: 'center',
          justifyContent: justify,
          paddingVertical: 4,
          gap: 1,
        }}
      >
        <Text style={{ color: '#A08060', fontSize: 8, marginBottom: 2 }}>
          {player === 'black' ? '▲' : '▽'}
        </Text>
        {Array.from({ length: visible }, (_, i) => (
          <CheckerToken key={i} player={player} size={small} />
        ))}
        {count > visible && (
          <Text style={{ color: '#D4A843', fontSize: 8, fontWeight: '700' }}>
            +
            {count - visible}
          </Text>
        )}
        {count === 0 && (
          <View
            style={{
              width: small,
              height: small,
              borderRadius: small / 2,
              borderWidth: 1,
              borderColor: '#5A3A1A',
              borderStyle: 'dashed',
            }}
          />
        )}
      </View>
    );
  };

  return (
    <View
      style={{
        width,
        height: boardHeight,
        backgroundColor: '#221002',
        borderLeftWidth: 1,
        borderColor: '#5A3A1A',
        alignItems: 'center',
      }}
    >
      {/* Black borne off (top) */}
      {renderStack(blackBorneOff, 'black', 'flex-start')}

      {/* Middle gap */}
      <View style={{ height: middleHeight, backgroundColor: '#221002', width }} />

      {/* White borne off (bottom) */}
      {renderStack(whiteBorneOff, 'white', 'flex-end')}
    </View>
  );
}
