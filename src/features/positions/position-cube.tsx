import type { Position } from '@/lib/positions/position';
import { Text, View } from 'react-native';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { DoublingCubeFace } from '@/features/game/components/doubling-cube-face';
import { translate } from '@/lib/i18n';
import { PositionAction } from './position-controls';
import { styles } from './position-styles';

export function PositionCube({ position: p, onChange }: { position: Position; onChange: (p: Position) => void }) {
  const cube = p.context;
  const value = 2 ** cube.cubeExponent;
  const change = (patch: Partial<Position['context']>) => onChange({ ...p, context: { ...cube, ...patch } });
  const adjust = (delta: number) => change({ cubeExponent: Math.max(0, Math.min(cube.maxCube, cube.cubeExponent + delta)) });
  return (
    <View style={{ gap: 12 }}>
      <View style={{ alignItems: 'center' }}><DoublingCubeFace value={value} unavailable={cube.crawford} size={52} /></View>
      {cube.crawford && (
        <>
          <Text testID="position-crawford-hint" style={styles.caption}>{translate('positions.crawford_hint')}</Text>
          <PositionAction label={translate('positions.crawford_off')} testID="position-crawford-off" onPress={() => change({ crawford: false })} />
        </>
      )}
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
  );
}
