import type { Player } from '@/lib/game/types';
import * as React from 'react';
import { StyleSheet, Text, View } from 'react-native';

type Props = {
  player: Player;
  size: number;
  showCount?: number;
  style?: object;
};

export function CheckerToken({ player, size, showCount, style }: Props) {
  const isWhite = player === 'white';
  return (
    <View
      style={[
        {
          width: size,
          height: size,
          borderRadius: size / 2,
          backgroundColor: isWhite ? '#F2EAD3' : '#1E1E30',
          borderWidth: 2,
          borderColor: isWhite ? '#BBA070' : '#5050A0',
          justifyContent: 'center',
          alignItems: 'center',
          shadowColor: '#000',
          shadowOffset: { width: 0, height: 1 },
          shadowOpacity: 0.4,
          shadowRadius: 2,
          elevation: 3,
        },
        style,
      ]}
    >
      {/* Inner highlight ring */}
      <View
        style={{
          width: size * 0.55,
          height: size * 0.55,
          borderRadius: (size * 0.55) / 2,
          borderWidth: 1.5,
          borderColor: isWhite ? 'rgba(255,255,255,0.7)' : 'rgba(120,120,200,0.5)',
        }}
      />
      {showCount !== undefined && showCount > 0 && (
        <Text
          style={[
            StyleSheet.absoluteFillObject,
            {
              color: isWhite ? '#3A2A10' : '#E0E0FF',
              fontSize: size * 0.35,
              fontWeight: '700',
              textAlign: 'center',
              lineHeight: size,
            },
          ]}
        >
          {showCount}
        </Text>
      )}
    </View>
  );
}
