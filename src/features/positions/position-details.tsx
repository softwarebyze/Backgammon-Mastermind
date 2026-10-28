import type { Position } from '@/lib/positions/position';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { translate } from '@/lib/i18n';
import { PositionAction, PositionNumber } from './position-controls';
import { styles } from './position-styles';

export function PositionDetails({ position: p, onChange }: { position: Position; onChange: (p: Position) => void }) {
  const [expanded, setExpanded] = useState(false);
  const context = (patch: Partial<Position['context']>) => onChange({ ...p, context: { ...p.context, ...patch } });
  return (
    <View style={{ gap: 12 }}>
      <View style={styles.row}>
        {(['white', 'black'] as const).map(player => (
          <PositionAction
            key={player}
            compact
            label={translate(`positions.${player}_turn`)}
            selected={p.currentPlayer === player}
            testID={`position-turn-${player}`}
            onPress={() => {
              if (p.currentPlayer !== player)
                onChange({ ...p, currentPlayer: player, context: { ...p.context, turnOwner: player, doubleAction: '', resignation: 0 } });
            }}
          />
        ))}
        <PositionAction symbol="x" iconOnly label={translate('positions.clear_dice')} testID="position-clear-dice" onPress={() => onChange({ ...p, dice: [0, 0] })} />
      </View>
      <PositionAction symbol="plus-square" label={translate('positions.match_details')} onPress={() => setExpanded(!expanded)} selected={expanded} />
      {expanded && (
        <>
          <Text style={styles.caption}>{translate('positions.context_hint')}</Text>
          <View style={styles.row}>
            <PositionNumber label={translate('positions.cube_exponent')} value={p.context.cubeExponent} max={15} onChange={cubeExponent => context({ cubeExponent })} />
            <PositionNumber label={translate('positions.match_length')} value={p.context.matchLength} onChange={matchLength => context({ matchLength, crawford: false, jacoby: false, beavers: false })} />
            {(['white', 'black'] as const).map(player => <PositionNumber key={player} label={translate(`positions.${player}_score`)} value={p.context.scores[player]} onChange={value => context({ scores: { ...p.context.scores, [player]: value } })} />)}
          </View>
          <Text style={styles.caption}>{translate('positions.cube_owner')}</Text>
          <View style={styles.row}>
            {([null, 'white', 'black'] as const).map(owner => <PositionAction key={owner ?? 'center'} label={translate(owner ? `positions.${owner}` : 'positions.center')} selected={p.context.cubeOwner === owner} onPress={() => context({ cubeOwner: owner })} />)}
          </View>
          <View style={styles.row}>
            {p.context.matchLength > 0
              ? <PositionAction label={translate('positions.crawford')} selected={p.context.crawford} onPress={() => context({ crawford: !p.context.crawford })} />
              : (
                  <>
                    <PositionAction label={translate('positions.jacoby')} selected={p.context.jacoby} onPress={() => context({ jacoby: !p.context.jacoby })} />
                    <PositionAction label={translate('positions.beavers')} selected={p.context.beavers} onPress={() => context({ beavers: !p.context.beavers })} />
                  </>
                )}
          </View>
        </>
      )}
    </View>
  );
}
