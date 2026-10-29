import type { BoardDimensions } from '@/features/game/hooks/use-board-dimensions';
import type { Position } from '@/lib/positions/position';
import { Pressable, Text, View } from 'react-native';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { DoublingCubeFace } from '@/features/game/components/doubling-cube-face';
import { translate } from '@/lib/i18n';
import { boardCubeLayout } from './board-cube-layout';
import { PositionAction } from './position-controls';
import { PositionStepper } from './position-stepper';
import { StripPanel } from './position-strip-panel';
import { styles } from './position-styles';

function cubeLabel(p: Position): string {
  const owner = translate(p.context.cubeOwner ? `positions.${p.context.cubeOwner}` : 'positions.center');
  return `${translate('positions.cube')}: ${2 ** p.context.cubeExponent}. ${translate('positions.cube_owner')}: ${owner}${p.context.crawford ? `. ${translate('positions.crawford')}` : ''}`;
}

/** The one cube, drawn in the bar. Tapping it opens its controls in the strip. */
export function BoardCube({ position: p, dimensions, selected, onPress }: {
  position: Position;
  dimensions: BoardDimensions;
  selected: boolean;
  onPress: () => void;
}) {
  const { size, left, top } = boardCubeLayout(dimensions, p.context.cubeOwner);
  return (
    <Pressable
      testID="position-cube"
      accessibilityRole="button"
      accessibilityLabel={cubeLabel(p)}
      accessibilityState={{ expanded: selected }}
      hitSlop={8}
      onPress={onPress}
      style={({ pressed }) => [styles.boardCube, { left, top, width: size, height: size }, selected && styles.boardCubeSelected, pressed && styles.pressed]}
    >
      <DoublingCubeFace value={2 ** p.context.cubeExponent} unavailable={p.context.crawford} size={size} />
    </Pressable>
  );
}

export function PositionCubePanel({ position: p, onChange, onDone }: { position: Position; onChange: (p: Position) => void; onDone: () => void }) {
  const cube = p.context;
  const change = (patch: Partial<Position['context']>) => onChange({ ...p, context: { ...cube, ...patch } });
  return (
    <StripPanel
      title={translate('positions.cube')}
      onDone={onDone}
      testID="position-cube-panel"
      accessory={<PositionAction compact symbol="rotate-ccw" label={translate('positions.reset_cube')} testID="position-cube-reset" disabled={cube.cubeExponent === 0 && cube.cubeOwner === null} onPress={() => change({ cubeExponent: 0, cubeOwner: null })} />}
    >
      <View style={styles.editorRow}>
        <PositionStepper
          label={translate('positions.cube')}
          testID="position-cube-value"
          value={cube.cubeExponent}
          display={String(2 ** cube.cubeExponent)}
          min={0}
          max={cube.maxCube}
          onChange={cubeExponent => change({ cubeExponent })}
        >
          <DoublingCubeFace value={2 ** cube.cubeExponent} unavailable={cube.crawford} size={46} />
        </PositionStepper>
        <View style={styles.editorSide}>
          <Text style={styles.scoreCaption}>{translate('positions.cube_owner')}</Text>
          <View style={styles.segmented} accessibilityLabel={translate('positions.cube_owner')}>
            {([null, 'black', 'white'] as const).map(side => (
              <PositionAction
                key={side ?? 'center'}
                compact
                segment
                icon={side ? <CheckerToken player={side} size={18} /> : undefined}
                label={translate(side ? `positions.${side}` : 'positions.center')}
                testID={`position-cube-owner-${side ?? 'center'}`}
                selected={cube.cubeOwner === side}
                onPress={() => change({ cubeOwner: side })}
              />
            ))}
          </View>
        </View>
      </View>
    </StripPanel>
  );
}
