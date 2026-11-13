import type { GameNote, GameNotePosition } from '@/lib/game/game-notes';
import type { MoveLogEntry } from '@/lib/game/move-log';
import type { GameState } from '@/lib/game/types';
import Feather from '@expo/vector-icons/Feather';
import { useMemo, useState } from 'react';
import { KeyboardAvoidingView, Modal, Platform, Pressable, ScrollView, StyleSheet, Text, TextInput, View } from 'react-native';

import { noteMomentLabel, notePipsLabel } from '@/features/game/game-notes-copy';
import { addNote, deleteNote, editNote, useGameNotes } from '@/features/game/game-notes-store';
import { GAME_PALETTE } from '@/features/game/game-palette';
import { PositionAction } from '@/features/positions/position-controls';
import { dialogStyles, styles as formStyles } from '@/features/positions/position-styles';
import { GAME_NOTE_MAX_LENGTH, notePositionFromState, noteTurnAtPly } from '@/lib/game/game-notes';
import { hapticLight } from '@/lib/haptics';
import { translate } from '@/lib/i18n';
import { interFont } from '@/lib/ui/fonts';

type Props = {
  visible: boolean;
  onClose: () => void;
  /** The board on screen: the live game, or the reviewed position. */
  state: GameState;
  /** Ply of the board on screen. */
  ply: number;
  /** Plies played in the live game; notes past it were undone. */
  liveIndex: number;
  moveLog: MoveLogEntry[];
  /** Review the board at a note's ply. */
  onShow: (ply: number) => void;
};

/**
 * Comment on the board and dice as the game goes. A new note is pinned to
 * the position on screen (live or reviewed) with a frozen copy of the board
 * and roll; the list below keeps every note of this game in move order.
 */
/** Draft, edit and list actions for the sheet; a new note pins `ply`, `turn` and `position`. */
function useNotesDraft({ ply, turn, position, onShow, onClose }: {
  ply: number;
  turn: number;
  position: GameNotePosition;
  onShow: (ply: number) => void;
  onClose: () => void;
}) {
  const [draft, setDraft] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const resetDraft = () => {
    setDraft('');
    setEditingId(null);
  };
  const close = () => {
    resetDraft();
    onClose();
  };
  const canSubmit = draft.trim().length > 0;
  return {
    draft,
    setDraft,
    editingId,
    canSubmit,
    resetDraft,
    close,
    submit: () => {
      if (!canSubmit) {
        return;
      }
      hapticLight();
      if (editingId) {
        editNote(editingId, draft);
      }
      else {
        addNote({ ply, turn, text: draft, position });
      }
      resetDraft();
    },
    startEdit: (note: GameNote) => {
      setEditingId(note.id);
      setDraft(note.text);
    },
    remove: (note: GameNote) => {
      hapticLight();
      if (editingId === note.id) {
        resetDraft();
      }
      deleteNote(note.id);
    },
    show: (note: GameNote) => {
      onShow(note.ply);
      close();
    },
  };
}

export function GameNotesSheet({ visible, onClose, state, ply, liveIndex, moveLog, onShow }: Props) {
  const notes = useGameNotes();
  const position = useMemo(() => notePositionFromState(state), [state]);
  const turn = useMemo(() => noteTurnAtPly(moveLog, ply, state), [moveLog, ply, state]);
  const { draft, setDraft, editingId, canSubmit, resetDraft, close, submit, startEdit, remove, show } = useNotesDraft({ ply, turn, position, onShow, onClose });

  return (
    <Modal visible={visible} transparent animationType="fade" onRequestClose={close}>
      <KeyboardAvoidingView behavior={Platform.OS === 'ios' ? 'padding' : undefined} style={dialogStyles.backdrop}>
        <Pressable accessibilityLabel={translate('game.notes.close')} onPress={close} style={dialogStyles.scrim} />
        <View testID="game-notes-sheet" accessibilityViewIsModal style={[dialogStyles.card, local.card]}>
          <View style={local.header}>
            <Text accessibilityRole="header" style={[dialogStyles.title, local.title]}>{translate('game.notes.title')}</Text>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={translate('game.notes.close')}
              testID="game-notes-close"
              hitSlop={8}
              onPress={close}
              style={({ pressed }) => [local.iconButton, pressed && local.pressed]}
            >
              <Feather name="x" size={20} color={GAME_PALETTE.text} />
            </Pressable>
          </View>
          <Text style={formStyles.caption}>{translate('game.notes.hint')}</Text>
          <View style={local.moment} testID="game-notes-moment">
            <Feather name="map-pin" size={14} color={GAME_PALETTE.accent} />
            <Text style={local.momentText} numberOfLines={1}>
              {editingId
                ? momentOf(notes.find(note => note.id === editingId))
                : `${noteMomentLabel(turn, position)} · ${notePipsLabel(position)}`}
            </Text>
          </View>
          <TextInput
            testID="game-notes-input"
            accessibilityLabel={translate('game.notes.placeholder')}
            placeholder={translate('game.notes.placeholder')}
            placeholderTextColor="#CBB8A7"
            value={draft}
            maxLength={GAME_NOTE_MAX_LENGTH}
            multiline
            onChangeText={setDraft}
            style={[formStyles.input, local.input]}
          />
          <View style={dialogStyles.actions}>
            {editingId
              ? <PositionAction label={translate('game.controls.cancel')} testID="game-notes-cancel-edit" onPress={resetDraft} />
              : null}
            <PositionAction
              label={editingId ? translate('game.notes.save') : translate('game.notes.add')}
              symbol={editingId ? 'check' : 'plus'}
              primary
              inline
              disabled={!canSubmit}
              testID="game-notes-submit"
              onPress={submit}
            />
          </View>
          <ScrollView style={local.list} contentContainerStyle={local.listContent} keyboardShouldPersistTaps="handled">
            {notes.length === 0
              ? <Text style={[formStyles.caption, local.empty]}>{translate('game.notes.empty')}</Text>
              : notes.map(note => (
                  <NoteRow
                    key={note.id}
                    note={note}
                    here={note.ply === ply}
                    canShow={note.ply <= liveIndex}
                    editing={note.id === editingId}
                    onShow={() => show(note)}
                    onEdit={() => startEdit(note)}
                    onDelete={() => remove(note)}
                  />
                ))}
          </ScrollView>
        </View>
      </KeyboardAvoidingView>
    </Modal>
  );
}

function momentOf(note: GameNote | undefined): string {
  return note ? `${noteMomentLabel(note.turn, note.position)} · ${notePipsLabel(note.position)}` : '';
}

function NoteRow({ note, here, canShow, editing, onShow, onEdit, onDelete }: {
  note: GameNote;
  here: boolean;
  canShow: boolean;
  editing: boolean;
  onShow: () => void;
  onEdit: () => void;
  onDelete: () => void;
}) {
  const moment = momentOf(note);
  return (
    <View testID={`game-note-${note.id}`} style={[local.row, here && local.rowHere, editing && local.rowEditing]}>
      <View style={local.rowBody} accessible accessibilityLabel={`${moment}. ${note.text}`}>
        <Text style={local.rowMeta} numberOfLines={2}>
          {here ? `${translate('game.notes.here')} · ${moment}` : moment}
        </Text>
        <Text style={local.rowText}>{note.text}</Text>
      </View>
      <View style={local.rowActions}>
        {canShow && !here
          ? <RowIcon name="eye" label={translate('game.notes.show')} testID="game-note-show" onPress={onShow} />
          : null}
        <RowIcon name="edit-2" label={translate('game.notes.edit')} testID="game-note-edit" onPress={onEdit} />
        <RowIcon name="trash-2" label={translate('game.notes.delete')} testID="game-note-delete" onPress={onDelete} />
      </View>
    </View>
  );
}

function RowIcon({ name, label, testID, onPress }: {
  name: React.ComponentProps<typeof Feather>['name'];
  label: string;
  testID: string;
  onPress: () => void;
}) {
  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={label}
      testID={testID}
      onPress={onPress}
      style={({ pressed }) => [local.iconButton, pressed && local.pressed]}
    >
      <Feather name={name} size={16} color={GAME_PALETTE.accent} />
    </Pressable>
  );
}

const local = StyleSheet.create({
  card: { maxHeight: '90%' },
  header: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  title: { flex: 1 },
  iconButton: { minWidth: 40, minHeight: 40, alignItems: 'center', justifyContent: 'center', borderRadius: 10 },
  pressed: { opacity: 0.7 },
  moment: { flexDirection: 'row', alignItems: 'center', gap: 6 },
  momentText: { ...interFont('semibold'), flex: 1, color: GAME_PALETTE.accent, fontSize: 13 },
  input: { minHeight: 72 },
  list: { flexGrow: 0, flexShrink: 1 },
  listContent: { gap: 8 },
  empty: { textAlign: 'center', paddingVertical: 8 },
  row: { flexDirection: 'row', alignItems: 'flex-start', gap: 4, padding: 10, borderRadius: 12, backgroundColor: GAME_PALETTE.surface, borderWidth: 1, borderColor: 'transparent' },
  rowHere: { borderColor: GAME_PALETTE.surfaceBorder },
  rowEditing: { borderColor: GAME_PALETTE.accent },
  rowBody: { flex: 1, gap: 4, paddingTop: 2 },
  rowMeta: { ...interFont('medium'), color: '#CBB8A7', fontSize: 12 },
  rowText: { ...interFont('regular'), color: GAME_PALETTE.text, fontSize: 15, lineHeight: 21 },
  rowActions: { flexDirection: 'row', alignItems: 'center' },
});
