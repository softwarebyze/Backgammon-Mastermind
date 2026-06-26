import type { MoveLogEntry } from '@/lib/game/move-log';
import { ScrollView, StyleSheet, Text, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { formatMoveLogEntry } from '@/lib/game/move-log';
import { interFont } from '@/lib/ui/fonts';

type Props = {
  entries: MoveLogEntry[];
};

export function MoveHistoryList({ entries }: Props) {
  if (entries.length === 0) {
    return (
      <View style={styles.empty}>
        <Text style={styles.emptyText}>No moves yet — roll to start.</Text>
      </View>
    );
  }

  return (
    <ScrollView style={styles.list} nestedScrollEnabled>
      {entries.map(entry => (
        <View key={entry.ply} style={styles.row}>
          <Text style={styles.ply}>{entry.ply}</Text>
          <Text style={styles.text}>{formatMoveLogEntry(entry)}</Text>
        </View>
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  list: {
    maxHeight: 220,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    backgroundColor: GAME_PALETTE.bg,
    borderRadius: 12,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    borderBottomWidth: StyleSheet.hairlineWidth,
    borderBottomColor: GAME_PALETTE.surfaceBorder,
  },
  ply: {
    width: 28,
    color: GAME_PALETTE.accentDim,
    fontSize: 13,
    ...interFont('semibold'),
  },
  text: {
    flex: 1,
    color: GAME_PALETTE.text,
    fontSize: 14,
    ...interFont('regular'),
  },
  empty: {
    padding: 16,
    borderWidth: 1,
    borderColor: GAME_PALETTE.surfaceBorder,
    backgroundColor: GAME_PALETTE.bg,
    borderRadius: 12,
  },
  emptyText: {
    color: GAME_PALETTE.textMuted,
    fontSize: 14,
    textAlign: 'center',
    ...interFont('regular'),
  },
});
