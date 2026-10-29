import type { GameState } from '@/lib/game/types';
import { useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, Text, TextInput, View } from 'react-native';
import { showMessage } from 'react-native-flash-message';
import { translate } from '@/lib/i18n';
import { positionFromGame } from '@/lib/positions/position';
import { savePosition } from '@/lib/positions/saved-positions';
import { PositionAction } from './position-controls';
import { positionError } from './position-errors';
import { dialogStyles, styles } from './position-styles';

/**
 * Name (and optionally annotate) the live board before saving it. The game is
 * never paused, replaced or left; the position lands in Positions → Saved.
 */
export function SavePositionDialog({ state, visible, onClose }: { state: GameState | null; visible: boolean; onClose: () => void }) {
  const [name, setName] = useState('');
  const [note, setNote] = useState('');
  const [error, setError] = useState('');
  const close = () => {
    setName('');
    setNote('');
    setError('');
    onClose();
  };
  const save = () => {
    if (!state)
      return;
    try {
      savePosition(name.trim() || translate('positions.game_snapshot'), positionFromGame(state), { note, source: 'game' });
      showMessage({ message: translate('positions.saved_notice'), type: 'success' });
      close();
    }
    catch (err) { setError(positionError(err)); }
  };
  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={dialogStyles.backdrop}>
        <Pressable accessibilityLabel={translate('game.controls.cancel')} onPress={close} style={dialogStyles.scrim} />
        <View testID="save-position-dialog" accessibilityViewIsModal style={dialogStyles.card}>
          <Text accessibilityRole="header" style={dialogStyles.title}>{translate('positions.save_from_game')}</Text>
          <Text style={styles.caption}>{translate('positions.save_from_game_hint')}</Text>
          <TextInput
            testID="save-position-name"
            accessibilityLabel={translate('positions.name')}
            placeholder={translate('positions.game_snapshot')}
            placeholderTextColor="#CBB8A7"
            value={name}
            maxLength={80}
            onChangeText={setName}
            style={styles.input}
          />
          <TextInput
            testID="save-position-note"
            accessibilityLabel={translate('positions.note')}
            placeholder={translate('positions.note')}
            placeholderTextColor="#CBB8A7"
            value={note}
            maxLength={500}
            multiline
            onChangeText={setNote}
            style={[styles.input, { minHeight: 72 }]}
          />
          {!!error && <Text accessibilityRole="alert" style={styles.error}>{error}</Text>}
          <View style={dialogStyles.actions}>
            <PositionAction label={translate('game.controls.cancel')} testID="save-position-cancel" onPress={close} />
            <PositionAction label={translate('positions.save')} symbol="bookmark" primary inline testID="save-position-confirm" onPress={save} />
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}
