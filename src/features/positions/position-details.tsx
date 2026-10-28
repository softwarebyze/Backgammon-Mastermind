import type { Position } from '@/lib/positions/position';
import Feather from '@expo/vector-icons/Feather';
import { Keyboard, Pressable, Text, View } from 'react-native';
import { CheckerToken } from '@/features/game/components/board/checker-token';
import { DoublingCubeFace } from '@/features/game/components/doubling-cube-face';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { PositionAction } from './position-controls';
import { PositionCube } from './position-cube';
import { PositionDice, PositionDiceChoices } from './position-dice';
import { PositionScoreboard } from './position-scoreboard';
import { styles } from './position-styles';

export type PositionDetail = 'cube' | 'score' | 'turn' | 0 | 1 | null;

/** The objects stay visible; only the selected object's controls take space. */
export function PositionDetails({ position: p, onChange, editing, onEdit }: { position: Position; onChange: (p: Position) => void; editing: PositionDetail; onEdit: (detail: PositionDetail) => void }) {
  const context = (patch: Partial<Position['context']>) => onChange({ ...p, context: { ...p.context, ...patch } });
  const toggle = (detail: PositionDetail) => {
    Keyboard.dismiss();
    onEdit(editing === detail ? null : detail);
  };
  const owner = translate(p.context.cubeOwner ? `positions.${p.context.cubeOwner}` : 'positions.center');
  return (
    <View style={{ gap: 8 }}>
      <View testID="position-object-dock" style={styles.objectDock}>
        <View style={styles.row}>
          <Pressable testID="position-turn" accessibilityRole="button" accessibilityLabel={translate(`positions.${p.currentPlayer}_turn`)} accessibilityState={{ expanded: editing === 'turn' }} onPress={() => toggle('turn')} style={styles.objectButton}>
            <CheckerToken player={p.currentPlayer} size={24} />
            <Feather name="chevron-down" size={12} color={GAME_PALETTE.accentDim} accessible={false} />
          </Pressable>
          <PositionDice position={p} editing={typeof editing === 'number' ? editing : null} onEdit={toggle} />
        </View>
        <Pressable testID="position-cube" accessibilityRole="button" accessibilityLabel={`${translate('positions.cube')}: ${2 ** p.context.cubeExponent}. ${translate('positions.cube_owner')}: ${owner}${p.context.crawford ? `. ${translate('positions.crawford')}` : ''}`} accessibilityState={{ expanded: editing === 'cube' }} onPress={() => toggle('cube')} style={styles.objectButton}>
          <DoublingCubeFace value={2 ** p.context.cubeExponent} unavailable={p.context.crawford} size={36} />
          {p.context.cubeOwner && <CheckerToken player={p.context.cubeOwner} size={14} />}
        </Pressable>
        <Pressable testID="position-score-toggle" accessibilityRole="button" accessibilityLabel={`${translate('positions.match_score')}: ${p.context.scores.white} – ${p.context.scores.black}. ${translate('positions.match_to')}: ${p.context.matchLength || translate('positions.money_game')}`} accessibilityState={{ expanded: editing === 'score' }} onPress={() => toggle('score')} style={styles.scoreSummary}>
          <View style={styles.scorePair}>
            <Text style={styles.lightScore}>{p.context.scores.white}</Text>
            <Text style={styles.darkScore}>{p.context.scores.black}</Text>
          </View>
          <Text style={styles.objectCaption}>{p.context.matchLength ? `${translate('positions.match_to')} ${p.context.matchLength}` : translate('positions.money_game')}</Text>
        </Pressable>
      </View>
      {editing !== null && (
        <View testID="position-detail-panel" style={styles.detailPanel}>
          <View style={styles.panelHeading}>
            <Text style={styles.disclosureTitle}>{translate(editing === 'cube' ? 'positions.cube' : editing === 'score' ? 'positions.match_score' : 'positions.turn_dice')}</Text>
            <PositionAction compact iconOnly symbol="x" label={translate('positions.close')} testID="position-detail-done" onPress={() => toggle(null)} />
          </View>
          {typeof editing === 'number' && <PositionDiceChoices position={p} onChange={onChange} editing={editing} onEdit={onEdit} />}
          {(editing === 'turn' || typeof editing === 'number') && (
            <View style={styles.row}>
              {(['white', 'black'] as const).map(player => (
                <PositionAction
                  key={player}
                  compact
                  icon={<CheckerToken player={player} size={20} />}
                  label={translate(`positions.${player}_turn`)}
                  selected={p.currentPlayer === player}
                  testID={`position-turn-${player}`}
                  onPress={() => {
                    if (p.currentPlayer !== player)
                      onChange({ ...p, currentPlayer: player, context: { ...p.context, turnOwner: player, doubleAction: '', resignation: 0 } });
                  }}
                />
              ))}
              <PositionAction symbol="x" label={translate('positions.clear_dice')} testID="position-clear-dice" onPress={() => onChange({ ...p, dice: [0, 0] })} />
            </View>
          )}
          {editing === 'cube' && <PositionCube position={p} onChange={onChange} />}
          {editing === 'score' && (
            <>
              <PositionScoreboard position={p} onChange={onChange} />
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
      )}
    </View>
  );
}
