import type { Position } from '@/lib/positions/position';
import { useState } from 'react';
import { Text, View } from 'react-native';
import { translate } from '@/lib/i18n';
import { PositionAction, PositionNumber, PositionSection } from './position-controls';
import { styles } from './position-styles';

export function PositionDetails({ position: p, onChange }: { position: Position; onChange: (p: Position) => void }) {
  const [expanded, setExpanded] = useState(false);
  const context = (patch: Partial<Position['context']>) => onChange({ ...p, context: { ...p.context, ...patch } });
  return (
    <PositionSection title={translate('positions.turn_dice')}>
      <View style={styles.row}>
        {(['white', 'black'] as const).map(player => (
          <PositionAction key={player} label={translate(`positions.${player}_turn`)} selected={p.currentPlayer === player} testID={`position-turn-${player}`} onPress={() => onChange({ ...p, currentPlayer: player, context: { ...p.context, turnOwner: player, doubleAction: '', resignation: 0 } })} />
        ))}
      </View>
      <Text style={styles.caption}>{translate('positions.dice_hint')}</Text>
      <View style={styles.row}>
        {([0, 1] as const).map(index => (
          <PositionNumber
            key={index}
            label={translate(index === 0 ? 'positions.die_one' : 'positions.die_two')}
            value={p.dice[index]}
            max={6}
            testID={`position-die-${index}`}
            onChange={(value) => {
              const dice: [number, number] = [...p.dice];
              dice[index] = value;
              onChange({ ...p, dice });
            }}
          />
        ))}
        <PositionAction label={translate('positions.clear_dice')} onPress={() => onChange({ ...p, dice: [0, 0] })} />
      </View>
      <PositionAction label={translate('positions.match_details')} onPress={() => setExpanded(!expanded)} selected={expanded} />
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
    </PositionSection>
  );
}
