import type { Position } from '@/lib/positions/position';
import type { SavedPosition } from '@/lib/positions/saved-positions';
import Feather from '@expo/vector-icons/Feather';
import { useState } from 'react';
import { Pressable, Text, TextInput, View } from 'react-native';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { translate } from '@/lib/i18n';
import { deleteSavedPosition, savePosition } from '@/lib/positions/saved-positions';
import { PositionAction } from './position-controls';
import { positionError } from './position-errors';
import { styles } from './position-styles';
import { savedPositionMeta } from './saved-position-meta';

export function PositionSaved({ position, valid, saved, onSaved, onOpen }: {
  position: Position;
  valid: boolean;
  saved: SavedPosition[];
  onSaved: (entries: SavedPosition[]) => void;
  onOpen: (entry: SavedPosition) => void;
}) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [message, setMessage] = useState<{ text: string; error: boolean } | null>(null);
  const save = () => {
    try {
      onSaved(savePosition(name.trim() || translate('positions.untitled'), position, { note }));
      setName('');
      setNote('');
      setMessage({ text: translate('positions.saved_notice'), error: false });
    }
    catch (err) { setMessage({ text: positionError(err), error: true }); }
  };
  return (
    <View style={styles.detailPanel}>
      <TextInput testID="position-save-name" accessibilityLabel={translate('positions.name')} placeholder={translate('positions.name')} placeholderTextColor="#CBB8A7" value={name} maxLength={80} onChangeText={setName} style={styles.input} />
      <TextInput testID="position-save-note" accessibilityLabel={translate('positions.note')} placeholder={translate('positions.note')} placeholderTextColor="#CBB8A7" value={note} maxLength={500} multiline onChangeText={setNote} style={[styles.input, { minHeight: 64 }]} />
      <PositionAction label={translate('positions.save')} symbol="bookmark" testID="position-save" disabled={!valid} onPress={save} />
      {message && <Text accessibilityLiveRegion="polite" style={message.error ? styles.error : styles.caption}>{message.text}</Text>}
      {saved.length
        ? (
            <View style={styles.savedList}>
              {saved.map((entry, index) => (
                <View style={[styles.savedRow, index === 0 && { borderTopWidth: 0 }]} key={entry.id}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${entry.name}. ${savedPositionMeta(entry)}`}
                    onPress={() => onOpen(entry)}
                    style={({ pressed }) => [styles.savedOpen, pressed && styles.pressed]}
                  >
                    <Text numberOfLines={1} style={styles.savedName}>{entry.name}</Text>
                    {!!savedPositionMeta(entry) && <Text style={styles.savedMeta}>{savedPositionMeta(entry)}</Text>}
                    {!!entry.note && <Text numberOfLines={2} style={styles.savedNote}>{entry.note}</Text>}
                  </Pressable>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel={`${translate('positions.delete')}: ${entry.name}`}
                    hitSlop={4}
                    onPress={() => onSaved(deleteSavedPosition(entry.id))}
                    style={({ pressed }) => [styles.paintSwatch, pressed && styles.pressed]}
                  >
                    <Feather name="trash-2" size={18} color={GAME_PALETTE.accentDim} accessible={false} />
                  </Pressable>
                </View>
              ))}
            </View>
          )
        : <Text style={styles.caption}>{translate('positions.no_saved')}</Text>}
    </View>
  );
}
