import type { Position } from '@/lib/positions/position';
import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, Text, View } from 'react-native';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { DoublingCubeFace } from '@/features/game/components/doubling-cube-face';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { PositionAction } from './position-controls';
import { styles } from './position-styles';

export function PositionCube({ position: p, onChange }: { position: Position; onChange: (p: Position) => void }) {
  const [open, setOpen] = useState(false);
  const cube = p.context;
  const value = 2 ** cube.cubeExponent;
  const owner = translate(cube.cubeOwner ? `positions.${cube.cubeOwner}` : 'positions.center');
  const change = (patch: Partial<Position['context']>) => onChange({ ...p, context: { ...cube, ...patch } });
  const adjust = (delta: number) => change({ cubeExponent: Math.max(0, Math.min(cube.maxCube, cube.cubeExponent + delta)) });
  return (
    <View style={{ gap: 12 }}>
      <Pressable
        testID="position-cube"
        accessibilityRole="button"
        accessibilityLabel={`${translate('positions.cube')}: ${value}. ${translate('positions.cube_owner')}: ${owner}${cube.crawford ? `. ${translate('positions.crawford')}` : ''}`}
        accessibilityState={{ expanded: open }}
        onPress={() => setOpen(!open)}
        style={({ pressed }) => [styles.disclosureRow, pressed && styles.pressed]}
      >
        <DoublingCubeFace value={value} unavailable={cube.crawford} />
        <View style={styles.disclosureLabel}>
          <Text style={styles.disclosureTitle}>{translate('positions.cube')}</Text>
          <Text style={styles.caption}>
            {value}
            {' '}
            × ·
            {' '}
            {owner}
            {cube.crawford ? ` · ${translate('positions.crawford')}` : ''}
          </Text>
        </View>
        <Feather name={open ? 'chevron-up' : 'chevron-down'} size={18} color={GAME_PALETTE.accentDim} accessible={false} />
      </Pressable>
      {open && (
        <View style={{ gap: 12 }}>
          <View style={styles.row}>
            <PositionAction symbol="minus" iconOnly label={translate('positions.cube_lower')} testID="position-cube-lower" disabled={cube.cubeExponent === 0} onPress={() => adjust(-1)} />
            <PositionAction symbol="rotate-ccw" label={translate('positions.reset_cube')} testID="position-cube-reset" onPress={() => change({ cubeExponent: 0, cubeOwner: null })} />
            <PositionAction symbol="plus" iconOnly label={translate('positions.cube_higher')} testID="position-cube-higher" disabled={cube.cubeExponent >= cube.maxCube} onPress={() => adjust(1)} />
          </View>
          <Text style={styles.caption}>{translate('positions.cube_owner')}</Text>
          <View style={styles.row}>
            {([null, 'white', 'black'] as const).map(side => <PositionAction key={side ?? 'center'} compact icon={side ? <CheckerToken player={side} size={20} /> : undefined} symbol={side ? undefined : 'minus'} label={translate(side ? `positions.${side}` : 'positions.center')} testID={`position-cube-owner-${side ?? 'center'}`} selected={cube.cubeOwner === side} onPress={() => change({ cubeOwner: side })} />)}
          </View>
        </View>
      )}
    </View>
  );
}
